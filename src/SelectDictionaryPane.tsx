import React from 'react';

export function SelectDictionaryPane(props: { availableDictionaryList: DictionaryInfo[], usedDictionaryList: [DictionaryOrigin, string][], libraryOperator: (action: LibraryOperatorActionType) => void }): JSX.Element {
  const usedDictionaryOneHot = new Map<string, boolean>(props.usedDictionaryList.map(e => [`${e[0]} ${e[1]}`, true]));

  const elem: JSX.Element[] = [];

  // 辞書リストのそれぞれの辞書をトグルしたときのハンドラ
  function onChange(e: React.ChangeEvent<HTMLInputElement>, dictionaryName: string, dictionaryOrigin: DictionaryOrigin) {
    if (e.target.checked) {
      props.libraryOperator({ type: 'use', dictionaryName: dictionaryName, dictionaryOrigin: dictionaryOrigin });
    } else {
      props.libraryOperator({ type: 'disuse', dictionaryName: dictionaryName, dictionaryOrigin: dictionaryOrigin });
    }
  }

  const DISABLED_DICTIONARY_TOOLTIP_TEXT = '辞書に含まれる語彙がありません';
  const DICTIONARY_CONTAIN_ERROR_TOOLTIP_TEXT_BASE = '以下の行に無効な語彙があります';

  // 表示用に辞書をソートする
  // TODO ソート順がいろいろあると嬉しい
  const sortedAvailableDictionaryList = Array.from(props.availableDictionaryList).sort((a, b) => {
    const aName = a.name;
    const bName = b.name;
    if (aName < bName) {
      return -1;
    } else if (aName > bName) {
      return 1;
    } else {
      return 0;
    }
  });

  // 辞書リストのそれぞれの項目を構築
  sortedAvailableDictionaryList.forEach((dictionaryInfo: DictionaryInfo, i: number) => {
    const dictionaryName = dictionaryInfo.origin === 'user_defined' ? `${dictionaryInfo.name}` : `${dictionaryInfo.name}`;
    const enable = dictionaryInfo.validVocabularyCount !== 0;
    // XXX 文と単語の辞書の名前に被りがあった時に衝突しないか
    const used = usedDictionaryOneHot.has(`${dictionaryInfo.origin} ${dictionaryInfo.name}`);

    // 辞書に無効な語彙を含むときの警告文の生成
    let containErrorTooltipText = DICTIONARY_CONTAIN_ERROR_TOOLTIP_TEXT_BASE;
    dictionaryInfo.invalidLineNumberList.forEach(lineNum => {
      containErrorTooltipText = containErrorTooltipText.concat(`\r\n${lineNum}行目`);
    });

    const checkbox = (
      <label key={i} className={`d-flex text-break list-group-item w-100 btn ${used && 'active'} `}>
        <input className='btn-check' type='checkbox' value={dictionaryName} onChange={(e) => onChange(e, dictionaryInfo.name, dictionaryInfo.origin)} checked={used} disabled={!enable} />

        <span className={`text-start ${!enable && 'text-secondary'}`}>{dictionaryName}</span>

        <span className='ms-auto'>
          {dictionaryInfo.invalidLineNumberList.length != 0 ? <i className='bi bi-exclamation-triangle text-warning' data-bs-toggle='tooltip' data-bs-placement='top' title={containErrorTooltipText} /> : undefined}
          {!enable ? <i className='bi bi-x-circle text-danger' data-bs-toggle='tooltip' data-bs-placement='top' title={DISABLED_DICTIONARY_TOOLTIP_TEXT} /> : undefined}
        </span>
      </label>
    );

    elem.push(checkbox);
  });

  return (
    <div className='h-100 w-100 list-group overflow-auto'>
      {elem}
    </div>
  );
}
