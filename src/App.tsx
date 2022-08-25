import _, { useState, createContext } from 'react';
import { ModeSelectView } from './ModeSelectView';
import { TransitionToTypingView } from './TransitionToTypingView';

export const GameStateContext = createContext<GameStateContext>({} as GameStateContext);

export function App() {
  const [gameState, setGameState] = useState<GameState>('ModeSelect');

  return (
    <div className='container-fluid'>
      <GameStateContext.Provider value={{ gameState: gameState, setGameState: setGameState }}>
        {
          gameState === 'ModeSelect' ? <ModeSelectView /> : gameState === 'TransitionToTyping' ? <TransitionToTypingView /> : "hoge"
        }
      </GameStateContext.Provider>
    </div>
  );
}
