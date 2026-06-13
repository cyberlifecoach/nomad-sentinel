use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

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