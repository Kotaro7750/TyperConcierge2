import _, { useEffect, useContext, useRef } from 'react';
import { TimerPane } from './TimerPane';
import { OldViewPane } from './OldViewPane';
import { KeyStrokePane } from './KeyStrokePane';

import { GameStateContext } from './App';

import { useMilliSecondTimer } from './useMilliSecondTimer';
import { useTypingEngine } from './useTypingEngine';

export function TypingView() {
  const [elapsedTime, startTimer, stopTimer, cancelTimer] = useMilliSecondTimer();
  const [displayInfo, startGame, handleInput] = useTypingEngine(() => { stopTimer(); gameStateContext.setGameState('Finished'); });
  const isStarted = useRef(false);

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

    // ShiftとかAltとかの特殊文字を防ぐために長さでバリデーションをかける
    // 本当はもっといいやり方があるはず
    if (key.length == 1 && ' '.charCodeAt(0) <= key.charCodeAt(0) && key.charCodeAt(0) <= '~'.charCodeAt(0)) {
      handleInput(key, elapsedTime);
    }
  }

  // 初回レンダリング終了時にタイマーをスタートさせる
  useEffect(() => {
    if (isStarted.current === false) {
      startGame();
      startTimer();

      isStarted.current = true;
    }
  }, []);

  useEffect(() => {
    addEventListener('keydown', handleKeyDown);

    return () => { removeEventListener('keydown', handleKeyDown) }
  });

  if (displayInfo === null) {
    return (<></>);
  }

  const viewDisplayInfo = displayInfo.view;
  const keyStrokeDisplayInfo = displayInfo.keyStroke;

  const progressPercentage = keyStrokeDisplayInfo.progress * 100;

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
          <OldViewPane viewDisplayInfo={viewDisplayInfo} />
        </div>
      </div>

      <div className='row mt-3 mx-0'>
        <div className='col-12'>
          <KeyStrokePane keyStrokeDisplayInfo={keyStrokeDisplayInfo} />
        </div>
      </div>
    </>
  );
}
