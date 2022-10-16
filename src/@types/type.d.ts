type GameState = 'ModeSelect' | 'TransitionToTyping' | 'Typing' | 'Finished';

interface GameStateContext {
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
}

type DictionaryType = 'word' | 'sentence';

type DictionaryOrigin = 'user_defined' | 'builtin';

type DictionaryInfo = {
  name: string,
  type: DictionaryType,
  origin: DictionaryOrigin,
  invalidLineNumberList: number[],
  validVocabularyCount: number,
}

type Library = {
  readonly usedDictionaries: [DictionaryOrigin, string][],
  readonly availableDictionaries: DictionaryInfo[],
  readonly usedDictionaryType: DictionaryType,
  readonly keyStrokeCountThreshold: number,
}

type LibraryOperatorActionType =
  { type: 'use', dictionaryName: string, dictionaryOrigin: DictionaryOrigin }
  | { type: 'disuse', dictionaryName: string, dictionaryOrigin: DictionaryOrigin }
  | { type: 'load' }
  | { type: 'type', dictionaryType: DictionaryType }
  | { type: 'keyStrokeCountThreshold', keyStrokeCountThreshold: number }
  | { type: 'confirmQuery' };


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

type CharacterStyleInformation = {
  c: string,
  isWrong: boolean,
  cursorRelative: 'before' | 'onCursor' | 'after',
  isOutRange: boolean,
}

type TypingResultStatistics = {
  keyStroke: TypingResultStatisticsTarget,
  idealKeyStroke: TypingResultStatisticsTarget,
  totalTimeMs: number,
}

type TypingResultStatisticsTarget = {
  wholeCount: number,
  completelyCorrectCount: number,
  missedCount: number,
}
