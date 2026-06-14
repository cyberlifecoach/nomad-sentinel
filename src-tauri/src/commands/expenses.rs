use crate::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Expense {
    pub id: i64,
    pub profile_id: i64,
    pub amount: f64,
    pub currency: String,
    pub category: String,
    pub description: String,
    pub date: String,
}

#[tauri::command]
pub fn add_expense(
    profile_id: i64,
    amount: f64,
    currency: String,
    category: String,
    description: String,
    date: String,
) -> Result<i64, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO expenses (profile_id, amount, currency, category, description, date)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![profile_id, amount, currency, category, description, date],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn list_expenses(profile_id: i64) -> Result<Vec<Expense>, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, profile_id, amount, currency, category, description, date
             FROM expenses WHERE profile_id = ?1 ORDER BY date DESC",
        )
        .map_err(|e| e.to_string())?;

    let expenses = stmt
        .query_map(params![profile_id], |row| {
            Ok(Expense {
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

    Ok(expenses)
}

#[tauri::command]
pub fn delete_expense(id: i64) -> Result<(), String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM expenses WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_expense_summary(profile_id: i64) -> Result<Vec<(String, f64)>, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT category, SUM(amount) as total
             FROM expenses WHERE profile_id = ?1
             GROUP BY category ORDER BY total DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![profile_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}
#[tauri::command]
pub fn export_expenses_csv(_app: tauri::AppHandle, profile_id: i64) -> Result<String, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT date, category, description, amount, currency
             FROM expenses WHERE profile_id = ?1 ORDER BY date DESC",
        )
        .map_err(|e| e.to_string())?;

    let mut csv = String::from("Date,Category,Description,Amount,Currency\n");

    let rows = stmt
        .query_map(params![profile_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, f64>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for row in rows {
        let (date, category, description, amount, currency) = row.map_err(|e| e.to_string())?;
        csv.push_str(&format!(
            "{},{},\"{}\",{:.2},{}\n",
            date, category, description, amount, currency
        ));
    }

    // Write to app data directory
    let mut out_path = dirs_next::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    out_path.push("nomad-sentinel");
    out_path.push("expenses_export.csv");

    std::fs::write(&out_path, &csv).map_err(|e| e.to_string())?;

    Ok(out_path.to_string_lossy().to_string())
}