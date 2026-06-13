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

use commands::setup::{
    get_setup_progress,
    toggle_setup_item,
    get_setup_summary,
};

use commands::emergency::{
    create_contact,
    list_contacts,
    get_contact,
    delete_contact,
    create_checklist_item,
    list_checklist_items,
    toggle_checklist_item,
    delete_checklist_item,
    reset_checklist,
};
use commands::scrubber::{
    scan_exif,
    scrub_file,
};

use commands::checklists::{
    get_checklist_templates,
    load_checklist_template,
};

use commands::countries::{
    get_countries,
    get_country,
};

use commands::phrasebook::{
    get_languages,
    get_language,
    get_phrases_by_scenario,
};

#[tauri::command]
fn get_app_version() -> String {
    String::from("0.4.0")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            ensure_profile,
            create_journal_entry,
            list_journal_entries,
            get_journal_entry,
            delete_journal_entry,
            get_setup_progress,
            toggle_setup_item,
            get_setup_summary,
            create_contact,
            list_contacts,
            get_contact,
            delete_contact,
            create_checklist_item,
            list_checklist_items,
            toggle_checklist_item,
            delete_checklist_item,
            reset_checklist,
            scan_exif,
            scrub_file,
            get_checklist_templates,
            load_checklist_template,
            get_countries,
            get_country,
            get_languages,
            get_language,
            get_phrases_by_scenario,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}