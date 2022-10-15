import _, { useEffect, useRef } from 'react';
import { ResponsiveCanvas } from './ResponsiveCanvas';

export function ViewPane(props: { viewDisplayInfo: ViewDisplayInfo }): JSX.Element {
  const viewDisplayInfo = props.viewDisplayInfo;

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  };

  return (
    <div className='w-100 h-100 p-2 border border-secondary border-3 rounded-3 bg-white' >
      <ResponsiveCanvas sensitivity={[viewDisplayInfo]} draw={draw} />
    </div>
  );
}
