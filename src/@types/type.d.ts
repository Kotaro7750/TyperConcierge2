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


type ViewDisplayInfo = {
  readonly view: string,
  readonly currentCursorPositions: number[],
  readonly missedPositions: number[],
  readonly lastPosition: number,
}

type KeyStrokeDisplayInfo = {
  readonly keyStroke: string,
  readonly currentCursorPosition: number,
  readonly missedPositions: number[],
  readonly progress: number,
  readonly lapEndPositions: number[],
  readonly lapEndTime: number[],
}

type DisplayInfo = {
  readonly view: ViewDisplayInfo,
  readonly keyStroke: KeyStrokeDisplayInfo,
}

type TypingStatisticsSummary = {
  // 最短で打った場合のローマ字数
  idealWordCount: number,
  // 実際に打ったローマ字系列のローマ字数
  inputWordCount: number,
  missCount: number,
  totalTime: number,
}
