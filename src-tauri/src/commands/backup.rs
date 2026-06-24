use crate::{crypto, db};
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Serialize, Deserialize)]
pub struct BackupData {
    pub version: String,
    pub exported_at: String,
    pub profiles: Vec<ProfileBackup>,
    pub journal_entries: Vec<JournalBackup>,
    pub expenses: Vec<ExpenseBackup>,
    pub saved_checklists: Vec<ChecklistBackup>,
    pub checklist_items: Vec<ChecklistItemBackup>,
    pub emergency_contacts: Vec<ContactBackup>,
    pub exit_checklist_items: Vec<ExitItemBackup>,
}

#[derive(Serialize, Deserialize)]
pub struct ProfileBackup {
    pub id: i64,
    pub name: String,
    pub mode: String,
    pub salt: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct JournalBackup {
    pub id: i64,
    pub profile_id: i64,
    pub title: String,
    pub ciphertext: String,
    pub nonce: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct ExpenseBackup {
    pub id: i64,
    pub profile_id: i64,
    pub amount: f64,
    pub currency: String,
    pub category: String,
    pub description: String,
    pub date: String,
}

#[derive(Serialize, Deserialize)]
pub struct ChecklistBackup {
    pub id: i64,
    pub profile_id: i64,
    pub template_id: String,
    pub name: String,
    pub icon: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct ChecklistItemBackup {
    pub id: i64,
    pub checklist_id: i64,
    pub label: String,
    pub category: String,
    pub checked: bool,
    pub sort_order: i64,
}

#[derive(Serialize, Deserialize)]
pub struct ContactBackup {
    pub id: i64,
    pub profile_id: i64,
    pub label: String,
    pub ciphertext: String,
    pub nonce: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
pub struct ExitItemBackup {
    pub id: i64,
    pub profile_id: i64,
    pub category: String,
    pub label: String,
    pub completed: bool,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn export_backup(passphrase: String) -> Result<String, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    // ── Collect profiles ─────────────────────────────────────────────────────
    let profiles: Vec<ProfileBackup> = {
        let mut stmt = conn
            .prepare("SELECT id, name, mode, salt, created_at FROM profiles ORDER BY id ASC")
            .map_err(|e| e.to_string())?;
        let x = stmt.query_map([], |row| {
            Ok(ProfileBackup {
                id: row.get(0)?,
                name: row.get(1)?,
                mode: row.get(2)?,
                salt: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        x
    };

    // ── Collect journal entries ───────────────────────────────────────────────
    let journal_entries: Vec<JournalBackup> = {
        let mut stmt = conn
            .prepare("SELECT id, profile_id, title, ciphertext, nonce, created_at, updated_at FROM journal_entries ORDER BY id ASC")
            .map_err(|e| e.to_string())?;
        let x = stmt.query_map([], |row| {
            Ok(JournalBackup {
                id: row.get(0)?,
                profile_id: row.get(1)?,
                title: row.get(2)?,
                ciphertext: row.get(3)?,
                nonce: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        x
    };

    // ── Collect expenses ──────────────────────────────────────────────────────
    let expenses: Vec<ExpenseBackup> = {
        let mut stmt = conn
            .prepare("SELECT id, profile_id, amount, currency, category, description, date FROM expenses ORDER BY id ASC")
            .map_err(|e| e.to_string())?;
        let x = stmt.query_map([], |row| {
            Ok(ExpenseBackup {
                id: row.get(0)?,
                profile_id: row.get(1)?,
                amount: row.get(2)?,
                currency: row.get(3)?,
                category: row.get(4)?,
                description: row.get(5)?,
                date: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        x
    };

    // ── Collect saved checklists ──────────────────────────────────────────────
    let saved_checklists: Vec<ChecklistBackup> = {
        let mut stmt = conn
            .prepare("SELECT id, profile_id, template_id, name, icon, created_at FROM saved_checklists ORDER BY id ASC")
            .map_err(|e| e.to_string())?;
        let x = stmt.query_map([], |row| {
            Ok(ChecklistBackup {
                id: row.get(0)?,
                profile_id: row.get(1)?,
                template_id: row.get(2)?,
                name: row.get(3)?,
                icon: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        x
    };

    // ── Collect checklist items ───────────────────────────────────────────────
    let checklist_items: Vec<ChecklistItemBackup> = {
        let mut stmt = conn
            .prepare("SELECT id, checklist_id, label, category, checked, sort_order FROM saved_checklist_items ORDER BY id ASC")
            .map_err(|e| e.to_string())?;
        let x = stmt.query_map([], |row| {
            Ok(ChecklistItemBackup {
                id: row.get(0)?,
                checklist_id: row.get(1)?,
                label: row.get(2)?,
                category: row.get(3)?,
                checked: row.get::<_, i64>(4)? != 0,
                sort_order: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        x
    };

    // ── Collect emergency contacts ────────────────────────────────────────────
    let emergency_contacts: Vec<ContactBackup> = {
        let mut stmt = conn
            .prepare("SELECT id, profile_id, label, ciphertext, nonce, created_at FROM emergency_contacts ORDER BY id ASC")
            .map_err(|e| e.to_string())?;
        let x = stmt.query_map([], |row| {
            Ok(ContactBackup {
                id: row.get(0)?,
                profile_id: row.get(1)?,
                label: row.get(2)?,
                ciphertext: row.get(3)?,
                nonce: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        x
    };

    // ── Collect exit checklist items ──────────────────────────────────────────
    let exit_checklist_items: Vec<ExitItemBackup> = {
        let mut stmt = conn
            .prepare("SELECT id, profile_id, category, label, completed, sort_order, created_at, updated_at FROM exit_checklist_items ORDER BY id ASC")
            .map_err(|e| e.to_string())?;
        let x = stmt.query_map([], |row| {
            Ok(ExitItemBackup {
                id: row.get(0)?,
                profile_id: row.get(1)?,
                category: row.get(2)?,
                label: row.get(3)?,
                completed: row.get::<_, i64>(4)? != 0,
                sort_order: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        x
    };

    // ── Assemble backup payload ───────────────────────────────────────────────
    let backup = BackupData {
        version: "1.0.0".to_string(),
        exported_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs().to_string())
            .unwrap_or_else(|_| "0".to_string()),
        profiles,
        journal_entries,
        expenses,
        saved_checklists,
        checklist_items,
        emergency_contacts,
        exit_checklist_items,
    };

    let json = serde_json::to_string_pretty(&backup).map_err(|e| e.to_string())?;

    // ── Encrypt the JSON with the provided passphrase ─────────────────────────
    let salt = crypto::generate_salt();
    let key = crypto::derive_key(&passphrase, &salt)?;
    let (ciphertext, nonce) = crypto::encrypt(&json, &key)?;

    // ── Write to app data directory ───────────────────────────────────────────
    let mut backup_dir = dirs_next::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    backup_dir.push("nomad-sentinel");
    backup_dir.push("backups");
    fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string());
    let filename = format!("nomad_sentinel_backup_{}.nsb", timestamp);
    let backup_path = backup_dir.join(&filename);

    let envelope = serde_json::json!({
        "v": "1",
        "salt": salt,
        "nonce": nonce,
        "ct": ciphertext
    });
    fs::write(&backup_path, serde_json::to_string_pretty(&envelope).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;

    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn import_backup(file_path: String, passphrase: String) -> Result<String, String> {
    // ── Read and parse the envelope ───────────────────────────────────────────
    let raw = fs::read_to_string(&file_path)
        .map_err(|e| format!("Could not read backup file: {}", e))?;

    let envelope: serde_json::Value = serde_json::from_str(&raw)
        .map_err(|_| "Backup file is not valid JSON. It may be corrupted.".to_string())?;

    let salt = envelope["salt"].as_str()
        .ok_or("Backup file is missing salt field.")?;
    let nonce = envelope["nonce"].as_str()
        .ok_or("Backup file is missing nonce field.")?;
    let ciphertext = envelope["ct"].as_str()
        .ok_or("Backup file is missing ciphertext field.")?;

    // ── Decrypt ───────────────────────────────────────────────────────────────
    let key = crypto::derive_key(&passphrase, salt)?;
    let json = crypto::decrypt(ciphertext, nonce, &key)
        .map_err(|_| "Decryption failed. Check your passphrase and try again.".to_string())?;

    // ── Parse backup payload ──────────────────────────────────────────────────
    let backup: BackupData = serde_json::from_str(&json)
        .map_err(|e| format!("Backup data is malformed: {}", e))?;

    // ── Open DB and wipe + restore in a single transaction ───────────────────
    let path = db::get_db_path();
    let mut conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Wipe all user data — order respects foreign key constraints
    tx.execute_batch("
        DELETE FROM saved_checklist_items;
        DELETE FROM saved_checklists;
        DELETE FROM exit_checklist_items;
        DELETE FROM emergency_contacts;
        DELETE FROM expenses;
        DELETE FROM journal_entries;
        DELETE FROM setup_progress;
        DELETE FROM profiles;
    ").map_err(|e| e.to_string())?;

    // ── Restore profiles ──────────────────────────────────────────────────────
    for p in &backup.profiles {
        tx.execute(
            "INSERT INTO profiles (id, name, mode, salt, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![p.id, p.name, p.mode, p.salt, p.created_at],
        ).map_err(|e| format!("Failed to restore profile '{}': {}", p.name, e))?;
    }

    // ── Restore journal entries ───────────────────────────────────────────────
    for j in &backup.journal_entries {
        tx.execute(
            "INSERT INTO journal_entries (id, profile_id, title, ciphertext, nonce, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![j.id, j.profile_id, j.title, j.ciphertext, j.nonce, j.created_at, j.updated_at],
        ).map_err(|e| format!("Failed to restore journal entry '{}': {}", j.title, e))?;
    }

    // ── Restore expenses ──────────────────────────────────────────────────────
    for e in &backup.expenses {
        tx.execute(
            "INSERT INTO expenses (id, profile_id, amount, currency, category, description, date)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![e.id, e.profile_id, e.amount, e.currency, e.category, e.description, e.date],
        ).map_err(|e| format!("Failed to restore expense: {}", e))?;
    }

    // ── Restore saved checklists ──────────────────────────────────────────────
    for c in &backup.saved_checklists {
        tx.execute(
            "INSERT INTO saved_checklists (id, profile_id, template_id, name, icon, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![c.id, c.profile_id, c.template_id, c.name, c.icon, c.created_at],
        ).map_err(|e| format!("Failed to restore checklist '{}': {}", c.name, e))?;
    }

    // ── Restore checklist items ───────────────────────────────────────────────
    for i in &backup.checklist_items {
        tx.execute(
            "INSERT INTO saved_checklist_items (id, checklist_id, label, category, checked, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![i.id, i.checklist_id, i.label, i.category, i.checked as i64, i.sort_order],
        ).map_err(|e| format!("Failed to restore checklist item '{}': {}", i.label, e))?;
    }

    // ── Restore emergency contacts ────────────────────────────────────────────
    for c in &backup.emergency_contacts {
        tx.execute(
            "INSERT INTO emergency_contacts (id, profile_id, label, ciphertext, nonce, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![c.id, c.profile_id, c.label, c.ciphertext, c.nonce, c.created_at],
        ).map_err(|e| format!("Failed to restore contact '{}': {}", c.label, e))?;
    }

    // ── Restore exit checklist items ──────────────────────────────────────────
    for i in &backup.exit_checklist_items {
        tx.execute(
            "INSERT INTO exit_checklist_items (id, profile_id, category, label, completed, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![i.id, i.profile_id, i.category, i.label, i.completed as i64, i.sort_order, i.created_at, i.updated_at],
        ).map_err(|e| format!("Failed to restore exit item '{}': {}", i.label, e))?;
    }

    tx.commit().map_err(|e| format!("Transaction failed: {}", e))?;

    Ok(format!(
        "Restore complete. {} profiles, {} journal entries, {} expenses restored.",
        backup.profiles.len(),
        backup.journal_entries.len(),
        backup.expenses.len()
    ))
}
