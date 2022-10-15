import _, { useEffect, useRef } from 'react';

export function ResponsiveCanvas(props: { sensitivity: any[], draw: (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => void }): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (containerRef.current === null || canvasRef.current === null) {
      return;
    }

    canvasRef.current.width = containerRef.current.clientWidth;
    canvasRef.current.height = containerRef.current.clientHeight;

    let ctx = canvasRef.current.getContext('2d');
    if (ctx === null) {
      return;
    }

    props.draw(ctx, canvasRef.current.width, canvasRef.current.height);
  }, [visualViewport.width, visualViewport.height]);

  useEffect(() => {
    if (canvasRef.current === null) {
      return;
    }

    let ctx = canvasRef.current.getContext('2d');
    if (ctx === null) {
      return;
    }

    props.draw(ctx, canvasRef.current.width, canvasRef.current.height);
  }, props.sensitivity);

  return (
    <div className='w-100 h-100 p-0' ref={containerRef} >
      <canvas className='d-block w-100 h-100' ref={canvasRef} />
    </div>
  );
}
