import { useI18n } from '../i18n'

interface RingChartProps {
  score: number
  label: string
  size?: number
}

export function RingChart({ score, label, size = 180 }: RingChartProps): JSX.Element {
  const { t } = useI18n()
  const normalized = Math.max(0, Math.min(100, score))
  const stroke = 12
  const radius = size / 2 - stroke
  const circumference = 2 * Math.PI * radius
  const progress = circumference - (normalized / 100) * circumference

  return (
    <div className="ring-chart">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={t('findings.ring.ariaLabel', { label, percent: normalized })}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="color-mix(in srgb, var(--color-text-muted) 16%, transparent)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-primary)"
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="var(--color-text)" style={{ fontSize: '2rem', fontWeight: 700 }}>
          {t('findings.percent', { value: Math.round(normalized) })}
        </text>
      </svg>
      <div className="ring-chart__label">{label}</div>
    </div>
  )
}
