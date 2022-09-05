import _ from 'react';

// LineWindowで表示する行のインデックスを計算する
// [開始インデックス,ウィンドウ内での現在の行のインデックス,終了インデックス]
// windowCapacityが奇数ならcurrentIndexから上下対象に表示する
// Ex. windowCapacityが5でcurrentIndexが2なら0,1,2,3,4行目を表示する
// windowCapacityが偶数ならcurrentIndexの後を多く表示する
// Ex. windowCapacityが4でcurrentIndexが2なら1,2,3,4行目を表示する
export function calcWindowInfo(listLen: number, currentLineIndex: number, windowCapacity: number): [number, number, number] {
  const filledLineListLen = listLen > windowCapacity ? listLen : windowCapacity;
  // 表示ウィンドウの両端を決定する
  let firstLineIndex = currentLineIndex - (windowCapacity % 2 == 1 ? Math.floor(windowCapacity / 2) : (windowCapacity / 2 - 1));
  let lastLineIndex = currentLineIndex + Math.floor(windowCapacity / 2);

  // 表示ウィンドウが要素リストからはみ出るときの補正
  // 空の要素で埋めているため両方向に同時にはみ出ることはない
  if (firstLineIndex < 0) {
    const offset = Math.round(-1 * firstLineIndex);
    firstLineIndex += offset;
    lastLineIndex += offset;
  } else if (lastLineIndex > (filledLineListLen - 1)) {
    const offset = Math.round(lastLineIndex - (filledLineListLen - 1));
    firstLineIndex -= offset;
    lastLineIndex -= offset;
  }


  return [firstLineIndex, currentLineIndex - firstLineIndex, lastLineIndex];
}

// 行リストの中からcurrentLineIndexの周辺のwindowCapacity行だけ表示する
export function LineWindow(props: { lineList: JSX.Element[], currentLineIndex: number, windowCapacity: number }): JSX.Element {

  // windowCapacityよりも要素数が少ない場合には空の要素で埋める
  let filledLineList = Array.from(props.lineList);

  if (filledLineList.length < props.windowCapacity) {
    const shortageCount = props.windowCapacity - filledLineList.length;
    // 埋める要素は存在すればなんでもいい
    const shortageFiller = (new Array(shortageCount)).fill(<div></div>);

    filledLineList = filledLineList.concat(shortageFiller);
  }

  // 埋められた空の要素に対しても同じ高さを維持するために手動でCSSのflex:1を適用する
  filledLineList = filledLineList.map((elem, i) => <div key={i} style={{ flex: 1 }} className='w-100'>{elem}</div>);

  // ウィンドウ端インデックスを計算
  const [firstLineIndex, _, lastLineIndex] = calcWindowInfo(filledLineList.length, props.currentLineIndex, props.windowCapacity);

  // 表示ウィンドウ内にある行だけを抽出
  const activeLineList = filledLineList.filter((_, i) => {
    return firstLineIndex <= i && i <= lastLineIndex;
  });

  const lineCountAfterWindow = (filledLineList.length - 1) - lastLineIndex;

  return (
    <div className='w-100 h-100 d-flex flex-column justify-content-between'>
      {activeLineList}
      {lineCountAfterWindow != 0 ? <div className='fs-6 d-flex justify-content-center'><i className="bi bi-chevron-double-down"></i>{lineCountAfterWindow}行</div> : undefined}
    </div>
  )
}
