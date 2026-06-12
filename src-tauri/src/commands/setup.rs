use crate::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct SetupItem {
    pub item_key: String,
    pub completed: bool,
    pub updated_at: String,
}

/// Load all completed item keys for a profile
#[tauri::command]
pub fn get_setup_progress(profile_id: i64) -> Result<Vec<SetupItem>, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT item_key, completed, updated_at
             FROM setup_progress
             WHERE profile_id = ?1
             ORDER BY item_key ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![profile_id], |row| {
            Ok(SetupItem {
                item_key: row.get(0)?,
                completed: row.get::<_, i64>(1)? != 0,
                updated_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(items)
}

/// Toggle a single checklist item — upsert with new completed state
#[tauri::command]
pub fn toggle_setup_item(
    profile_id: i64,
    item_key: String,
    completed: bool,
) -> Result<(), String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO setup_progress (profile_id, item_key, completed, updated_at)
         VALUES (?1, ?2, ?3, datetime('now'))
         ON CONFLICT(profile_id, item_key)
         DO UPDATE SET completed = excluded.completed,
                       updated_at = excluded.updated_at",
        params![profile_id, item_key, completed as i64],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Get completion count and total for a profile (for progress bar)
#[tauri::command]
pub fn get_setup_summary(profile_id: i64) -> Result<(i64, i64), String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let completed: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM setup_progress
             WHERE profile_id = ?1 AND completed = 1",
            params![profile_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM setup_progress
             WHERE profile_id = ?1",
            params![profile_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok((completed, total))
}