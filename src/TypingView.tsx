import _, { useEffect, useContext } from 'react';
import { TimerPane } from './TimerPane';

import { GameStateContext } from './App';

import { useMilliSecondTimer } from './useMilliSecondTimer';

export function TypingView() {
  const [elapsedTime, startTimer, stopTimer, cancelTimer] = useMilliSecondTimer();

  const gameStateContext = useContext(GameStateContext);

  const cancelTyping = () => {
    // これもuseEffect内でやる必要があるかもしれない
    gameStateContext.setGameState('ModeSelect');
    cancelTimer();
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key;

    if (key === 'Escape') {
      cancelTyping();
      return;
    }
  }

  // 初回レンダリング終了時にタイマーをスタートさせる
  useEffect(() => {
    startTimer();
  }, []);

  useEffect(() => {
    addEventListener('keydown', handleKeyDown);

    return () => { removeEventListener('keydown', handleKeyDown) }
  });

  const progressPercentage = 12.3;

  return (
    <>
      <div className='row'>
        <div className='col-4 d-flex'>
          <div className='progress align-self-center h-50 w-100'>
            <div className='progress-bar progress-bar-striped progress-bar-animated bg-primary' role='progressbar' style={{ width: `${progressPercentage}%` }} aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}>
              {progressPercentage.toFixed(1)}%
            </div>
          </div>
        </div>
        <div className='col-3 offset-5'>
          <TimerPane elapsedTimeMilli={elapsedTime} />
        </div>
      </div>

      <div className='row mt-3 mx-0'>
        <div className='col-12'>
          view_pane
        </div>
      </div>

      <div className='row mt-3 mx-0'>
        <div className='col-12'>
          key_stroke_pane
        </div>
      </div>
    </>
  );
}
