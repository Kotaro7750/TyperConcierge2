import _, { useEffect, useContext, useRef } from 'react';
import { StartSignal } from './StartSignal';
import { useCountdownTimer } from './useCountdownTimer';
import { GameStateContext } from './App';

export function TransitionToTypingView() {
  const gameStateContext = useContext(GameStateContext);
  // カウントダウン終了のコールバックで直接タイピング画面に遷移させると警告が出るのでレンダリング後に呼ばせる
  // cf. <https://reactjs.org/blog/2020/02/26/react-v16.13.0.html#warnings-for-some-updates-during-render>
  const isStartTyping = useRef(false);

  const [countdownTimer, startCountdownTimer, initCountdownTimer] = useCountdownTimer(3, () => startTyping());

  const startTyping = () => {
    isStartTyping.current = true;
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key;

    if (key === 'Escape') {
      gameStateContext.setGameState('ModeSelect');
    }
  }

  useEffect(() => {
    addEventListener('keydown', handleKeyDown);

    return () => { removeEventListener('keydown', handleKeyDown) }
  });

  useEffect(() => {
    initCountdownTimer();
    startCountdownTimer();
  }, []);

  useEffect(() => {
    if (isStartTyping.current) {
      gameStateContext.setGameState('Typing');
    }
  });

  return (
    <div className='w-100 vh-100 d-flex flex-row justify-content-center'>
      <div className='w-50 d-flex flex-column justify-content-center'>
        <StartSignal countdownTimer={countdownTimer} />
      </div>
    </div>
  );
}
