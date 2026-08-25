import { useI18n } from '../i18n'

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
}

export function ProgressBar({ value, max = 100, label }: ProgressBarProps): JSX.Element {
  const { t } = useI18n()
  const percent = Math.max(0, Math.min(100, (value / max) * 100))

  return (
    <div className="progress" aria-label={label ?? t('findings.progress.ariaLabel')}>
      {label ? <div className="space-between"><strong>{label}</strong><span className="muted">{t('findings.percent', { value: Math.round(percent) })}</span></div> : null}
      <div className="progress__track" aria-hidden="true">
        <div className="progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
