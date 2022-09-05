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
  readonly current_cursor_positions: number[],
  readonly missed_positions: number[],
  readonly last_potion: number,
}

type SpellDisplayInfo = {
  readonly spell: string,
  readonly current_cursor_positions: number[],
  readonly missed_positions: number[],
  readonly last_potion: number,
}

type KeyStrokeDisplayInfo = {
  readonly key_stroke: string,
  readonly current_cursor_position: number,
  readonly missed_positions: number[],
  readonly on_typing_statistics: {
    readonly finished_count: number,
    readonly whole_count: number,
    readonly ideal_whole_count: number,
    readonly completely_correct_count: number,
    readonly wrong_count: number,
  }
}

type DisplayInfo = {
  readonly view: ViewDisplayInfo,
  readonly spell: SpellDisplayInfo,
  readonly key_stroke: KeyStrokeDisplayInfo,
}
