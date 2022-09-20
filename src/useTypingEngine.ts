import _, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

export function useTypingEngine(onFinished: () => void): [DisplayInfo | null, () => void, (arg0: string, arg1: number) => void] {
  const [displayInfo, setDisplayInfo] = useState<DisplayInfo | null>(null);


  const startGame = () => {
    invoke<DisplayInfo>('start_game').then(returned => setDisplayInfo(returned));
  }

  const onInput = (c: string, elapsedTime: number) => {
    invoke<[boolean, DisplayInfo]>('stroke_key', { keyStrokeInfo: { key: c, elapsedTime: elapsedTime } })
      .then(returned => {
        setDisplayInfo(returned[1]);
        if (returned[0]) {
          onFinished();
        }
      })
      .catch(e => console.log(e));
  }

  return [displayInfo, startGame, onInput]
}
