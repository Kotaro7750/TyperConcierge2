import { useState, useRef, useEffect } from 'react';

const PRECISION_MS = 10;

export function useMilliSecondTimer(): [number, () => void, () => void, () => void] {
  type TimerState = 'Ready' | 'Started' | 'Stopped';

  const startDate = useRef<Date>(new Date());

  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [timerState, setTimerState] = useState<TimerState>('Ready');

  useEffect(() => {
    if (timerState == 'Ready') {
      setElapsedTime(0);
    }

    let timerId: number;

    if (timerState == 'Started') {
      timerId = setInterval(() => {
        const currentDate = new Date();

        setElapsedTime(currentDate.getTime() - startDate.current.getTime());
      }, PRECISION_MS);
    }

    return () => {
      if (timerId != undefined) {
        clearInterval(timerId)
      }
    };
  }, [timerState]);

  function startTimer(): void {
    startDate.current = new Date();
    setTimerState('Started');
  }

  function stopTimer(): void {
    setTimerState('Stopped');
  }

  function cancelTimer(): void {
    setTimerState('Ready');
  }

  return [elapsedTime, startTimer, stopTimer, cancelTimer];
}
