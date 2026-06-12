pub mod db;
pub mod crypto;
pub mod commands;

use commands::journal::{
    ensure_profile,
    create_journal_entry,
    list_journal_entries,
    get_journal_entry,
    delete_journal_entry,
};

#[tauri::command]
fn get_app_version() -> String {
    String::from("0.2.0")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            ensure_profile,
            create_journal_entry,
            list_journal_entries,
            get_journal_entry,
            delete_journal_entry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}