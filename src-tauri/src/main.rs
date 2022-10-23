#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{fs::create_dir_all, num::NonZeroUsize, sync::Mutex};

use serde::{Deserialize, Serialize};
use tauri::{generate_handler, Manager, State};
use typing_engine::{
    LapRequest, QueryRequest, TypingEngine, TypingEngineError, VocabularyOrder,
    VocabularyQuantifier, VocabularySeparator,
};

use library::{CategorizedDictionaryInfos, DictionaryOrigin, DictionaryType, Library};

mod display_info;
mod library;
mod result;

use crate::display_info::DisplayInformation;
use crate::result::TypingResult;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ToUIError {}

impl From<TypingEngineError> for ToUIError {
    fn from(_: TypingEngineError) -> Self {
        Self {}
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QueryRequestFromUI {
    dictionary_type: DictionaryType,
    used_dictionaries: Vec<(DictionaryOrigin, String)>,
    key_stroke_count_threshold: Option<NonZeroUsize>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct KeyStrokeInfo {
    key: String,
    elapsed_time: usize,
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
        &query_request_from_ui.used_dictionaries,
    );

    let query_request = QueryRequest::new(
        &vocabulary_entries,
        VocabularyQuantifier::KeyStroke(query_request_from_ui.key_stroke_count_threshold.unwrap()),
        VocabularySeparator::WhiteSpace,
        VocabularyOrder::InOrder,
    );

    typing_engine.lock().unwrap().init(query_request);
}

#[tauri::command]
fn start_game(typing_engine: State<Mutex<TypingEngine>>) -> DisplayInformation {
    let mut locked_typing_engine = typing_engine.lock().unwrap();
    locked_typing_engine.start().unwrap();

    locked_typing_engine
        .construct_display_info(LapRequest::IdealKeyStroke(NonZeroUsize::new(50).unwrap()))
        .unwrap()
        .into()
}

#[tauri::command]
fn stroke_key(
    key_stroke_info: KeyStrokeInfo,
    typing_engine: State<Mutex<TypingEngine>>,
) -> Result<(bool, DisplayInformation), ToUIError> {
    assert_eq!(key_stroke_info.key.chars().count(), 1);
    let key_stroke_char = key_stroke_info.key.chars().next().unwrap();

    let mut locked_typing_engine = typing_engine.lock().unwrap();
    let finished = locked_typing_engine.stroke_key(key_stroke_char.try_into().unwrap())?;

    Ok((
        finished,
        locked_typing_engine
            .construct_display_info(LapRequest::IdealKeyStroke(NonZeroUsize::new(50).unwrap()))
            .unwrap()
            .into(),
    ))
}

#[tauri::command]
fn get_result(typing_engine: State<Mutex<TypingEngine>>) -> Result<TypingResult, ToUIError> {
    let locked_typing_engine = typing_engine.lock().unwrap();

    Ok(locked_typing_engine
        .construst_result_statistics(LapRequest::IdealKeyStroke(NonZeroUsize::new(50).unwrap()))
        .unwrap()
        .into())
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

            // 組み込み辞書用のディレクトリが無かったら作る
            let builtin_dictionary_dir = app
                .path_resolver()
                .resolve_resource("../builtin_dictionary/hoge.txt")
                .unwrap();

            app.manage(Mutex::new(Library::new(app.path_resolver())));

            #[cfg(debug_assertions)]
            app.get_window("main").unwrap().open_devtools();

            Ok(())
        })
        .invoke_handler(generate_handler![
            get_dictionary_infos,
            confirm_query,
            start_game,
            stroke_key,
            get_result
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
