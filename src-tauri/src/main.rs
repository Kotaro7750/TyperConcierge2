#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{fs::create_dir_all, num::NonZeroUsize, sync::Mutex};

use serde::{Deserialize, Serialize};
use tauri::{generate_handler, Manager, State};
use typing_engine::{
    DisplayInfo, QueryRequest, TypingEngine, VocabularyEntry, VocabularyOrder,
    VocabularyQuantifier, VocabularySeparator,
};

use library::{CategorizedDictionaryInfos, DictionaryType, Library};

mod library;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QueryRequestFromUI {
    dictionary_type: DictionaryType,
    used_dictionary_names: Vec<String>,
    key_stroke_count_threshold: Option<NonZeroUsize>,
}

#[tauri::command]
fn get_dictionary_infos(library: State<Mutex<Library>>) -> CategorizedDictionaryInfos {
    let mut locked_library = library.lock().unwrap();

    locked_library.reload_dictionaries();
    locked_library.dictionary_infos()
}

#[tauri::command]
fn confirm_query(
    query_request_from_ui: QueryRequestFromUI,
    library: State<Mutex<Library>>,
    typing_engine: State<Mutex<TypingEngine>>,
) {
    let locked_library = library.lock().unwrap();

    let vocabulary_entries = locked_library.vocabulary_entries_of_request(
        query_request_from_ui.dictionary_type,
        &query_request_from_ui.used_dictionary_names,
    );

    let query_request = QueryRequest::new(
        &vocabulary_entries,
        VocabularyQuantifier::KeyStroke(query_request_from_ui.key_stroke_count_threshold.unwrap()),
        VocabularySeparator::WhiteSpace,
        VocabularyOrder::Random,
    );

    typing_engine.lock().unwrap().init(query_request);

    println!("{:?}", typing_engine.lock().unwrap());
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
        .invoke_handler(generate_handler![get_dictionary_infos, confirm_query])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
