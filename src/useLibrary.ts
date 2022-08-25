import { useEffect, useReducer } from 'react';
import { invoke } from '@tauri-apps/api';

export function useLibrary(): [Library, (action: LibraryOperatorActionType) => void] {

  // tauri側から取得する辞書情報
  type DictionaryInfoFromCore = {
    dictionary_type: DictionaryType,
    invalid_line_numbers: number[],
    name: string,
    valid_vocabulary_count: number,
  };

  type CategorizedDictionaryInfosFromCore = {
    word: DictionaryInfoFromCore[],
    sentence: DictionaryInfoFromCore[],
  }

  type QueryRequestToCore = {
    dictionaryType: DictionaryType,
    usedDictionaryNames: string[],
    keyStrokeCountThreshold?: number,
  }

  type LibraryReducerActionType = { type: 'use', dictionaryName: string } | { type: 'disuse', dictionaryName: string } | { type: 'load', availableDictionaryList: CategorizedDictionaryInfoList } | { type: 'type', dictionaryType: DictionaryType } | { type: 'keyStrokeCountThreshold', keyStrokeCountThreshold: number };

  type CategorizedDictionaryInfoList = {
    word: DictionaryInfo[],
    sentence: DictionaryInfo[],
  }

  // Libraryとは異なり現在有効な辞書タイプではない方も保持する
  type LibraryInner = {
    availableDictionaries: CategorizedDictionaryInfoList,
    usedDictionaryNames: {
      word: string[],
      sentence: string[],
    },
    usedDictionaryType: DictionaryType,
    keyStrokeCountThreshold: number,
  }

  const existInAvailableDictionary = (availableDictionaryList: CategorizedDictionaryInfoList, dictionaryName: string, vocabularyType: DictionaryType) => {
    const dictionaryInfoList = vocabularyType == 'word' ? availableDictionaryList.word : availableDictionaryList.sentence;

    for (let dictionaryInfo of dictionaryInfoList) {
      if (dictionaryInfo.type != vocabularyType) {
        throw new Error(`VocabularyType mismatch in ${dictionaryInfo.name} expected ${vocabularyType}, but ${dictionaryInfo.type}`);
      }

      if (dictionaryInfo.name == dictionaryName) {
        return true;
      }
    }

    return false;
  };

  // 辞書群関連をまとめて１つのstateとして管理する
  const libraryReducer: React.Reducer<LibraryInner, LibraryReducerActionType> = (state: LibraryInner, action: LibraryReducerActionType) => {
    switch (action.type) {
      // 現在有効になっている辞書タイプで利用可能な辞書から追加する
      case 'use':
        if (!existInAvailableDictionary(state.availableDictionaries, action.dictionaryName, state.usedDictionaryType)) {
          throw new Error(`use dictionary(${action.dictionaryName}) not in availableDictionaryList`);
        }

        // 現在有効になっている辞書タイプによって追加する場所を切り替える
        const addedUsedDictionaryFileNameList: { word: string[], sentence: string[] } = state.usedDictionaryType == 'word' ? {
          word: state.usedDictionaryNames.word.concat([action.dictionaryName]),
          sentence: state.usedDictionaryNames.sentence,
        } : {
          word: state.usedDictionaryNames.word,
          sentence: state.usedDictionaryNames.sentence.concat([action.dictionaryName]),
        };

        return {
          availableDictionaries: state.availableDictionaries,
          usedDictionaryNames: addedUsedDictionaryFileNameList,
          usedDictionaryType: state.usedDictionaryType,
          keyStrokeCountThreshold: state.keyStrokeCountThreshold,
        };

      // 現在有効になっている辞書タイプで利用可能な辞書を不使用とする
      case 'disuse':
        if (!existInAvailableDictionary(state.availableDictionaries, action.dictionaryName, state.usedDictionaryType)) {
          throw new Error(`disuse dictionary(${action.dictionaryName}) not in availableDictionaryList`);
        }

        const deletedUsedDictionaryFileNameList: { word: string[], sentence: string[] } = state.usedDictionaryType == 'word' ? {
          word: state.usedDictionaryNames.word.filter(e => e !== action.dictionaryName),
          sentence: state.usedDictionaryNames.sentence,
        } : {
          word: state.usedDictionaryNames.word,
          sentence: state.usedDictionaryNames.sentence.filter(e => e !== action.dictionaryName),
        };


        return {
          availableDictionaries: state.availableDictionaries,
          usedDictionaryNames: deletedUsedDictionaryFileNameList,
          usedDictionaryType: state.usedDictionaryType,
          keyStrokeCountThreshold: state.keyStrokeCountThreshold,
        };

      case 'load':
        const wordAvailableDictionaryNameList = action.availableDictionaryList.word.map(e => e.name);
        const sentenceAvailableDictionaryNameList = action.availableDictionaryList.sentence.map(e => e.name);

        return {
          availableDictionaries: action.availableDictionaryList,
          // 使用すると選択した辞書であっても使用可能な辞書からなくなっている可能性があるので排除する必要がある
          usedDictionaryNames: {
            word: state.usedDictionaryNames.word.filter(e => wordAvailableDictionaryNameList.includes(e)),
            sentence: state.usedDictionaryNames.sentence.filter(e => sentenceAvailableDictionaryNameList.includes(e)),
          },
          usedDictionaryType: state.usedDictionaryType,
          keyStrokeCountThreshold: state.keyStrokeCountThreshold,
        };

      // 使用する辞書タイプを変更する
      case 'type':
        return {
          availableDictionaries: state.availableDictionaries,
          usedDictionaryNames: state.usedDictionaryNames,
          usedDictionaryType: action.dictionaryType,
          keyStrokeCountThreshold: state.keyStrokeCountThreshold,
        };

      // 
      case 'keyStrokeCountThreshold':
        return {
          availableDictionaries: state.availableDictionaries,
          usedDictionaryNames: state.usedDictionaryNames,
          usedDictionaryType: state.usedDictionaryType,
          keyStrokeCountThreshold: action.keyStrokeCountThreshold,
        };
    }
  }

  const loadAvailableDictionaryList = () => {
    invoke<CategorizedDictionaryInfosFromCore>('get_dictionary_infos').then((categorizedDictionaryInfos: CategorizedDictionaryInfosFromCore) => {
      let availableDictionaryList: CategorizedDictionaryInfoList = {
        word: [],
        sentence: [],
      };

      categorizedDictionaryInfos.word.forEach(wordDictionary => {
        availableDictionaryList.word.push({
          name: wordDictionary.name,
          type: 'word',
          validVocabularyCount: wordDictionary.valid_vocabulary_count,
          invalidLineNumberList: wordDictionary.invalid_line_numbers,
        });
      });

      categorizedDictionaryInfos.sentence.forEach(sentenceDictionary => {
        availableDictionaryList.sentence.push({
          name: sentenceDictionary.name,
          type: 'sentence',
          validVocabularyCount: sentenceDictionary.valid_vocabulary_count,
          invalidLineNumberList: sentenceDictionary.invalid_line_numbers,
        });
      });

      dispatchLibrary({ type: 'load', availableDictionaryList: availableDictionaryList });
    });
  };

  const confirmQuery = () => {
    let request: QueryRequestToCore = { dictionaryType: effectiveVocabularyType, usedDictionaryNames: effectiveUsedDictionaryNames };

    if (effectiveVocabularyType == 'word') {
      request.keyStrokeCountThreshold = innerLibrary.keyStrokeCountThreshold;
    }

    invoke('confirm_query', { queryRequestFromUi: request });
  };

  // stateの変更は一部非同期なのでreducerの中で全部を行うことはできない
  const operator = (action: LibraryOperatorActionType) => {
    switch (action.type) {
      case 'use':
        dispatchLibrary({ type: 'use', dictionaryName: action.dictionaryName });
        break;
      case 'disuse':
        dispatchLibrary({ type: 'disuse', dictionaryName: action.dictionaryName });
        break;
      case 'load':
        loadAvailableDictionaryList();
        break;
      case 'type':
        dispatchLibrary({ type: 'type', dictionaryType: action.dictionaryType });
        break;
      case 'keyStrokeCountThreshold':
        dispatchLibrary({ type: 'keyStrokeCountThreshold', keyStrokeCountThreshold: action.keyStrokeCountThreshold });
        break;
      case 'confirmQuery':
        confirmQuery();
        break;
    }
  }

  // 依存なしなので初回のみ
  useEffect(() => {
    loadAvailableDictionaryList();
  }, []);

  const [innerLibrary, dispatchLibrary] = useReducer(libraryReducer, {
    availableDictionaries: { word: [], sentence: [] },
    usedDictionaryNames: { word: [], sentence: [] },
    usedDictionaryType: 'word',
    keyStrokeCountThreshold: 150,
  });

  // 返却する型は現在有効な辞書タイプの情報のみを持つ
  const effectiveVocabularyType = innerLibrary.usedDictionaryType;
  const effectiveUsedDictionaryNames = effectiveVocabularyType == 'word' ? innerLibrary.usedDictionaryNames.word : innerLibrary.usedDictionaryNames.sentence;
  const effectiveAvailableDictionaries = effectiveVocabularyType == 'word' ? innerLibrary.availableDictionaries.word : innerLibrary.availableDictionaries.sentence;

  const library: Library = {
    usedDictionaryNames: effectiveUsedDictionaryNames,
    availableDictionaries: effectiveAvailableDictionaries,
    usedDictionaryType: effectiveVocabularyType,
    keyStrokeCountThreshold: innerLibrary.keyStrokeCountThreshold,
  };

  return [library, operator];
}
