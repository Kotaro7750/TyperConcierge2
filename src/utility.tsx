// TyperConciergeフォントでは非ASCII文字でもASCII文字と同じ幅になることがある
export function isMonoWidthFont(c: string) {
  if (/^[\x20-\x7E]*$/.test(c)) {
    return true;
  } else if (c == '’' || c == '”') {
    return true;
  } else {
    return false;
  }
}

export function calcLineWindowIndex(lineCount: number, lineWindowCapacity: number, currentLineIndex: number): [number, number] {
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


export function constructCharacterStyleInformation(str: string, cursorPositions: number[], missedPositions: number[], lastPosition: number): [CharacterStyleInformation[], number] {
  const missedPositionDict: { [key: number]: boolean } = {};
  const cursorPositionDict: { [key: number]: boolean } = {};

  missedPositions.forEach(position => {
    missedPositionDict[position] = true;
  });

  let minCursorPosition = cursorPositions[0];
  cursorPositions.forEach(position => {
    minCursorPosition = position < minCursorPosition ? position : minCursorPosition;
    cursorPositionDict[position] = true;
  });

  let charStyleInfos: CharacterStyleInformation[] = [];

  [...str].forEach((c, i) => {
    const element: CharacterStyleInformation = {
      c: c,
      isWrong: i in missedPositionDict,
      cursorRelative: i in cursorPositionDict ? 'onCursor' : i < minCursorPosition ? 'before' : 'after',
      isOutRange: lastPosition < i,
    };

    charStyleInfos.push(element);
  });

  return [charStyleInfos, minCursorPosition];
}


export function constructCanvasLine(charStyleInfos: CharacterStyleInformation[], minCursorPosition: number, canvasWidth: number, doubleCharacterWidth: number)
  : [CharacterStyleInformationForCanvas[][], number] {

  const monoCharacterWidth = Math.floor(doubleCharacterWidth / 2);

  const lines: CharacterStyleInformationForCanvas[][] = [];
  let line: CharacterStyleInformationForCanvas[] = [];

  let x = 0;
  let cursorLineIndex = 0;
  charStyleInfos.forEach((charStyleInfo, i) => {
    const element: CharacterStyleInformationForCanvas = {
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
    if ((isLineEnd || i == (charStyleInfos.length - 1)) && charStyleInfo.c == ' ') {
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

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.stroke();
}
