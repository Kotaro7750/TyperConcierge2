import { useEffect, useReducer } from 'react';
import { invoke } from '@tauri-apps/api';

export function useLibrary(): [Library, (action: LibraryOperatorActionType) => void] {

  // tauri側から取得する辞書情報
  type DictionaryInfoFromCore = {
    dictionary_type: DictionaryType,
    origin: DictionaryOrigin,
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
    usedDictionaries: [DictionaryOrigin, String][],
    keyStrokeCountThreshold?: number,
  }

  type LibraryReducerActionType =
    { type: 'use', dictionaryName: string, dictionaryOrigin: DictionaryOrigin }
    | { type: 'disuse', dictionaryName: string, dictionaryOrigin: DictionaryOrigin }
    | { type: 'load', availableDictionaryList: CategorizedDictionaryInfoList }
    | { type: 'type', dictionaryType: DictionaryType }
    | { type: 'keyStrokeCountThreshold', keyStrokeCountThreshold: number };

  type CategorizedDictionaryInfoList = {
    word: DictionaryInfo[],
    sentence: DictionaryInfo[],
  }

  // Libraryとは異なり現在有効な辞書タイプではない方も保持する
  type LibraryInner = {
    availableDictionaries: CategorizedDictionaryInfoList,
    usedDictionaries: {
      word: [DictionaryOrigin, string][],
      sentence: [DictionaryOrigin, string][],
    },
    usedDictionaryType: DictionaryType,
    keyStrokeCountThreshold: number,
  }

  const existInAvailableDictionary = (availableDictionaryList: CategorizedDictionaryInfoList, dictionaryName: string, vocabularyType: DictionaryType, dictionaryOrigin: DictionaryOrigin) => {
    const dictionaryInfoList = vocabularyType == 'word' ? availableDictionaryList.word : availableDictionaryList.sentence;

    for (let dictionaryInfo of dictionaryInfoList) {
      if (dictionaryInfo.type != vocabularyType) {
        throw new Error(`VocabularyType mismatch in ${dictionaryInfo.name} expected ${vocabularyType}, but ${dictionaryInfo.type}`);
      }

      if (dictionaryInfo.name == dictionaryName && dictionaryInfo.origin == dictionaryOrigin) {
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
        if (!existInAvailableDictionary(state.availableDictionaries, action.dictionaryName, state.usedDictionaryType, action.dictionaryOrigin)) {
          throw new Error(`use dictionary(${action.dictionaryName}) not in availableDictionaryList`);
        }

        // 現在有効になっている辞書タイプによって追加する場所を切り替える
        const addedUsedDictionaries: { word: [DictionaryOrigin, string][], sentence: [DictionaryOrigin, string][] } = state.usedDictionaryType == 'word' ? {
          word: state.usedDictionaries.word.concat([[action.dictionaryOrigin, action.dictionaryName]]),
          sentence: state.usedDictionaries.sentence,
        } : {
          word: state.usedDictionaries.word,
          sentence: state.usedDictionaries.sentence.concat([[action.dictionaryOrigin, action.dictionaryName]]),
        };

        return {
          availableDictionaries: state.availableDictionaries,
          usedDictionaries: addedUsedDictionaries,
          usedDictionaryType: state.usedDictionaryType,
          keyStrokeCountThreshold: state.keyStrokeCountThreshold,
        };

      // 現在有効になっている辞書タイプで利用可能な辞書を不使用とする
      case 'disuse':
        if (!existInAvailableDictionary(state.availableDictionaries, action.dictionaryName, state.usedDictionaryType, action.dictionaryOrigin)) {
          throw new Error(`disuse dictionary(${action.dictionaryName}) not in availableDictionaryList`);
        }

        const deletedUsedDictionaryFileNameList: { word: [DictionaryOrigin, string][], sentence: [DictionaryOrigin, string][] } = state.usedDictionaryType == 'word' ? {
          word: state.usedDictionaries.word.filter(e => e[0] !== action.dictionaryOrigin || e[1] !== action.dictionaryName),
          sentence: state.usedDictionaries.sentence,
        } : {
          word: state.usedDictionaries.word,
          sentence: state.usedDictionaries.sentence.filter(e => e[0] !== action.dictionaryOrigin || e[1] !== action.dictionaryName),
        };


        return {
          availableDictionaries: state.availableDictionaries,
          usedDictionaries: deletedUsedDictionaryFileNameList,
          usedDictionaryType: state.usedDictionaryType,
          keyStrokeCountThreshold: state.keyStrokeCountThreshold,
        };

      case 'load':
        const wordAvailableDictionaryNameList = action.availableDictionaryList.word.map(e => [e.origin, e.name]);
        const sentenceAvailableDictionaryNameList = action.availableDictionaryList.sentence.map(e => [e.origin, e.name]);

        return {
          availableDictionaries: action.availableDictionaryList,
          // 使用すると選択した辞書であっても使用可能な辞書からなくなっている可能性があるので排除する必要がある
          usedDictionaries: {
            word: state.usedDictionaries.word.filter(e => wordAvailableDictionaryNameList.includes(e)),
            sentence: state.usedDictionaries.sentence.filter(e => sentenceAvailableDictionaryNameList.includes(e)),
          },
          usedDictionaryType: state.usedDictionaryType,
          keyStrokeCountThreshold: state.keyStrokeCountThreshold,
        };

      // 使用する辞書タイプを変更する
      case 'type':
        return {
          availableDictionaries: state.availableDictionaries,
          usedDictionaries: state.usedDictionaries,
          usedDictionaryType: action.dictionaryType,
          keyStrokeCountThreshold: state.keyStrokeCountThreshold,
        };

      // 
      case 'keyStrokeCountThreshold':
        return {
          availableDictionaries: state.availableDictionaries,
          usedDictionaries: state.usedDictionaries,
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
          origin: wordDictionary.origin,
          type: 'word',
          validVocabularyCount: wordDictionary.valid_vocabulary_count,
          invalidLineNumberList: wordDictionary.invalid_line_numbers,
        });
      });

      categorizedDictionaryInfos.sentence.forEach(sentenceDictionary => {
        availableDictionaryList.sentence.push({
          name: sentenceDictionary.name,
          type: 'sentence',
          origin: sentenceDictionary.origin,
          validVocabularyCount: sentenceDictionary.valid_vocabulary_count,
          invalidLineNumberList: sentenceDictionary.invalid_line_numbers,
        });
      });

      dispatchLibrary({ type: 'load', availableDictionaryList: availableDictionaryList });
    });
  };

  const confirmQuery = () => {
    let request: QueryRequestToCore = { dictionaryType: effectiveVocabularyType, usedDictionaries: effectiveUsedDictionaries };

    if (effectiveVocabularyType == 'word') {
      request.keyStrokeCountThreshold = innerLibrary.keyStrokeCountThreshold;
    }

    invoke('confirm_query', { queryRequestFromUi: request });
  };

  // stateの変更は一部非同期なのでreducerの中で全部を行うことはできない
  const operator = (action: LibraryOperatorActionType) => {
    switch (action.type) {
      case 'use':
        dispatchLibrary({ type: 'use', dictionaryName: action.dictionaryName, dictionaryOrigin: action.dictionaryOrigin });
        break;
      case 'disuse':
        dispatchLibrary({ type: 'disuse', dictionaryName: action.dictionaryName, dictionaryOrigin: action.dictionaryOrigin });
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
    usedDictionaries: { word: [], sentence: [] },
    usedDictionaryType: 'word',
    keyStrokeCountThreshold: 150,
  });

  // 返却する型は現在有効な辞書タイプの情報のみを持つ
  const effectiveVocabularyType = innerLibrary.usedDictionaryType;
  const effectiveUsedDictionaries = effectiveVocabularyType == 'word' ? innerLibrary.usedDictionaries.word : innerLibrary.usedDictionaries.sentence;
  const effectiveAvailableDictionaries = effectiveVocabularyType == 'word' ? innerLibrary.availableDictionaries.word : innerLibrary.availableDictionaries.sentence;

  const library: Library = {
    usedDictionaries: effectiveUsedDictionaries,
    availableDictionaries: effectiveAvailableDictionaries,
    usedDictionaryType: effectiveVocabularyType,
    keyStrokeCountThreshold: innerLibrary.keyStrokeCountThreshold,
  };

  return [library, operator];
}
