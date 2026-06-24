use crate::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Profile {
    pub id: i64,
    pub name: String,
    pub mode: String,
    pub created_at: String,
}

#[tauri::command]
pub fn list_profiles() -> Result<Vec<Profile>, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, mode, created_at
             FROM profiles
             ORDER BY created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map([], |row| {
            Ok(Profile {
                id: row.get(0)?,
                name: row.get(1)?,
                mode: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(items)
}

#[tauri::command]
pub fn create_profile(name: String, mode: String) -> Result<i64, String> {
    // Validate mode
    let valid_modes = ["nomad", "journalist", "traveler", "all"];
    if !valid_modes.contains(&mode.as_str()) {
        return Err(format!("Invalid mode '{}'. Must be one of: nomad, journalist, traveler, all", mode));
    }

    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    // Generate a random salt for this profile
    let salt = crate::crypto::generate_salt();

    conn.execute(
        "INSERT INTO profiles (name, mode, salt) VALUES (?1, ?2, ?3)",
        params![name.trim(), mode, salt],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            format!("A profile named '{}' already exists.", name.trim())
        } else {
            e.to_string()
        }
    })?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn update_profile_mode(profile_id: i64, mode: String) -> Result<(), String> {
    let valid_modes = ["nomad", "journalist", "traveler", "all"];
    if !valid_modes.contains(&mode.as_str()) {
        return Err(format!("Invalid mode '{}'.", mode));
    }

    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE profiles SET mode = ?1 WHERE id = ?2",
        params![mode, profile_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn update_profile_name(profile_id: i64, name: String) -> Result<(), String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE profiles SET name = ?1 WHERE id = ?2",
        params![name.trim(), profile_id],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            format!("A profile named '{}' already exists.", name.trim())
        } else {
            e.to_string()
        }
    })?;

    Ok(())
}

#[tauri::command]
pub fn delete_profile(profile_id: i64) -> Result<(), String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    // Guard: never delete the last profile
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM profiles", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if count <= 1 {
        return Err("Cannot delete the last profile.".to_string());
    }

    conn.execute(
        "DELETE FROM profiles WHERE id = ?1",
        params![profile_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}