# Message & File Encryptor

Encrypt and decrypt text messages and files using AES-256-GCM — the same encryption standard used by the CyberLifeCoach.pro web tool. Ciphertext produced here can be decrypted on the website, and vice versa.

---

## Text Encryption

1. Select the **Text** tab
2. Choose **Encrypt** or **Decrypt**
3. Enter your message (to encrypt) or the JSON envelope (to decrypt)
4. Enter your passphrase — or click **Generate** to create a strong one
5. Click **Process**
6. Copy the result to share or store it

The encrypted output is a JSON envelope you can send via any channel — email, chat, SMS. The recipient needs the same passphrase and this tool (or the web version) to decrypt it.

---

## File Encryption

1. Select the **File** tab
2. Choose **Encrypt** or **Decrypt**
3. Drag and drop a file onto the drop zone, or click to browse
4. Enter your passphrase
5. Click **Process File**
6. Click **Download Result** to save the output

Encrypted files are saved with a `.enc.json` extension. To decrypt, load the `.enc.json` file and enter the original passphrase.

---

## Passphrase Generator

Click **Generate** next to the passphrase field to create a strong random passphrase. The generator uses a cryptographically secure random source — the same one used for encryption keys.

Write down generated passphrases and store them securely. There is no recovery option if a passphrase is lost.

---

## How It Works

- **Algorithm:** AES-256-GCM
- **Key derivation:** PBKDF2-SHA-256, 150,000 iterations
- **Salt and IV:** Randomly generated for every encryption operation
- **Output format:** Versioned JSON envelope `{v, a, i, s, iv, ct}`

The envelope format is identical to the CyberLifeCoach.pro web tool, making ciphertext portable between the desktop app and the website.

All cryptographic operations run locally using the Web Crypto API. Nothing is sent over the network.

---

## Security Notes

- Choose a strong, unique passphrase. Longer passphrases are harder to brute-force.
- The passphrase is never stored. If you lose it, the ciphertext cannot be recovered.
- For maximum security, share the passphrase through a different channel than the ciphertext.
- Large files are processed in memory. Avoid encrypting files larger than a few hundred MB.