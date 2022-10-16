import _ from 'react';

import { ResponsiveCanvas } from './ResponsiveCanvas';

import { constructCanvasLine, constructCharacterStyleInformation, calcLineWindowIndex, roundRect } from './utility';

function splitByLap(charStyleInfos: CharacterStyleInformation[], minCursorPosition: number, lapEndPositions: number[], lapEndTimes: number[])
  : [CharacterStyleInformation[][], number[], number, number] {
  let currentLapIndex = 0;

  const lapEndPosDict = new Map<number, boolean>();
  lapEndPositions.forEach(pos => {
    lapEndPosDict.set(pos, true);

    // ラップの終了位置はソートされていることが前提
    if (minCursorPosition > pos) {
      currentLapIndex++;
    }
  });

  let inLapCharStyleInfos: CharacterStyleInformation[] = [];
  const lapCharStyleInfos: CharacterStyleInformation[][] = [];

  const lapTimes: number[] = [];
  let previousLapEndElapsedTime: number = 0;

  charStyleInfos.forEach((elem, i) => {
    inLapCharStyleInfos.push(elem);

    // この要素がラップの最後だったら表示要素を構築する
    if (lapEndPosDict.has(i)) {
      const lapIndex = lapCharStyleInfos.length;
      // ラップタイムは確定してから配列に格納されるのでまだない場合もある
      const lapTimeMS = lapIndex > lapEndTimes.length - 1 ? 0 : lapEndTimes[lapIndex] - previousLapEndElapsedTime;
      lapTimes.push(lapTimeMS);

      previousLapEndElapsedTime = lapEndTimes[lapIndex];
      lapCharStyleInfos.push(inLapCharStyleInfos);

      inLapCharStyleInfos = [];
    }
  });

  if (inLapCharStyleInfos.length != 0) {
    lapCharStyleInfos.push(inLapCharStyleInfos);
    lapTimes.push(0);
  }

  const inLapMinCursorPosition = lapCharStyleInfos[currentLapIndex].findIndex((charStyleInfo) => { return charStyleInfo.cursorRelative == 'onCursor' });

  return [lapCharStyleInfos, lapTimes, currentLapIndex, inLapMinCursorPosition]
}

export function KeyStrokePane(props: { keyStrokeDisplayInfo: KeyStrokeDisplayInfo }) {
  const { keyStroke, currentCursorPosition, missedPositions, lapEndTime, lapEndPositions } = props.keyStrokeDisplayInfo;

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const [charStyleInfos, minCursorPosition] = constructCharacterStyleInformation(keyStroke, [currentCursorPosition], missedPositions, keyStroke.length - 1);
    const [lapCharStyleInfos, lapTimes, currentLapIndex, inLapMinCursorPosition] = splitByLap(charStyleInfos, minCursorPosition, lapEndPositions, lapEndTime);

    ctx.clearRect(0, 0, width, height);

    const lineWindowWidth = Math.floor(width * 0.8);

    const doubleCharacterWidth = Math.min(Math.floor(lineWindowWidth / 30), 40);

    ctx.font = `${doubleCharacterWidth}px TyperConciergeFont`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'start';

    const measure = ctx.measureText('あ');
    const characterHeight = measure.actualBoundingBoxDescent - measure.actualBoundingBoxAscent;

    const yDelta = Math.ceil(characterHeight * 1.5);
    const lineWindowHeight = height - 20;

    const lines: CharacterStyleInformationForCanvas[][] = [];
    // [行の所属するラップのインデックス, 行を含めてそのラップには残り何行あるか]
    const lapOfLines: [number, number][] = [];

    let cursorLineIndex = 0;

    lapCharStyleInfos.forEach((lapCharStyleInfo, i) => {
      const [inLapLines, inLapCursorLineIndex] = constructCanvasLine(lapCharStyleInfo, i == currentLapIndex ? inLapMinCursorPosition : 0, lineWindowWidth, doubleCharacterWidth);

      for (let remainedLine = inLapLines.length; remainedLine >= 1; remainedLine--) {
        lapOfLines.push([i, remainedLine]);
      }

      if (i == currentLapIndex) {
        cursorLineIndex = lines.length + inLapCursorLineIndex;
      }
      lines.push(...inLapLines);
    });

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

    let y = 0;
    for (let lineIdx = windowTopIndex; lineIdx <= windowBottomIndex;) {
      const [lapIndex, lineCount] = lapOfLines[lineIdx];

      const rectangleWidth = Math.floor((width - lineWindowWidth) * 0.8);
      const rectangleUpperLeftX = lineWindowWidth + Math.floor((width - lineWindowWidth) * 0.1);
      const rectangleHeight = Math.floor(characterHeight - 2 + (Math.min(lineCount, windowBottomIndex - lineIdx + 1) - 1) * yDelta);
      const rectangleUpperLeftY = y + 2;

      ctx.strokeStyle = 'rgba(206, 222, 243, 1)';
      ctx.lineWidth = 2;
      roundRect(ctx, rectangleUpperLeftX, rectangleUpperLeftY, rectangleWidth, rectangleHeight, 3);

      ctx.font = '18px TyperConciergeFont';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(15, 37, 64, 1)';

      const lapTimeText = lapTimes[lapIndex] == 0 ? '' : `${(lapTimes[lapIndex] / 1000).toFixed(3)}秒`;
      ctx.fillText(lapTimeText, rectangleUpperLeftX + Math.floor(rectangleWidth / 2), rectangleUpperLeftY + Math.floor(rectangleHeight / 2));

      y += yDelta * lineCount;
      lineIdx += lineCount;
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
    <div className='w-100 h-100 p-2 border border-secondary border-3 rounded-3 bg-white'>
      <ResponsiveCanvas sensitivity={[props.keyStrokeDisplayInfo]} draw={draw} />
    </div>
  );
}
