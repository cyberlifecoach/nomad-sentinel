use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Phrase {
    pub id: String,
    pub scenario: String,
    pub phrase: String,
    pub translation: String,
    pub pronunciation: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Language {
    pub code: String,
    pub name: String,
    pub flag: String,
    pub phrases: Vec<Phrase>,
}

#[derive(Debug, Serialize, Deserialize)]
struct PhrasebookFile {
    version: String,
    languages: Vec<Language>,
}

#[tauri::command]
pub fn get_languages(app: AppHandle) -> Result<Vec<Language>, String> {
    let resource_path = app
        .path()
        .resolve(
            "data/phrasebook/index.json",
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|e| e.to_string())?;

    let content = std::fs::read_to_string(&resource_path)
        .map_err(|e| format!("Failed to read phrasebook file: {}", e))?;

    let parsed: PhrasebookFile =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse phrasebook: {}", e))?;

    Ok(parsed.languages)
}

#[tauri::command]
pub fn get_language(app: AppHandle, code: String) -> Result<Language, String> {
    let languages = get_languages(app)?;

    languages
        .into_iter()
        .find(|l| l.code == code)
        .ok_or_else(|| format!("Language '{}' not found", code))
}

#[tauri::command]
pub fn get_phrases_by_scenario(
    app: AppHandle,
    language_code: String,
    scenario: String,
) -> Result<Vec<Phrase>, String> {
    let language = get_language(app, language_code)?;

    let filtered: Vec<Phrase> = language
        .phrases
        .into_iter()
        .filter(|p| p.scenario == scenario)
        .collect();

    Ok(filtered)
}