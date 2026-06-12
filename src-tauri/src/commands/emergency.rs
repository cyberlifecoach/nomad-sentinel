use crate::{crypto, db};
use rusqlite::params;
use serde::{Deserialize, Serialize};

// ── Contact structs ──────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct ContactMeta {
    pub id: i64,
    pub label: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct ContactDetail {
    pub id: i64,
    pub label: String,
    pub body: String,
    pub created_at: String,
}

// ── Exit checklist structs ───────────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct ChecklistItem {
    pub id: i64,
    pub category: String,
    pub label: String,
    pub completed: bool,
    pub sort_order: i64,
}

// ── Contact commands ─────────────────────────────────────────────────────────

#[tauri::command]
pub fn create_contact(
    profile_id: i64,
    passphrase: String,
    salt: String,
    label: String,
    body: String,
) -> Result<i64, String> {
    let key = crypto::derive_key(&passphrase, &salt)?;
    let (ciphertext, nonce) = crypto::encrypt(&body, &key)?;

    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO emergency_contacts (profile_id, label, ciphertext, nonce)
         VALUES (?1, ?2, ?3, ?4)",
        params![profile_id, label, ciphertext, nonce],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn list_contacts(profile_id: i64) -> Result<Vec<ContactMeta>, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, label, created_at
             FROM emergency_contacts
             WHERE profile_id = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![profile_id], |row| {
            Ok(ContactMeta {
                id: row.get(0)?,
                label: row.get(1)?,
                created_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(items)
}

#[tauri::command]
pub fn get_contact(
    contact_id: i64,
    passphrase: String,
    salt: String,
) -> Result<ContactDetail, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let (id, label, ciphertext, nonce, created_at): (i64, String, String, String, String) = conn
        .query_row(
            "SELECT id, label, ciphertext, nonce, created_at
             FROM emergency_contacts WHERE id = ?1",
            params![contact_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
        )
        .map_err(|e| e.to_string())?;

    let key = crypto::derive_key(&passphrase, &salt)?;
    let body = crypto::decrypt(&ciphertext, &nonce, &key)?;

    Ok(ContactDetail { id, label, body, created_at })
}

#[tauri::command]
pub fn delete_contact(contact_id: i64) -> Result<(), String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM emergency_contacts WHERE id = ?1",
        params![contact_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// ── Exit checklist commands ──────────────────────────────────────────────────

#[tauri::command]
pub fn create_checklist_item(
    profile_id: i64,
    category: String,
    label: String,
) -> Result<i64, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let sort_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), 0) + 1
             FROM exit_checklist_items WHERE profile_id = ?1",
            params![profile_id],
            |row| row.get(0),
        )
        .unwrap_or(1);

    conn.execute(
        "INSERT INTO exit_checklist_items (profile_id, category, label, sort_order)
         VALUES (?1, ?2, ?3, ?4)",
        params![profile_id, category, label, sort_order],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn list_checklist_items(profile_id: i64) -> Result<Vec<ChecklistItem>, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, category, label, completed, sort_order
             FROM exit_checklist_items
             WHERE profile_id = ?1
             ORDER BY category ASC, sort_order ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![profile_id], |row| {
            Ok(ChecklistItem {
                id: row.get(0)?,
                category: row.get(1)?,
                label: row.get(2)?,
                completed: row.get::<_, i64>(3)? != 0,
                sort_order: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(items)
}

#[tauri::command]
pub fn toggle_checklist_item(item_id: i64, completed: bool) -> Result<(), String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE exit_checklist_items
         SET completed = ?1, updated_at = datetime('now')
         WHERE id = ?2",
        params![completed as i64, item_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_checklist_item(item_id: i64) -> Result<(), String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM exit_checklist_items WHERE id = ?1",
        params![item_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn reset_checklist(profile_id: i64) -> Result<(), String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE exit_checklist_items
         SET completed = 0, updated_at = datetime('now')
         WHERE profile_id = ?1",
        params![profile_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}