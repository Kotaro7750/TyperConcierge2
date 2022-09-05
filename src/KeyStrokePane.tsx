import _ from 'react';

import { LineWindow } from './LineWindow';

import { constructStyledStringElement } from './utility';

function LapLine(props: { styledStringElementList: JSX.Element[], lapTimeMS: number }): JSX.Element {
  const lapTimeStr = props.lapTimeMS == 0 ? '' : (props.lapTimeMS / 1000).toFixed(3);

  return (
    <div className='row me-0 my-1'>
      <div className='col-11'>
        <span className='fs-3'>
          {props.styledStringElementList}
        </span>
      </div>
      <div className='p-0 d-flex justify-content-center align-items-center col-1 border border-secondary border-2 rounded-3 text-center bg-white'>
        <span className='align-middle'>{lapTimeStr}</span>
      </div>
    </div>
  );
}

export function KeyStrokePane(props: { keyStrokeDisplayInfo: KeyStrokeDisplayInfo }) {
  const { key_stroke: keyStroke, current_cursor_position: currentCursorPosition, missed_positions: missedPositions } = props.keyStrokeDisplayInfo;
  const styledStringElementList = constructStyledStringElement(keyStroke, [currentCursorPosition], missedPositions, keyStroke.length - 1);

  const lapEndPos: number[] = [];
  const lapElapsedTime: number[] = [];

  let currentLapIndex = 0;

  // 連想検索をしやすくするためにMapを使う
  // ついでにラップの終了位置とカーソル位置を使って現在何番目のラップかを計算する
  const lapEndPosDict = new Map<number, boolean>();
  lapEndPos.forEach(pos => {
    lapEndPosDict.set(pos, true);

    // ラップの終了位置はソートされていることが前提
    if (currentCursorPosition > pos) {
      currentLapIndex++;
    }
  });

  // ラップの情報を基に実際に表示する要素を作る
  const lapLineList: JSX.Element[] = [];
  let inLapLineElem: JSX.Element[] = [];
  let previousLapEndElapsedTime: number = 0;

  styledStringElementList.forEach((elem, i) => {
    inLapLineElem.push(elem);

    // この要素がラップの最後だったら表示要素を構築する
    if (lapEndPosDict.has(i)) {
      const lapIndex = lapLineList.length;
      // ラップタイムは確定してから配列に格納されるのでまだない場合もある
      const lapTimeMS = lapIndex > lapElapsedTime.length - 1 ? 0 : lapElapsedTime[lapIndex] - previousLapEndElapsedTime;

      previousLapEndElapsedTime = lapElapsedTime[lapIndex];
      lapLineList.push(<LapLine styledStringElementList={inLapLineElem} lapTimeMS={lapTimeMS} />);

      inLapLineElem = [];
    }
  });

  // 飛び出した要素があるなら追加する
  if (inLapLineElem.length != 0) {
    lapLineList.push(<LapLine styledStringElementList={inLapLineElem} lapTimeMS={0} />);
  }

  return (
    <div className='row border border-secondary border-3 rounded-3 bg-white min-vh-40'>
      <LineWindow lineList={lapLineList} currentLineIndex={currentLapIndex} windowCapacity={5} />
    </div>
  );
}
