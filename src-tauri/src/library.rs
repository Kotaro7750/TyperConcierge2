use std::{
    collections::{HashMap, VecDeque},
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
        let elements: Vec<String> = split_by_non_escaped(line, ':');
        // 行数は1行目から始まる
        let line_number = i + 1;

        // 有効な行は語彙と綴りの2つを:で区切られている
        if elements.len() == 2 {
            let view = elements.get(0).unwrap();
            let spells_str = elements.get(1).unwrap();

            if let Some((view, view_parts_counts)) = remove_square_parentheses(view) {
                let spells = split_by_non_escaped(spells_str, ',');

                // spellsの中の2連バックスラッシュを解決する
                let spells: Vec<String> = spells
                    .iter()
                    .map(|spell| convert_two_backslash_to_single(spell))
                    .collect();

                // 語彙のまとまりの数と綴りのまとまりの数が一致している必要がある
                if spells.len() == view_parts_counts.len() {
                    if let Some(spell_strings) = construct_spell_strings(&spells) {
                        let spells: Vec<VocabularySpellElement> = spell_strings
                            .iter()
                            .zip(view_parts_counts)
                            .map(|(spell, count)| {
                                if count == 1 {
                                    VocabularySpellElement::Normal(spell.clone())
                                } else {
                                    VocabularySpellElement::Compound((
                                        spell.clone(),
                                        NonZeroUsize::new(count).unwrap(),
                                    ))
                                }
                            })
                            .collect();

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

/// それぞれの行をセパレータで分割する
/// ただしバックスラッシュでエスケープされたセパレータはセパレータ文字そのものとみなす
/// それらの文字以外につけられたバックスラッシュはそのまま保持する
fn split_by_non_escaped(line: &str, separator: char) -> Vec<String> {
    assert_ne!(separator, '\\');

    let mut splitted = Vec::<String>::new();
    let mut element = String::new();

    let mut is_prev_escape = false;

    for char in line.chars() {
        if char == separator {
            if is_prev_escape {
                element.push(char);

                is_prev_escape = false;
            } else {
                splitted.push(element.clone());
                element.clear();

                is_prev_escape = false;
            }
        } else if char == '\\' {
            if is_prev_escape {
                element.push(char);
                element.push(char);

                is_prev_escape = false;
            } else {
                is_prev_escape = true;
            }
        } else {
            if is_prev_escape {
                element.push('\\');
            }

            element.push(char);

            is_prev_escape = false;
        }
    }

    splitted.push(element);

    splitted
}

/// 角括弧([])を除去し囲まれた部分をひとまとまりとしたそれぞれに何文字あるかを構築する
/// バックスラッシュでエスケープされた角括弧・バックスラッシュは角括弧・バックスラッシュそのものとして扱う
/// ネストされていたり対応が取れていなかったらNoneを返す
/// それ以外のバックスラッシュは特に何もしない
fn remove_square_parentheses(s: &str) -> Option<(String, Vec<usize>)> {
    // 2段階で構築する
    // 1. 角括弧を除去しながら囲まれた部分の位置(除去後の文字列における始まりと終わりのインデックス)を記録する
    // 2. 囲まれた部分の位置をもとにひとまとまりに何文字あるかを構築する
    let mut string = String::new();
    let mut surround_positions = VecDeque::<(usize, usize)>::new();

    let mut is_prev_escape = false;
    let mut i = 0;
    let mut start_i: Option<usize> = None;

    // 1.
    for char in s.chars() {
        if char == '[' {
            if is_prev_escape {
                string.push(char);

                i += 1;
            } else {
                if start_i.is_some() {
                    return None;
                }
                start_i.replace(i);
            }
            is_prev_escape = false;
        } else if char == ']' {
            if is_prev_escape {
                string.push(char);

                i += 1;
            } else {
                if start_i.is_none() {
                    return None;
                } else {
                    // 中に1文字も含まない括弧は許容しない
                    if *start_i.as_ref().unwrap() == i {
                        return None;
                    }
                    surround_positions.push_back((*start_i.as_ref().unwrap(), i - 1));
                    start_i.take();
                }
            }

            is_prev_escape = false;
        } else if char == '\\' {
            if is_prev_escape {
                string.push(char);
                i += 1;

                is_prev_escape = false;
            } else {
                is_prev_escape = true;
            }
        } else {
            if is_prev_escape {
                string.push('\\');
                i += 1;
            }

            string.push(char);
            i += 1;

            is_prev_escape = false;
        }
    }

    // 最後になっても対応する括弧がないならNone
    if start_i.is_some() {
        return None;
    }

    // 2.
    let mut character_counts: Vec<usize> = vec![];
    string.chars().enumerate().for_each(|(i, _)| {
        let front_position = surround_positions.front();

        if let Some((pos_start_i, pos_end_i)) = front_position {
            assert!(pos_end_i >= pos_start_i);
            assert!(i <= *pos_end_i);

            if *pos_start_i <= i && i <= *pos_end_i {
                if i == *pos_end_i {
                    character_counts.push(pos_end_i - pos_start_i + 1);
                    surround_positions.pop_front();
                }
            } else {
                character_counts.push(1);
            }
        } else {
            character_counts.push(1);
        }
    });

    Some((string, character_counts))
}

/// 2回連続でバックスラッシュが出てきたらそれをひとつにする
fn convert_two_backslash_to_single(s: &str) -> String {
    let mut string = String::new();

    let mut is_prev_escape = false;
    for char in s.chars() {
        if char == '\\' {
            if is_prev_escape {
                string.push(char);
                is_prev_escape = false;
            } else {
                is_prev_escape = true;
            }
        } else {
            if is_prev_escape {
                string.push('\\');
            }

            string.push(char);
            is_prev_escape = false;
        }
    }

    if is_prev_escape {
        string.push('\\');
    }

    string
}

#[cfg(test)]
mod test {
    use super::*;
    use std::num::NonZeroUsize;
    use typing_engine::{VocabularyEntry, VocabularySpellElement};

    #[test]
    fn split_by_non_escaped_1() {
        let v = split_by_non_escaped(r"hoge\\\::", ':');
        assert_eq!(v, vec![String::from(r"hoge\\:"), String::from("")]);
    }

    #[test]
    fn split_by_non_escaped_2() {
        let v = split_by_non_escaped(r"hoge:fuga", ':');
        assert_eq!(v, vec![String::from(r"hoge"), String::from("fuga")]);
    }

    #[test]
    fn split_by_non_escaped_3() {
        let v = split_by_non_escaped(r"::", ':');
        assert_eq!(
            v,
            vec![String::from(""), String::from(""), String::from("")]
        );
    }

    #[test]
    fn remove_square_parentheses_1() {
        assert_eq!(
            remove_square_parentheses(r"a[123\]]b[c]"),
            Some(("a123]bc".to_string(), vec![1, 4, 1, 1]))
        );
    }

    #[test]
    fn remove_square_parentheses_2() {
        assert_eq!(remove_square_parentheses(r"[[]]"), None);
    }

    #[test]
    fn remove_square_parentheses_3() {
        assert_eq!(remove_square_parentheses(r"a[bdf\["), None);
    }

    #[test]
    fn remove_square_parentheses_4() {
        assert_eq!(remove_square_parentheses(r"[]"), None);
    }

    #[test]
    fn convert_two_backslash_to_single_1() {
        assert_eq!(convert_two_backslash_to_single(r"\\"), r"\");
    }

    #[test]
    fn convert_two_backslash_to_single_2() {
        assert_eq!(convert_two_backslash_to_single(r"\\\a"), r"\\a");
    }

    #[test]
    fn convert_two_backslash_to_single_3() {
        assert_eq!(convert_two_backslash_to_single(r"\\\"), r"\\");
    }

    #[test]
    fn convert_two_backslash_to_single_4() {
        assert_eq!(convert_two_backslash_to_single(r"\\\\"), r"\\");
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
                r"\:".to_string(),
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
                    VocabularySpellElement::Normal(r"[".to_string().try_into().unwrap()),
                    VocabularySpellElement::Normal("1".to_string().try_into().unwrap()),
                    VocabularySpellElement::Normal("2".to_string().try_into().unwrap()),
                ]
            )
            .unwrap(),]
        );

        assert_eq!(iln, vec![2]);
    }
}
