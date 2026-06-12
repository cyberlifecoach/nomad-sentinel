use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use argon2::{Argon2, PasswordHasher, password_hash::SaltString};
use base64::{Engine as _, engine::general_purpose::STANDARD as B64};
use rand::{RngCore, rngs::OsRng};

/// Generate a random 16-byte salt, returned as a base64 string for storage
pub fn generate_salt() -> String {
    let mut bytes = [0u8; 16];
    OsRng.fill_bytes(&mut bytes);
    B64.encode(bytes)
}

/// Derive a 32-byte AES key from a passphrase + stored salt string
pub fn derive_key(passphrase: &str, salt_b64: &str) -> Result<[u8; 32], String> {
    let salt_bytes = B64.decode(salt_b64)
        .map_err(|e| format!("Salt decode error: {}", e))?;

    let salt_string = SaltString::encode_b64(&salt_bytes)
        .map_err(|e| format!("Salt encode error: {}", e))?;

    let argon2 = Argon2::default();

    let hash = argon2
        .hash_password(passphrase.as_bytes(), &salt_string)
        .map_err(|e| format!("Argon2 error: {}", e))?;

    let hash_bytes = hash.hash
        .ok_or("No hash output")?;

    let mut key = [0u8; 32];
    key.copy_from_slice(&hash_bytes.as_bytes()[..32]);
    Ok(key)
}

/// Encrypt plaintext with AES-256-GCM. Returns (ciphertext_b64, nonce_b64)
pub fn encrypt(plaintext: &str, key: &[u8; 32]) -> Result<(String, String), String> {
    let cipher = Aes256Gcm::new(key.into());

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encrypt error: {}", e))?;

    Ok((B64.encode(ciphertext), B64.encode(nonce_bytes)))
}

/// Decrypt ciphertext with AES-256-GCM. Returns plaintext string
pub fn decrypt(ciphertext_b64: &str, nonce_b64: &str, key: &[u8; 32]) -> Result<String, String> {
    let cipher = Aes256Gcm::new(key.into());

    let ciphertext = B64.decode(ciphertext_b64)
        .map_err(|e| format!("Ciphertext decode error: {}", e))?;

    let nonce_bytes = B64.decode(nonce_b64)
        .map_err(|e| format!("Nonce decode error: {}", e))?;

    let nonce = Nonce::from_slice(&nonce_bytes);

    let plaintext_bytes = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| "Decryption failed — wrong passphrase or corrupted data".to_string())?;

    String::from_utf8(plaintext_bytes)
        .map_err(|e| format!("UTF-8 decode error: {}", e))
}