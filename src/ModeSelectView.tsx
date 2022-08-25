import _, { useState, useEffect, useContext } from 'react';

import { SelectDictionaryPane } from './SelectDictionaryPane';

import { useLibrary } from './useLibrary';

import { GameStateContext } from './App';

const LAP_LENGTH = 50;

export function ModeSelectView() {
  const [keyStrokeCountThreshold, setKeyStrokeCountThreshold] = useState<number>(LAP_LENGTH * 3);

  const gameStateContext = useContext(GameStateContext);

  // NOTE: 分割代入を使っていこう cf. <https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment>
  const [{ usedDictionaryType, usedDictionaryNames, availableDictionaries }, libraryOperator] = useLibrary();

  const canStart = () => {
    return usedDictionaryNames.length !== 0;
  }

  const confirmReady = () => {
    if (!canStart()) {
      return;
    }

    libraryOperator({ type: 'keyStrokeCountThreshold', keyStrokeCountThreshold: keyStrokeCountThreshold });
    libraryOperator({ type: 'confirmQuery' });
    gameStateContext.setGameState('TransitionToTyping');
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key;

    if (key === ' ') {
      confirmReady();
    }
  }

  useEffect(() => {
    addEventListener('keydown', handleKeyDown);

    return () => { removeEventListener('keydown', handleKeyDown) }
  });

  const WORD_TOOLTIP_TEXT = `辞書（.tconciergew形式のファイル）に含まれる単語からいくつかランダムに選びます。\n文章との併用はできません。`;
  const SENTENCE_TOOLTIP_TEXT = `辞書（.tconcierges形式のファイル）に含まれる文章からランダムに選びます。\n単語との併用はできません。`

  const KEY_STROKE_THRESHOLD_TOOLTIP_TEXT = 'ローマ字を何文字打ったらゲームが終了するかというタイプ数です。\n平均的な人だと1分間に150から250タイプできるとされているので、1分間のゲームをしたい場合にはこれくらいの値にすると良いです。';

  return (
    <div className='w-100 vh-100 d-flex flex-row justify-content-center'>
      <div className='w-50 d-flex flex-column justify-content-center'>
        <div className='row mb-1'>
          <div className='p-0 d-flex w-100'>

            <div className='p-0 d-flex bg-white'>
              <div className='btn-group'>
                <label className={`btn ${usedDictionaryType == 'word' ? 'btn-secondary' : 'btn-outline-secondary'} text-dark border border-secondary border-2`} data-bs-toggle='tooltip' data-bs-placement='top' title={WORD_TOOLTIP_TEXT}>
                  単語<input type='radio' className='btn-check' onClick={() => libraryOperator({ type: 'type', dictionaryType: 'word' })} />
                </label>

                <label className={`btn ${usedDictionaryType == 'sentence' ? 'btn-secondary' : 'btn-outline-secondary'} text-dark border border-secondary border-2 border-start-0`} data-bs-toggle='tooltip' data-bs-placement='top' title={SENTENCE_TOOLTIP_TEXT}>
                  文章<input type='radio' className='btn-check' onClick={() => libraryOperator({ type: 'type', dictionaryType: 'sentence' })} />
                </label>
              </div>
            </div>

            <div className='p-0 pt-2 d-flex justify-content-end ms-auto'>
              <button className='btn btn-sm btn-outline-success' onClick={() => { libraryOperator({ type: 'load' }); }}><i className='bi bi-arrow-clockwise'></i></button>
            </div>
          </div>
        </div>

        <div className='h-25 row p-2 border border-secondary rounded-3 border-2 bg-white'>
          <SelectDictionaryPane availableDictionaryList={availableDictionaries} usedDictionaryList={usedDictionaryNames} libraryOperator={libraryOperator} />
        </div>

        {
          usedDictionaryType == 'word'
            ? (
              <div className='row d-flex justify-content-center mt-2'>
                <div className='d-flex justify-content-center'>
                  <label className='form-label w-75 d-flex'>
                    <input type='range' className='form-range w-75' min={LAP_LENGTH} max={600} step={LAP_LENGTH} value={keyStrokeCountThreshold} onChange={e => setKeyStrokeCountThreshold(Number(e.target.value))} />
                    <span className='fs-6 text-nowrap ms-auto'>{keyStrokeCountThreshold}<i className='bi bi-question-circle' data-bs-toggle='tooltip' data-bs-placement='top' title={KEY_STROKE_THRESHOLD_TOOLTIP_TEXT} /></span>
                  </label>
                </div>
              </div>
            )
            : undefined
        }

        <div className='row d-flex justify-content-center mt-3'>
          <div className='col-6 d-flex justify-content-center'>
            <button onClick={confirmReady} className='btn btn-lg btn-primary' disabled={!canStart()}>Start</button>
          </div>
        </div>
      </div>
    </div>
  );
}
