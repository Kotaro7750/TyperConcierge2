import _, { useEffect, useContext, useRef } from 'react';
import { TimerPane } from './TimerPane';
import { ViewPane } from './ViewPane';
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
    <div className='d-flex flex-column h-100 w-100'>
      <div className='d-flex justify-content-between w-100 px-4' style={{ flexBasis: 'min(10%, 67.5px)' }}>
        <div className='d-flex align-items-center h-100' style={{ flexBasis: '35%' }}>
          <div className='progress w-100 h-50'>
            <div className='progress-bar progress-bar-striped progress-bar-animated bg-primary' role='progressbar' style={{ width: `${progressPercentage}%` }} aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}>
              {progressPercentage.toFixed(1)}%
            </div>
          </div>
        </div>
        <div className='d-flex align-items-center'>
          <TimerPane elapsedTimeMilli={elapsedTime} />
        </div>
      </div>

      <div className='px-4 pb-4 overflow-hidden' style={{ flexBasis: '40%', flexGrow: 1 }}>
        <ViewPane viewDisplayInfo={viewDisplayInfo} />
      </div>

      <div className='px-4 pb-4 overflow-hidden' style={{ flexBasis: '40%', flexGrow: 1 }}>
        <KeyStrokePane keyStrokeDisplayInfo={keyStrokeDisplayInfo} />
      </div>
    </div>
  );
}
