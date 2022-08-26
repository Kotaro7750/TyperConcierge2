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

// カーソル位置が配列になっているのは複数文字からなるチャンクをまとめて入力する場合があるため
export function constructStyledStringElement(str: string, cursorPosition: number[], missedPosition: number[], lastPos: number): JSX.Element[] {
  const missedPositionDict: { [key: number]: boolean } = {};
  const cursorPositionDict: { [key: number]: boolean } = {};

  missedPosition.forEach(position => {
    missedPositionDict[position] = true;
  });

  let minCursorPosition = cursorPosition[0];
  cursorPosition.forEach(position => {
    minCursorPosition = position < minCursorPosition ? position : minCursorPosition;
    cursorPositionDict[position] = true;
  });

  let element: JSX.Element[] = [];

  for (let i = 0; i < str.length; ++i) {
    let cssClass;
    if (i in missedPositionDict) {
      cssClass = 'text-danger';
      // 半角スペースだけだとわかりにくい場合には下線を引く
      if (str[i] == ' ') {
        cssClass += ' text-decoration-underline';
      }
    } else if (i < minCursorPosition || lastPos < i) {
      cssClass = 'text-secondary';
    } else if (i in cursorPositionDict) {
      cssClass = 'text-primary';
      if (str[i] == ' ') {
        cssClass += ' text-decoration-underline';
      }
    } else {
      cssClass = '';
    }

    // 行の最初と最後にスペースがあるときに' 'としてしまうとレンダリングエンジンが消してしまう
    element.push(<span key={i} className={cssClass}>{str[i] == ' ' ? '\u00A0' : str[i]}</span>);
  }

  return element;
}
