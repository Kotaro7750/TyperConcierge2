import _ from 'react';
import { ResponsiveCanvas } from './ResponsiveCanvas';
import { constructCharacterStyleInformation, constructCanvasLine, calcLineWindowIndex } from './utility';

export function ViewPane(props: { viewDisplayInfo: ViewDisplayInfo }): JSX.Element {
  const viewDisplayInfo = props.viewDisplayInfo;

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    const doubleCharacterWidth = Math.min(Math.floor(width / 30), 40);

    ctx.font = `${doubleCharacterWidth}px TyperConciergeFont`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'start';

    const measure = ctx.measureText('あ');
    const characterHeight = measure.actualBoundingBoxDescent - measure.actualBoundingBoxAscent;

    const yDelta = Math.ceil(characterHeight * 1.5);
    const lineWindowHeight = height - 20;

    const [charStyleInfos, minCursorPosition] = constructCharacterStyleInformation(viewDisplayInfo.view, viewDisplayInfo.currentCursorPositions, viewDisplayInfo.missedPositions, viewDisplayInfo.lastPosition);
    const [lines, cursorLineIndex] = constructCanvasLine(charStyleInfos, minCursorPosition, width, doubleCharacterWidth);

    const lineWindowCapacity = Math.floor(lineWindowHeight / yDelta);

    const [windowTopIndex, windowBottomIndex] = calcLineWindowIndex(lines.length, lineWindowCapacity, cursorLineIndex);

    for (let lineIdx = windowTopIndex; lineIdx <= windowBottomIndex; lineIdx++) {
      for (const element of lines[lineIdx]) {
        if (element.isWrong) {
          ctx.fillStyle = 'rgba(221, 80, 64, 1)';
        } else if (element.cursorRelative == 'before' || element.isOutRange) {
          ctx.fillStyle = 'rgba(206, 222, 243, 1)';
        } else if (element.cursorRelative == 'onCursor') {
          ctx.fillStyle = 'rgba(88, 99, 248, 1)';
        } else {
          ctx.fillStyle = 'rgba(15, 37, 64, 1)';
        }

        if (element.explicitSpace) {
          ctx.fillText('⬚', element.x, yDelta * (lineIdx - windowTopIndex));
        } else {
          ctx.fillText(element.c, element.x, yDelta * (lineIdx - windowTopIndex));
        }
      }
    }

    if ((windowBottomIndex + 1) < lines.length) {
      ctx.font = '18px TyperConciergeFont';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(15, 37, 64, 1)';
      ctx.fillText(`︾${lines.length - (windowBottomIndex + 1)}行`, Math.floor(width / 2), lineWindowHeight);
    }

  };

  return (
    <div className='w-100 h-100 p-2 border border-secondary border-3 rounded-3 bg-white' >
      <ResponsiveCanvas sensitivity={[viewDisplayInfo]} draw={draw} />
    </div>
  );
}
