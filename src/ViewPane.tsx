import _, { useEffect, useRef } from 'react';

export function ViewPane(props: { viewDisplayInfo: ViewDisplayInfo }): JSX.Element {
  const viewDisplayInfo = props.viewDisplayInfo;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (containerRef.current === null || canvasRef.current === null) {
      return;
    }

    // 実際のスタイル由来の値で設定しないとcanvasのサイズが無限に増殖し続けてしまう
    const containerComputedStyle = window.getComputedStyle(containerRef.current);

    const containerWidth = containerComputedStyle.width;
    const containerHeight = containerComputedStyle.height;

    console.log(containerWidth);
    console.log(containerHeight);

    canvasRef.current.width = Number(containerWidth.slice(0, -2));
    canvasRef.current.height = Number(containerHeight.slice(0, -2));

    canvasRef.current.style.width = containerWidth;
    canvasRef.current.style.height = containerHeight;

    let ctx = canvasRef.current.getContext('2d');
    if (ctx === null) {
      return;
    }


  }, [viewDisplayInfo, visualViewport.width, visualViewport.height]);


  return (
    <div className='mw-100 w-100 mh-100 h-100' ref={containerRef}>
      <canvas className='d-block w-100 h-100' ref={canvasRef} />
    </div>
  );
}
