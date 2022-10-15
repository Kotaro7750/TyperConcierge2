import _ from 'react';

export function TimerPane(props: { elapsedTimeMilli: number }): JSX.Element {
  const elapsedTimeS = props.elapsedTimeMilli / 1000;
  return (
    <div className='w-100 fs-1 text-end'>
      <i className='bi bi-stopwatch' /> {elapsedTimeS.toFixed(2)}
    </div>
  );
}
