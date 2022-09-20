import _, { useEffect, useContext } from 'react';
//import { ResultSummaryPane } from './ResultSummaryPane';

import { GameStateContext } from './App';
import { ResultSummaryPane } from './ResultSummaryPane';

// | undefinedとしているのは初回には結果はないため
export function ResultView(): JSX.Element {
  const gameStateContext = useContext(GameStateContext);

  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key;

    if (key === 'Escape') {
      gameStateContext.setGameState('ModeSelect');
      return;
    }
  }

  useEffect(() => {
    addEventListener('keydown', handleKeyDown);

    return () => { removeEventListener('keydown', handleKeyDown) }
  });

  const summary: TypingStatisticsSummary = {
    idealWordCount: 30,
    inputWordCount: 32,
    missCount: 3,
    totalTime: 30.1
  };

  return (
    <div className='row my-3 mx-0'>
      <div className='col-12 p-0 vh-50 w-40 border border-secondary border-3 rounded-3 bg-white'>
        <ResultSummaryPane summary={summary} />
      </div>
    </div>
  );
}
