export default function Progress({ value, label }) {
  const indeterminate = value == null;
  const pct = indeterminate ? 0 : Math.round(value * 100);
  return (
    <div className="progress">
      <div className="progress-head">
        <span>{label}</span>
        {!indeterminate && <span className="progress-num">{pct}%</span>}
      </div>
      <div
        className={`progress-track ${indeterminate ? 'is-indeterminate' : ''}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : pct}
        aria-label={label}
      >
        <div className="progress-bar" style={indeterminate ? undefined : { width: `${pct}%` }} />
      </div>
    </div>
  );
}
