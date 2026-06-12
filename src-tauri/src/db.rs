use rusqlite::{Connection, Result};
use std::path::PathBuf;

pub fn get_db_path() -> PathBuf {
    let mut path = dirs_next::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."));
    path.push("nomad-sentinel");
    path.push("nomad_sentinel.db");
    path
}

pub fn init_db(path: &PathBuf) -> Result<Connection> {
    // Create the directory if it doesn't exist
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let conn = Connection::open(path)?;

    conn.execute_batch("
        PRAGMA journal_mode=WAL;
        PRAGMA foreign_keys=ON;

        CREATE TABLE IF NOT EXISTS profiles (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL UNIQUE,
            mode        TEXT NOT NULL DEFAULT 'nomad',
            salt        TEXT NOT NULL,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS journal_entries (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id  INTEGER NOT NULL REFERENCES profiles(id),
            title       TEXT NOT NULL,
            ciphertext  TEXT NOT NULL,
            nonce       TEXT NOT NULL,
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );
    ")?;

    Ok(conn)
}