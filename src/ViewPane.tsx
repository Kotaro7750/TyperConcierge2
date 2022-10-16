import _ from 'react';
import { ResponsiveCanvas } from './ResponsiveCanvas';
import { constructCharacterStyleInformation, isMonoWidthFont } from './utility';

type CharacterStyleInformationForViewPane = CharacterStyleInformation & {
  x: number,
  explicitSpace: boolean
}

function ConstructLinesFromViewPane(charStyleInfos: CharacterStyleInformation[], minCursorPosition: number, canvasWidth: number, doubleCharacterWidth: number)
  : [CharacterStyleInformationForViewPane[][], number] {

  const monoCharacterWidth = Math.floor(doubleCharacterWidth / 2);

  const lines: CharacterStyleInformationForViewPane[][] = [];
  let line: CharacterStyleInformationForViewPane[] = [];

  let x = 0;
  let cursorLineIndex = 0;
  charStyleInfos.forEach((charStyleInfo, i) => {
    const element: CharacterStyleInformationForViewPane = {
      ...charStyleInfo,
      x: x,
      explicitSpace: charStyleInfo.c == ' ' && (charStyleInfo.cursorRelative === 'onCursor' || charStyleInfo.isWrong || x == 0),
    };

    if (i == minCursorPosition) {
      cursorLineIndex = lines.length;
    }

    x += isMonoWidthFont(charStyleInfo.c) ? monoCharacterWidth : doubleCharacterWidth;

    let isLineEnd = (x + doubleCharacterWidth) > canvasWidth;
    // 行末のスペースは分かるようにする
    if (isLineEnd && charStyleInfo.c == ' ') {
      element.explicitSpace = true;
    }

    line.push(element);

    if (isLineEnd) {
      x = 0;

      lines.push(line);
      line = [];
    }
  });

  if (line.length != 0) {
    lines.push(line);
  }

  return [lines, cursorLineIndex];
}

function CalcLineWindowIndex(lineCount: number, lineWindowCapacity: number, currentLineIndex: number): [number, number] {
  if (lineCount <= lineWindowCapacity) {
    return [0, lineCount - 1];
  }

  // 現在カーソルが当たっている行を中心にしてウィンドウを設定する
  let topIndex = Math.max(currentLineIndex - Math.floor((lineWindowCapacity - 1) / 2), 0);
  let bottomIndex = topIndex + lineWindowCapacity - 1;

  if (lineCount <= (bottomIndex + 1)) {
    bottomIndex = lineCount - 1;
    topIndex = bottomIndex - lineWindowCapacity + 1;
  }

  return [topIndex, bottomIndex];
}

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
    const [lines, cursorLineIndex] = ConstructLinesFromViewPane(charStyleInfos, minCursorPosition, width, doubleCharacterWidth);

    const lineWindowCapacity = Math.floor(lineWindowHeight / yDelta);

    const [windowTopIndex, windowBottomIndex] = CalcLineWindowIndex(lines.length, lineWindowCapacity, cursorLineIndex);

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
