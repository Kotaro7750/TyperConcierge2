import _, { useState, createContext } from 'react';
import { useLibrary } from './useLibrary';
import { ModeSelectView } from './ModeSelectView';
import { TransitionToTypingView } from './TransitionToTypingView';
import { TypingView } from './TypingView';

export const GameStateContext = createContext<GameStateContext>({} as GameStateContext);
export const LibraryContext = createContext<{ library: Library, libraryOperator: (_: LibraryOperatorActionType) => void }>({} as { library: Library, libraryOperator: (_: LibraryOperatorActionType) => void });

export function App() {
  const [gameState, setGameState] = useState<GameState>('ModeSelect');
  const [library, libraryOperator] = useLibrary();

  return (
    <div className='container-fluid'>
      <GameStateContext.Provider value={{ gameState: gameState, setGameState: setGameState }}>
        <LibraryContext.Provider value={{ library: library, libraryOperator: libraryOperator }}>
          {
            gameState === 'ModeSelect' ? <ModeSelectView /> : gameState === 'TransitionToTyping' ? <TransitionToTypingView /> : gameState == 'Typing' ? <TypingView /> : "hgoe"
          }
        </LibraryContext.Provider>
      </GameStateContext.Provider>
    </div>
  );
}
