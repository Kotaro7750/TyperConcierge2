import _, { useState } from 'react';

export function StartSignal(props: { countdownTimer: number }): JSX.Element {
  const countdownTimerInt = Math.ceil(props.countdownTimer);
  const [initialCount] = useState(props.countdownTimer);

  // 少し汚いがCSSのプロパティを動的に設定することでアニメーションを実現する
  const r = '15%';
  const circumference = `calc(2 * ${Math.PI.toString()} * ${r})`;
  // 円周の経過時間/設定時間だけオフセットする(空白になる)
  // -1をかけているのは空白の回る方向を右回りにするため
  const strokeDashOffset = `calc(-1 * calc(${circumference} - ${props.countdownTimer} * (${circumference} / ${initialCount})))`;

  return (
    <div className='h-100 w-100 d-flex justify-content-center'>

      {/* positionがabsoluteなのでレイアウトから外れる */}
      <div className='timer-time position-absolute start-50 top-50 translate-middle'>
        <span className='fs-1 text-primary'>
          {countdownTimerInt}
        </span>
      </div>

      <svg className='svg-squre' xmlns='http://www.w3.org/2000/svg'>
        <g>
          <circle className='timer-circle' r={r} strokeDasharray={circumference} strokeDashoffset={strokeDashOffset} />
        </g>
      </svg>
    </div>
  );
}
