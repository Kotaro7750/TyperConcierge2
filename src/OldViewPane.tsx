import _, { useRef, useEffect } from 'react';

import { LineWindow, calcWindowInfo } from './LineWindow';
import { constructStyledStringElement, isMonoWidthFont } from './utility';

export function OldViewPane(props: { viewDisplayInfo: ViewDisplayInfo }): JSX.Element {
  const { view, current_cursor_positions: currentCursorPositions, missed_positions: missedPositions, last_potion: lastPosition } = props.viewDisplayInfo;
  const currentCursorPositionsMin = Math.min(...currentCursorPositions);

  const elemList = constructStyledStringElement(view, currentCursorPositions, missedPositions, lastPosition);

  const lineList: JSX.Element[] = [];
  let inLineElemList: JSX.Element[] = [];
  // 行の中での累計単位文字数
  // 累計単位文字数とはASCII文字を1、非ASCII文字を2として計算する
  // TyperConciergeフォントでは非ASCII文字はASCII文字の2倍の幅を取るのでこのように設定している
  let inLineUnitCount = 0;

  const limitASCIICount = useRef<number>(60);
  let currentLineIndex = 0;
  let inCurrentLineIndexCursorPos = 0;

  for (let i = 0; i < elemList.length; ++i) {
    inLineElemList.push(elemList[i]);
    const c = view[i];
    inLineUnitCount += (isMonoWidthFont(c) ? 1 : 2);

    // カーソルが複数文字にまたがる場合には前にあるカーソル位置がある行を現在の行とする
    if (i == currentCursorPositionsMin) {
      currentLineIndex = lineList.length;
      inCurrentLineIndexCursorPos = inLineElemList.length - 1;
    }

    if (inLineUnitCount >= limitASCIICount.current) {
      // 字数一杯に詰まった行は左右揃えで文字の間で余白を調整する
      lineList.push(<div className='d-flex justify-content-between'>{inLineElemList.map(e => e)}</div>);
      inLineElemList = [];
      inLineUnitCount = 0;
    }
  }

  if (inLineElemList.length != 0) {
    // 最終行は字数が余っている可能性があるので左揃えにする
    lineList.push(<div className='d-flex justify-content-start'>{inLineElemList.map(e => e)}</div>);
  }

  const WINDOW_LINE_CAPACITY = 4;


  // ボックスの幅と文字幅を動的に取得して横にASCII文字を何文字詰められるかを計算する
  const boxDOMRef = useRef<HTMLDivElement>(null);

  // 各レンダリング終了時に1文字目の幅を取得する
  // タイピング中に画面サイズを変更しても適切に処理してくれる
  useEffect(() => {
    const [_, inWindowCurrentLineIndex] = calcWindowInfo(lineList.length, currentLineIndex, WINDOW_LINE_CAPACITY);

    // 少し汚いが直前のレンダリング時点でのカーソル位置にある文字のspan要素を取得している
    // div -> LineWindowの最上位div -> LineWindowの行に被せているdiv -> QueryPaneで行に被せているdiv -> span
    // 初回レンダリング以外は文字はあると仮定している
    const span = boxDOMRef.current ? boxDOMRef.current.children[0].children[inWindowCurrentLineIndex].children[0].children[inCurrentLineIndexCursorPos] : null;

    if (span == null) {
      throw new Error(`failed to get ref of span`);
    }

    const spanWidth = span.getBoundingClientRect().width;
    const unitWidth = isMonoWidthFont(view[currentCursorPositionsMin]) ? spanWidth : spanWidth / 2;
    // ボックスからパディングを抜いた幅を取得
    // デフォルトの値は何でもいいはずだが手元での値にしておいた
    const boxDOMWidth = boxDOMRef.current ? boxDOMRef.current.clientWidth - parseFloat(getComputedStyle(boxDOMRef.current).paddingLeft) - parseFloat(getComputedStyle(boxDOMRef.current).paddingRight) : 846;

    // 多少余白が増えても折り返されたりオーバーフローするのを避けるために安全マージンとして2文字分だけ少なく設定する
    limitASCIICount.current = Math.floor(boxDOMWidth / unitWidth) - 2;

    // 毎回のレンダリング後に処理を走らせないようにするために依存リストを少なめにしているので良くないかもしれない
  }, [visualViewport.width, currentLineIndex, inCurrentLineIndexCursorPos, WINDOW_LINE_CAPACITY]);

  return (
    <div className='row'>
      <div className='col-12 border border-secondary border-3 rounded-3 fs-3 bg-white vh-30' ref={boxDOMRef}>
        <LineWindow lineList={lineList} currentLineIndex={currentLineIndex} windowCapacity={WINDOW_LINE_CAPACITY} />
      </div>
    </div>
  )
}
