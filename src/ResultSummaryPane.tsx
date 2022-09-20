import _, { useState } from 'react';

function SubContent(props: { title: string, content: string }): JSX.Element {
  return (
    <div className='w-100 h-100 d-flex flex-column align-items-center lh-sm'>
      <div className='text-secondary'>{props.title}</div>
      <div className='fs-3'>{props.content}</div>
    </div>
  );
}

export function ResultSummaryPane(props: { summary: TypingStatisticsSummary }): JSX.Element {
  const [isWordCountIdeal, setIsWordCountIdeal] = useState<boolean>(false);

  const summary = props.summary;
  const wordCount = isWordCountIdeal ? summary.idealWordCount : summary.inputWordCount;
  const accuracy = Math.max(0, wordCount - summary.missCount) * 1.0 / wordCount * 100;

  // WPMは切り捨て
  const wpm = Math.floor(wordCount * 60000 / summary.totalTime);

  // WPM x ( 正確率 )^3 の小数点以下切り捨て
  // 実際のeタイピングはwordCountとしてidealじゃなくて実際の打ったローマ字数を使っている
  const eTypingScore = Math.floor(wpm * (accuracy / 100) ** 3);

  const WORD_COUNT_IDEAL_HELP = 'オン:タイプ数が最も少なくなるようなローマ字系列の字数で計算します\
  \nオフ:実際にタイプしたローマ字系列の字数で計算します\
  \nEx. 「きょう」を「kilyou」と打った場合にはオンにすると4字（kyou）、オフにすると6字打ったことになります\
  \nオンにすると実際にタイプした文字数よりも少なくなるのでWPM・スコアは低くなります';


  return (
    <div className='d-flex flex-column w-100 h-100'>

      <div className='ms-2'>
        <div className='form-check form-switch'>
          <label className='form-check-label'>文字数として最短を使う
            <input className='form-check-input' type='checkbox' checked={isWordCountIdeal} onChange={() => setIsWordCountIdeal(prev => !prev)} />
          </label>
          <i className='bi bi-question-circle' data-bs-toggle='tooltip' data-bs-placement='top' title={WORD_COUNT_IDEAL_HELP} />
        </div>
      </div>

      <div className='flex-grow-1'>
        <div className='d-flex flex-column w-100 h-100'>
          <div className='d-flex flex-column w-100 h-100 justify-content-end align-items-center lh-1'>
            <div className='text-secondary'>スコア</div>
            <div className='text-primary display-1'>{eTypingScore}</div>
          </div>

          <div className='d-flex flex-column w-100 h-100 justify-content-center align-items-center lh-1'>
            <div className='text-secondary'><i className='bi bi-stopwatch' /></div>
            <div className='fs-2'>{(summary.totalTime / 1000).toFixed(3)}秒</div>
          </div>
        </div>
      </div>

      <div className='mt-auto d-flex justify-content-between mb-2'>
        <SubContent title={'WPM'} content={wpm.toString()} />
        <SubContent title={'正確性'} content={`${accuracy.toFixed(0)}%`} />
        <SubContent title={'ミスタイプ'} content={`${summary.missCount}回`} />
        <SubContent title={'字数'} content={`${wordCount}字`} />
      </div>
    </div>
  )
}
