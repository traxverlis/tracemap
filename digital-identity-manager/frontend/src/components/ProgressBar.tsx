interface ProgressBarProps {
  value: number
  max?: number
  label?: string
}

export function ProgressBar({ value, max = 100, label }: ProgressBarProps): JSX.Element {
  const percent = Math.max(0, Math.min(100, (value / max) * 100))

  return (
    <div className="progress" aria-label={label}>
      {label ? <div className="space-between"><strong>{label}</strong><span className="muted">{Math.round(percent)}%</span></div> : null}
      <div className="progress__track" aria-hidden="true">
        <div className="progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
