use crate::db;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

// ── Template structs ─────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChecklistItem {
    pub id: String,
    pub label: String,
    pub category: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChecklistTemplate {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub items: Vec<ChecklistItem>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TemplatesFile {
    version: String,
    templates: Vec<ChecklistTemplate>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserChecklistItem {
    pub id: String,
    pub label: String,
    pub category: String,
    pub checked: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserChecklist {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub items: Vec<UserChecklistItem>,
}

// ── Saved checklist structs ─────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct SavedChecklistMeta {
    pub id: i64,
    pub template_id: String,
    pub name: String,
    pub icon: String,
    pub created_at: String,
    pub total_items: i64,
    pub checked_items: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedChecklistItem {
    pub id: i64,
    pub label: String,
    pub category: String,
    pub checked: bool,
    pub sort_order: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SavedChecklist {
    pub id: i64,
    pub template_id: String,
    pub name: String,
    pub icon: String,
    pub created_at: String,
    pub items: Vec<SavedChecklistItem>,
}

// ── Template commands ────────────────────────────────────────────────────

#[tauri::command]
pub fn get_checklist_templates(app: AppHandle) -> Result<Vec<ChecklistTemplate>, String> {
    let resource_path = app
        .path()
        .resolve("data/checklists/templates.json", tauri::path::BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;

    let content = std::fs::read_to_string(&resource_path)
        .map_err(|e| format!("Failed to read templates file: {}", e))?;

    let parsed: TemplatesFile =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse templates: {}", e))?;

    Ok(parsed.templates)
}

#[tauri::command]
pub fn load_checklist_template(
    app: AppHandle,
    template_id: String,
) -> Result<UserChecklist, String> {
    let templates = get_checklist_templates(app)?;

    let template = templates
        .iter()
        .find(|t| t.id == template_id)
        .ok_or_else(|| format!("Template '{}' not found", template_id))?;

    let user_items: Vec<UserChecklistItem> = template
        .items
        .iter()
        .map(|item| UserChecklistItem {
            id: item.id.clone(),
            label: item.label.clone(),
            category: item.category.clone(),
            checked: false,
        })
        .collect();

    Ok(UserChecklist {
        id: template.id.clone(),
        name: template.name.clone(),
        icon: template.icon.clone(),
        items: user_items,
    })
}

// ── Saved checklist commands ─────────────────────────────────────────────

#[tauri::command]
pub fn save_packing_checklist(
    app: AppHandle,
    profile_id: i64,
    template_id: String,
) -> Result<SavedChecklist, String> {
    let template_checklist = load_checklist_template(app, template_id.clone())?;

    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO saved_checklists (profile_id, template_id, name, icon)
         VALUES (?1, ?2, ?3, ?4)",
        params![profile_id, template_id, template_checklist.name, template_checklist.icon],
    )
    .map_err(|e| e.to_string())?;

    let checklist_id = conn.last_insert_rowid();

    let created_at: String = conn
        .query_row(
            "SELECT created_at FROM saved_checklists WHERE id = ?1",
            params![checklist_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let mut items = Vec::with_capacity(template_checklist.items.len());

    for (i, item) in template_checklist.items.iter().enumerate() {
        conn.execute(
            "INSERT INTO saved_checklist_items (checklist_id, label, category, sort_order)
             VALUES (?1, ?2, ?3, ?4)",
            params![checklist_id, item.label, item.category, i as i64],
        )
        .map_err(|e| e.to_string())?;

        items.push(SavedChecklistItem {
            id: conn.last_insert_rowid(),
            label: item.label.clone(),
            category: item.category.clone(),
            checked: false,
            sort_order: i as i64,
        });
    }

    Ok(SavedChecklist {
        id: checklist_id,
        template_id,
        name: template_checklist.name,
        icon: template_checklist.icon,
        created_at,
        items,
    })
}

#[tauri::command]
pub fn list_saved_packing_checklists(profile_id: i64) -> Result<Vec<SavedChecklistMeta>, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT
                 c.id, c.template_id, c.name, c.icon, c.created_at,
                 COUNT(i.id) AS total_items,
                 COALESCE(SUM(i.checked), 0) AS checked_items
             FROM saved_checklists c
             LEFT JOIN saved_checklist_items i ON i.checklist_id = c.id
             WHERE c.profile_id = ?1
             GROUP BY c.id
             ORDER BY c.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![profile_id], |row| {
            Ok(SavedChecklistMeta {
                id: row.get(0)?,
                template_id: row.get(1)?,
                name: row.get(2)?,
                icon: row.get(3)?,
                created_at: row.get(4)?,
                total_items: row.get(5)?,
                checked_items: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(items)
}

#[tauri::command]
pub fn get_saved_packing_checklist(checklist_id: i64) -> Result<SavedChecklist, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let (id, template_id, name, icon, created_at): (i64, String, String, String, String) = conn
        .query_row(
            "SELECT id, template_id, name, icon, created_at
             FROM saved_checklists WHERE id = ?1",
            params![checklist_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
        )
        .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, label, category, checked, sort_order
             FROM saved_checklist_items
             WHERE checklist_id = ?1
             ORDER BY category ASC, sort_order ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(params![checklist_id], |row| {
            Ok(SavedChecklistItem {
                id: row.get(0)?,
                label: row.get(1)?,
                category: row.get(2)?,
                checked: row.get::<_, i64>(3)? != 0,
                sort_order: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(SavedChecklist { id, template_id, name, icon, created_at, items })
}

#[tauri::command]
pub fn toggle_packing_checklist_item(item_id: i64, checked: bool) -> Result<(), String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE saved_checklist_items SET checked = ?1 WHERE id = ?2",
        params![checked as i64, item_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn add_packing_checklist_item(
    checklist_id: i64,
    label: String,
    category: String,
) -> Result<i64, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let sort_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), 0) + 1
             FROM saved_checklist_items WHERE checklist_id = ?1",
            params![checklist_id],
            |row| row.get(0),
        )
        .unwrap_or(1);

    conn.execute(
        "INSERT INTO saved_checklist_items (checklist_id, label, category, sort_order)
         VALUES (?1, ?2, ?3, ?4)",
        params![checklist_id, label, category, sort_order],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn delete_packing_checklist_item(item_id: i64) -> Result<(), String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM saved_checklist_items WHERE id = ?1",
        params![item_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_saved_packing_checklist(checklist_id: i64) -> Result<(), String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM saved_checklists WHERE id = ?1",
        params![checklist_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn export_packing_checklist_csv(checklist_id: i64) -> Result<String, String> {
    let path = db::get_db_path();
    let conn = db::init_db(&path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT label, category, checked
             FROM saved_checklist_items
             WHERE checklist_id = ?1
             ORDER BY category ASC, sort_order ASC",
        )
        .map_err(|e| e.to_string())?;

    let mut csv = String::from("Item,Category,Packed\n");

    let rows = stmt
        .query_map(params![checklist_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for row in rows {
        let (label, category, checked) = row.map_err(|e| e.to_string())?;
        let packed = if checked != 0 { "Yes" } else { "No" };
        csv.push_str(&format!("\"{}\",{},{}\n", label, category, packed));
    }

    let mut out_path = dirs_next::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    out_path.push("nomad-sentinel");
    out_path.push(format!("packing_checklist_{}_export.csv", checklist_id));

    std::fs::write(&out_path, &csv).map_err(|e| e.to_string())?;

    Ok(out_path.to_string_lossy().to_string())
}