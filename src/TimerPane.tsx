import _ from 'react';

export function TimerPane(props: { elapsedTimeMilli: number }): JSX.Element {
  const elapsedTimeS = props.elapsedTimeMilli / 1000;
  return (
    <div className='row'>
      <div className='col-12 fs-1 text-end'>
        <i className='bi bi-stopwatch' /> {elapsedTimeS.toFixed(2)}
      </div>
    </div>
  );
}
