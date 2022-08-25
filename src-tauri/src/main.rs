#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{fs::create_dir_all, sync::Mutex};

use tauri::{generate_handler, Manager, State};
use typing_engine::{
    DisplayInfo, QueryRequest, TypingEngine, VocabularyEntry, VocabularyOrder,
    VocabularyQuantifier, VocabularySeparator,
};

use library::{DictionaryInfo, Library};

mod library;

#[tauri::command]
fn get_dictionary_infos(library: State<Mutex<Library>>) -> Vec<DictionaryInfo> {
    let mut locked_library = library.lock().unwrap();

    locked_library.reload_dictionaries();
    locked_library.dictionary_infos()
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let typing_engine = TypingEngine::new();
            app.manage(Mutex::new(typing_engine));

            // アプリケーション用のディレクトリが無かったら作る
            let app_dir = app.path_resolver().app_dir().unwrap();
            if !app_dir.exists() {
                create_dir_all(&app_dir).unwrap();
            }
            assert!(app_dir.exists());

            app.manage(Mutex::new(Library::new(app.path_resolver())));

            #[cfg(debug_assertions)]
            app.get_window("main").unwrap().open_devtools();

            Ok(())
        })
        .invoke_handler(generate_handler![get_dictionary_infos])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
