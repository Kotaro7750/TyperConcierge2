type GameState = 'ModeSelect' | 'TransitionToTyping' | 'Typing' | 'Finished';

interface GameStateContext {
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
}

type DictionaryType = 'word' | 'sentence';

type DictionaryInfo = {
  name: string,
  type: DictionaryType,
  invalidLineNumberList: number[],
  validVocabularyCount: number,
}

type Library = {
  readonly usedDictionaryNames: string[],
  readonly availableDictionaries: DictionaryInfo[],
  readonly usedDictionaryType: DictionaryType,
  readonly keyStrokeCountThreshold: number,
}

type LibraryOperatorActionType = { type: 'use', dictionaryName: string } | { type: 'disuse', dictionaryName: string } | { type: 'load' } | { type: 'type', dictionaryType: DictionaryType } | { type: 'keyStrokeCountThreshold', keyStrokeCountThreshold: number } | { type: 'confirmQuery' };

