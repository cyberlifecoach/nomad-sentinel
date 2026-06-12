use crate::{crypto, db};
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct JournalEntry {
    pub id: i64,
    pub title: String,
    pub body: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct JournalEntryMeta {
    pub id: i64,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Create a profile if it doesn't exist, return its id and salt
#[tauri::command]
pub fn ensure_profile(name: String) -> Result<(i64, String), String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    // Check if profile exists
    let existing: rusqlite::Result<(i64, String)> = conn.query_row(
        "SELECT id, salt FROM profiles WHERE name = ?1",
        params![name],
        |row| Ok((row.get(0)?, row.get(1)?)),
    );

    match existing {
        Ok((id, salt)) => Ok((id, salt)),
        Err(_) => {
            // Create new profile with a fresh salt
            let salt = crypto::generate_salt();
            conn.execute(
                "INSERT INTO profiles (name, mode, salt) VALUES (?1, 'nomad', ?2)",
                params![name, salt],
            )
            .map_err(|e| e.to_string())?;
            let id = conn.last_insert_rowid();
            Ok((id, salt))
        }
    }
}

/// Save a new journal entry (encrypted)
#[tauri::command]
pub fn create_journal_entry(
    profile_id: i64,
    passphrase: String,
    salt: String,
    title: String,
    body: String,
) -> Result<i64, String> {
    let key = crypto::derive_key(&passphrase, &salt)?;
    let (ciphertext, nonce) = crypto::encrypt(&body, &key)?;

    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO journal_entries (profile_id, title, ciphertext, nonce)
         VALUES (?1, ?2, ?3, ?4)",
        params![profile_id, title, ciphertext, nonce],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

/// List all entries for a profile (titles only, no decryption needed)
#[tauri::command]
pub fn list_journal_entries(profile_id: i64) -> Result<Vec<JournalEntryMeta>, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, title, created_at, updated_at
             FROM journal_entries
             WHERE profile_id = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let entries = stmt
        .query_map(params![profile_id], |row| {
            Ok(JournalEntryMeta {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(entries)
}

/// Read and decrypt a single entry
#[tauri::command]
pub fn get_journal_entry(
    entry_id: i64,
    passphrase: String,
    salt: String,
) -> Result<JournalEntry, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let (id, title, ciphertext, nonce, created_at, updated_at): (
        i64, String, String, String, String, String,
    ) = conn
        .query_row(
            "SELECT id, title, ciphertext, nonce, created_at, updated_at
             FROM journal_entries WHERE id = ?1",
            params![entry_id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                ))
            },
        )
        .map_err(|e| e.to_string())?;

    let key = crypto::derive_key(&passphrase, &salt)?;
    let body = crypto::decrypt(&ciphertext, &nonce, &key)?;

    Ok(JournalEntry {
        id,
        title,
        body,
        created_at,
        updated_at,
    })
}

/// Delete an entry by id
#[tauri::command]
pub fn delete_journal_entry(entry_id: i64) -> Result<(), String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM journal_entries WHERE id = ?1",
        params![entry_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}