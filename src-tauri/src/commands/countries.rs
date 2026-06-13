use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CountryItem {
    pub id: String,
    pub category: String,
    pub note: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Country {
    pub code: String,
    pub name: String,
    pub flag: String,
    pub risk_level: String,
    pub items: Vec<CountryItem>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CountriesFile {
    version: String,
    countries: Vec<Country>,
}

#[tauri::command]
pub fn get_countries(app: AppHandle) -> Result<Vec<Country>, String> {
    let resource_path = app
        .path()
        .resolve(
            "data/countries/index.json",
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|e| e.to_string())?;

    let content = std::fs::read_to_string(&resource_path)
        .map_err(|e| format!("Failed to read countries file: {}", e))?;

    let parsed: CountriesFile =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse countries: {}", e))?;

    Ok(parsed.countries)
}

#[tauri::command]
pub fn get_country(app: AppHandle, code: String) -> Result<Country, String> {
    let countries = get_countries(app)?;

    countries
        .into_iter()
        .find(|c| c.code == code)
        .ok_or_else(|| format!("Country '{}' not found", code))
}