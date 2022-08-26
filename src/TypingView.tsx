import _, { useEffect, useContext, useRef } from 'react';
import { TimerPane } from './TimerPane';

import { GameStateContext } from './App';

import { useMilliSecondTimer } from './useMilliSecondTimer';
import { useTypingEngine } from './useTypingEngine';
import { constructStyledStringElement } from './utility';

export function TypingView() {
  const [elapsedTime, startTimer, stopTimer, cancelTimer] = useMilliSecondTimer();
  const [displayInfo, startGame, handleInput] = useTypingEngine();
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
  const keyStrokeDisplayInfo = displayInfo.key_stroke;

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
          {constructStyledStringElement(viewDisplayInfo.view, viewDisplayInfo.current_cursor_positions, viewDisplayInfo.missed_positions, viewDisplayInfo.last_potion)}
        </div>
      </div>

      <div className='row mt-3 mx-0'>
        <div className='col-12'>
          {constructStyledStringElement(keyStrokeDisplayInfo.key_stroke, [keyStrokeDisplayInfo.current_cursor_position], keyStrokeDisplayInfo.missed_positions, keyStrokeDisplayInfo.key_stroke.length)}
        </div>
      </div>
    </>
  );
}
