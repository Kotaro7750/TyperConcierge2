import { invoke } from '@tauri-apps/api';
import _, { useEffect, useContext, useState } from 'react';
//import { ResultSummaryPane } from './ResultSummaryPane';

import { GameStateContext } from './App';
import { ResultSummaryPane } from './ResultSummaryPane';

// | undefinedとしているのは初回には結果はないため
export function ResultView(): JSX.Element {
  const gameStateContext = useContext(GameStateContext);
  const [resultStatistics, setResultStatistics] = useState<TypingResultStatistics>({
    keyStroke: {
      wholeCount: 0,
      completelyCorrectCount: 0,
      missedCount: 0,
    },
    idealKeyStroke: {
      wholeCount: 0,
      completelyCorrectCount: 0,
      missedCount: 0,
    },
    totalTimeMs: 0
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key;

    if (key === 'Escape') {
      gameStateContext.setGameState('ModeSelect');
      return;
    }
  }

  useEffect(() => {
    invoke<TypingResultStatistics>('get_result').then(m => setResultStatistics(m)).catch(e => console.log(e));
  });

  useEffect(() => {
    addEventListener('keydown', handleKeyDown);

    return () => { removeEventListener('keydown', handleKeyDown) }
  });

  return (
    <div className='w-100 h-100'>
      <div className='p-2 h-50 w-40'>
        <ResultSummaryPane summary={resultStatistics} />
      </div>
    </div>
  );
}
