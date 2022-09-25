use std::{
    collections::HashMap,
    fs::{create_dir, File},
    io::Read,
    num::NonZeroUsize,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use tauri::{
    api::dir::{is_dir, read_dir},
    PathResolver,
};
use typing_engine::{SpellString, VocabularyEntry, VocabularySpellElement};

pub struct Library {
    library_dir_path: PathBuf,
    word_dictionaries: HashMap<String, Dictionary>,
    sentence_dictionaries: HashMap<String, Dictionary>,
}

impl Library {
    pub fn new(path_resolver: PathResolver) -> Self {
        let mut library_dir_path = path_resolver.app_dir().unwrap();
        library_dir_path.push("library");

        if !library_dir_path.exists() {
            create_dir(&library_dir_path).unwrap();
        }

        assert!(library_dir_path.exists());

        let dictionaries: HashMap<String, Dictionary> = construct_dictionaries(&library_dir_path)
            .drain(..)
            .map(|dictionary| (dictionary.name().to_string(), dictionary))
            .collect();

        let (word_dictionaries, sentence_dictionaries) = dictionaries
            .into_iter()
            .partition(|(_, dictionary)| dictionary.dictionary_type == DictionaryType::Word);

        Self {
            word_dictionaries,
            sentence_dictionaries,
            library_dir_path,
        }
    }

    // 現在登録されている辞書情報の一覧を取得する
    pub fn dictionary_infos(&self) -> CategorizedDictionaryInfos {
        CategorizedDictionaryInfos::new(
            self.word_dictionaries
                .iter()
                .map(|(_, dictionary)| dictionary.construct_dictionary_info())
                .collect(),
            self.sentence_dictionaries
                .iter()
                .map(|(_, dictionary)| dictionary.construct_dictionary_info())
                .collect(),
        )
    }

    // 自身の管理している辞書群を更新する
    pub fn reload_dictionaries(&mut self) {
        // TODO タイムスタンプで更新のいらないファイルは更新しないようにする
        let dictionaries: HashMap<String, Dictionary> =
            construct_dictionaries(&self.library_dir_path)
                .drain(..)
                .map(|dictionary| (dictionary.name().to_string(), dictionary))
                .collect();

        let (word_dictionaries, sentence_dictionaries) = dictionaries
            .into_iter()
            .partition(|(_, dictionary)| dictionary.dictionary_type == DictionaryType::Word);

        self.word_dictionaries = word_dictionaries;
        self.sentence_dictionaries = sentence_dictionaries;
    }

    // 指定された辞書から語彙群を構成する
    // 語彙の順番は引数で渡された辞書名の順番になる
    pub fn vocabulary_entries_of_request(
        &self,
        request_dictionary_type: DictionaryType,
        request_dictionary_names: &[impl AsRef<str>],
    ) -> Vec<&VocabularyEntry> {
        let mut vocabulary_entries: Vec<&VocabularyEntry> = vec![];

        let dictionaries = match request_dictionary_type {
            DictionaryType::Word => &self.word_dictionaries,
            DictionaryType::Sentence => &self.sentence_dictionaries,
        };

        request_dictionary_names.iter().for_each(|dictionary_name| {
            let dictionary = dictionaries.get(dictionary_name.as_ref()).unwrap();

            dictionary
                .vocabulary_entries
                .iter()
                .for_each(|vocabulary_entry| {
                    vocabulary_entries.push(&vocabulary_entry);
                });
        });

        vocabulary_entries
    }

    fn get_dictionary(
        &self,
        dictionary_name: &str,
        dictionary_type: DictionaryType,
    ) -> Option<&Dictionary> {
        match dictionary_type {
            DictionaryType::Word => self.word_dictionaries.get(dictionary_name),
            DictionaryType::Sentence => self.sentence_dictionaries.get(dictionary_name),
        }
    }
}

fn construct_dictionaries<P: AsRef<Path>>(library_dir_path: P) -> Vec<Dictionary> {
    get_dictionary_file_paths(library_dir_path)
        .iter()
        .map(|path| Dictionary::new(path))
        .filter(|may_dictionary| may_dictionary.is_some())
        .map(|some_dictionary| some_dictionary.unwrap())
        .collect()
}

// ライブラリディレクトリ配下にある拡張子がtconciergewまたはtconciergesのファイルパス一覧
// 再帰的走査はしない
fn get_dictionary_file_paths<P: AsRef<Path>>(library_dir_path: P) -> Vec<PathBuf> {
    read_dir(library_dir_path.as_ref(), false)
        .unwrap()
        .iter()
        .filter(|disk_entry| !is_dir(&disk_entry.path).unwrap())
        .filter(|disk_entry| {
            disk_entry.path.extension().map_or(false, |extension| {
                extension == "tconciergew" || extension == "tconcierges"
            })
        })
        .map(|disk_entry| disk_entry.path.clone())
        .collect()
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CategorizedDictionaryInfos {
    word: Vec<DictionaryInfo>,
    sentence: Vec<DictionaryInfo>,
}

impl CategorizedDictionaryInfos {
    fn new(word: Vec<DictionaryInfo>, sentence: Vec<DictionaryInfo>) -> Self {
        Self { word, sentence }
    }
}

// UI側に見せる辞書情報
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DictionaryInfo {
    name: String,
    dictionary_type: DictionaryType,
    valid_vocabulary_count: usize,
    invalid_line_numbers: Vec<usize>,
}

impl DictionaryInfo {
    fn new(
        name: String,
        dictionary_type: DictionaryType,
        valid_vocabulary_count: usize,
        invalid_line_numbers: Vec<usize>,
    ) -> Self {
        Self {
            name,
            dictionary_type,
            valid_vocabulary_count,
            invalid_line_numbers,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DictionaryType {
    Word,
    Sentence,
}

// 内部で使う辞書情報
pub struct Dictionary {
    name: String,
    dictionary_type: DictionaryType,
    path: PathBuf,
    vocabulary_entries: Vec<VocabularyEntry>,
    invalid_line_numbers: Vec<usize>,
}

impl Dictionary {
    fn new<P: AsRef<Path>>(path: P) -> Option<Self> {
        let dictionary_type = match path.as_ref().extension().unwrap().to_str() {
            Some("tconcierges") => DictionaryType::Sentence,
            Some("tconciergew") => DictionaryType::Word,
            _ => unreachable!(),
        };

        let dictionary_name = path.as_ref().file_stem()?;

        let mut f = File::open(&path).ok()?;

        let mut content = String::new();
        f.read_to_string(&mut content).ok()?;

        let (vocabulary_entries, invalid_line_numbers) = parse_dictionary_content(&content);

        Some(Self {
            name: dictionary_name.to_str()?.to_string(),
            dictionary_type,
            path: path.as_ref().to_owned(),
            vocabulary_entries,
            invalid_line_numbers,
        })
    }

    fn name(&self) -> &str {
        &self.name
    }

    fn vocabulary_entries(&self) -> &Vec<VocabularyEntry> {
        &self.vocabulary_entries
    }

    fn construct_dictionary_info(&self) -> DictionaryInfo {
        DictionaryInfo::new(
            self.name.clone(),
            self.dictionary_type.clone(),
            self.vocabulary_entries.len(),
            self.invalid_line_numbers.clone(),
        )
    }
}

// 辞書をパースする
fn parse_dictionary_content(file_content: &str) -> (Vec<VocabularyEntry>, Vec<usize>) {
    let mut vocabulary_entries = Vec::<VocabularyEntry>::new();
    let mut invalid_line_numbers = Vec::<usize>::new();

    for (i, line) in file_content.lines().enumerate() {
        let elements: Vec<String> = split_by_exclude_repeated(line, ':');
        // 行数は1行目から始まる
        let line_number = i + 1;

        if elements.len() == 2 {
            let view = elements.get(0).unwrap();
            let spells_str = elements.get(1).unwrap();

            let spells = split_by_exclude_repeated(spells_str, ',');

            if let Some(spell_strings) = construct_spell_strings(&spells) {
                // 語彙が複数文字で綴りの個数が1つしかないときには熟字訓とみなす
                let spells = if view.chars().count() > 1 && spell_strings.len() == 1 {
                    vec![VocabularySpellElement::Compound((
                        spell_strings[0].clone(),
                        NonZeroUsize::new(view.chars().count()).unwrap(),
                    ))]
                } else {
                    spell_strings
                        .iter()
                        .map(|spell_string| VocabularySpellElement::Normal(spell_string.clone()))
                        .collect()
                };

                //
                if let Some(vocabulary_entry) = VocabularyEntry::new(view.clone(), spells) {
                    vocabulary_entries.push(vocabulary_entry);
                } else {
                    invalid_line_numbers.push(line_number);
                }
            } else {
                invalid_line_numbers.push(line_number);
            }
        } else {
            invalid_line_numbers.push(line_number);
        }
    }

    (vocabulary_entries, invalid_line_numbers)
}

// 文字列のリストから綴り文字列のリストに変換する
// 綴り文字列として不的確なものがあった場合にはNoneを返す
fn construct_spell_strings(strs: &[String]) -> Option<Vec<SpellString>> {
    let mut spell_strings = vec![];
    for str in strs {
        if let Some(spell_string) = SpellString::try_from(str.to_string()).ok() {
            spell_strings.push(spell_string);
        } else {
            return None;
        }
    }

    Some(spell_strings)
}

// それぞれの行をセパレータで分割する
// ただし2連続のセパレータはセパレータ文字そのものとみなす
fn split_by_exclude_repeated(line: &str, separator: char) -> Vec<String> {
    let mut is_prev_separator = false;

    let mut splitted = Vec::<String>::new();

    let mut element = String::new();

    for char in line.chars() {
        if char == separator {
            // 2連続でセパレータだったらセパレータ文字そのものとして扱う
            if is_prev_separator {
                element.push(char);
                is_prev_separator = false;
            } else {
                is_prev_separator = true;
            }
        } else {
            if is_prev_separator {
                splitted.push(element.clone());
                element.clear()
            }

            element.push(char);
            is_prev_separator = false;
        }
    }
    splitted.push(element);

    if is_prev_separator {
        splitted.push(String::new());
    }

    splitted
}

#[cfg(test)]
mod test {
    use super::*;
    use std::num::NonZeroUsize;
    use typing_engine::{VocabularyEntry, VocabularySpellElement};

    #[test]
    fn split_by_exclude_repeated_1() {
        let v = split_by_exclude_repeated("hoge:::fuga:", ':');
        assert_eq!(
            v,
            vec![
                String::from("hoge:"),
                String::from("fuga"),
                String::from("")
            ]
        );
    }

    #[test]
    fn split_by_exclude_repeated_2() {
        let v = split_by_exclude_repeated("hoge:fuga", ':');
        assert_eq!(v, vec![String::from("hoge"), String::from("fuga")]);
    }

    #[test]
    fn parse_dictionary_1() {
        let (ve, iln) =
            parse_dictionary_content("頑張る:がん,ば,る\n頑張る:がんば,る\n[百舌鳥]:もず");

        assert_eq!(
            ve,
            vec![
                VocabularyEntry::new(
                    "頑張る".to_string(),
                    vec![
                        VocabularySpellElement::Normal("がん".to_string().try_into().unwrap()),
                        VocabularySpellElement::Normal("ば".to_string().try_into().unwrap()),
                        VocabularySpellElement::Normal("る".to_string().try_into().unwrap())
                    ]
                )
                .unwrap(),
                VocabularyEntry::new(
                    "百舌鳥".to_string(),
                    vec![VocabularySpellElement::Compound((
                        "もず".to_string().try_into().unwrap(),
                        NonZeroUsize::new(3).unwrap()
                    ))]
                )
                .unwrap()
            ]
        );

        assert_eq!(iln, vec![2]);
    }

    #[test]
    fn parse_dictionary_2() {
        let (ve, iln) =
            parse_dictionary_content("[昨日]の敵は[今日]の友:きのう,の,てき,は,きょう,の,とも");

        assert_eq!(
            ve,
            vec![VocabularyEntry::new(
                "昨日の敵は今日の友".to_string(),
                vec![
                    VocabularySpellElement::Compound((
                        "きのう".to_string().try_into().unwrap(),
                        NonZeroUsize::new(2).unwrap()
                    )),
                    VocabularySpellElement::Normal("の".to_string().try_into().unwrap()),
                    VocabularySpellElement::Normal("てき".to_string().try_into().unwrap()),
                    VocabularySpellElement::Normal("は".to_string().try_into().unwrap()),
                    VocabularySpellElement::Compound((
                        "きょう".to_string().try_into().unwrap(),
                        NonZeroUsize::new(2).unwrap()
                    )),
                    VocabularySpellElement::Normal("の".to_string().try_into().unwrap()),
                    VocabularySpellElement::Normal("とも".to_string().try_into().unwrap()),
                ]
            )
            .unwrap(),]
        );

        assert_eq!(iln, vec![] as Vec<usize>);
    }

    #[test]
    fn parse_dictionary_3() {
        let (ve, iln) = parse_dictionary_content(r"\\\::\\,\:");

        assert_eq!(
            ve,
            vec![VocabularyEntry::new(
                "\\:".to_string(),
                vec![
                    VocabularySpellElement::Normal(r"\".to_string().try_into().unwrap()),
                    VocabularySpellElement::Normal(":".to_string().try_into().unwrap()),
                ]
            )
            .unwrap(),]
        );

        assert_eq!(iln, vec![] as Vec<usize>);
    }

    #[test]
    fn parse_dictionary_4() {
        let (ve, iln) = parse_dictionary_content(
            r"[\[]12:[,1,2
            [[]12:[,1,2",
        );

        assert_eq!(
            ve,
            vec![VocabularyEntry::new(
                "[12".to_string(),
                vec![
                    VocabularySpellElement::Compound((
                        r"[".to_string().try_into().unwrap(),
                        NonZeroUsize::new(1).unwrap()
                    )),
                    VocabularySpellElement::Normal("1".to_string().try_into().unwrap()),
                    VocabularySpellElement::Normal("2".to_string().try_into().unwrap()),
                ]
            )
            .unwrap(),]
        );

        assert_eq!(iln, vec![2]);
    }
}
