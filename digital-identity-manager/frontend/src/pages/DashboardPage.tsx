import { useCallback, useMemo } from 'react'

import { getDashboardSummary, getTimeline } from '../api/dashboard'
import { Card } from '../components/Card'
import { ErrorState, IdentityRequiredState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { RingChart } from '../components/RingChart'
import { useFetch } from '../hooks/useFetch'
import { useIdentity } from '../hooks/useIdentity'
import { useI18n, type TranslationKey } from '../i18n'
import { formatDateTime } from '../utils'

export function DashboardPage(): JSX.Element {
  const { selectedIdentity, selectedIdentityId, loading: identityLoading } = useIdentity()
  const { t } = useI18n()

  const fetchDashboard = useCallback(async () => {
    if (!selectedIdentityId) {
      return null
    }
    const [summary, timeline] = await Promise.all([
      getDashboardSummary(selectedIdentityId),
      getTimeline(selectedIdentityId, 10),
    ])
    return { summary, timeline }
  }, [selectedIdentityId])

  const { data, loading, error, refetch } = useFetch(selectedIdentityId ? fetchDashboard : null, [fetchDashboard])

  const stats = useMemo<[TranslationKey, number][]>(
    () =>
      data
        ? [
            ['dashboard.stat.identifiers', data.summary.identifiers],
            ['dashboard.stat.emails', data.summary.emails],
            ['dashboard.stat.phones', data.summary.phones],
            ['dashboard.stat.usernames', data.summary.usernames],
            ['dashboard.stat.addresses', data.summary.addresses],
            ['dashboard.stat.profiles', data.summary.profiles],
            ['dashboard.stat.accountsFound', data.summary.accounts_found],
            ['dashboard.stat.relationshipsConfirmed', data.summary.relationships_confirmed],
            ['dashboard.stat.relationshipsToReview', data.summary.relationships_to_review],
            ['dashboard.stat.dataBrokers', data.summary.data_brokers],
            ['dashboard.stat.deletionsTodo', data.summary.deletions_todo],
            ['dashboard.stat.deletionsRequested', data.summary.deletions_requested],
            ['dashboard.stat.deletionsConfirmed', data.summary.deletions_confirmed],
            ['dashboard.stat.dataReappeared', data.summary.data_reappeared],
            ['dashboard.stat.breaches', data.summary.breaches],
          ]
        : [],
    [data],
  )

  if (identityLoading && !selectedIdentityId) {
    return <LoadingState message={t('dashboard.loadingIdentities')} />
  }

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />
        <IdentityRequiredState />
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="page-stack">
        <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />
        <LoadingState message={t('dashboard.loadingSummary')} />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="page-stack">
        <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />
        <ErrorState message={error} onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="page-stack">
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.overviewFor', {
          identity: selectedIdentity?.label ?? t('dashboard.activeIdentityFallback'),
        })}
      />

      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}

      <div className="split-grid">
        <Card
          title={t('dashboard.completeness.title')}
          description={data?.summary.completeness.explanation ?? t('dashboard.completeness.fallbackDescription')}
        >
          <RingChart score={data?.summary.completeness.score ?? 0} label={t('dashboard.completeness.ringLabel')} />
        </Card>
        <Card title={t('dashboard.cadence.title')} description={t('dashboard.cadence.description')}>
          <div className="stack stack--sm">
            <div>
              <strong>{t('dashboard.cadence.lastScan')}</strong>
              <p className="muted">
                {data?.summary.last_scan
                  ? `${data.summary.last_scan.tool} · ${data.summary.last_scan.scan_type} · ${formatDateTime(
                      data.summary.last_scan.finished_at ?? data.summary.last_scan.created_at,
                    )}`
                  : t('dashboard.cadence.noLastScan')}
              </p>
            </div>
            <div>
              <strong>{t('dashboard.cadence.nextScans')}</strong>
              <ul className="list-reset list-grid">
                {(data?.summary.next_scans ?? []).length === 0 ? (
                  <li className="muted">{t('dashboard.cadence.noNextScans')}</li>
                ) : null}
                {(data?.summary.next_scans ?? []).map((scan) => (
                  <li key={scan.id} className="space-between">
                    <span>
                      {scan.tool} · {scan.target}
                    </span>
                    <span className="muted">{formatDateTime(scan.scheduled_for ?? scan.created_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <div className="stats-grid">
        {stats.map(([labelKey, value]) => (
          <article key={labelKey} className="stat-card">
            <div className="stat-card__label">{t(labelKey)}</div>
            <div className="stat-card__value">{value}</div>
          </article>
        ))}
      </div>

      <Card title={t('dashboard.breakdown.title')} description={t('dashboard.breakdown.description')}>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('common.category')}</th>
                <th>{t('dashboard.breakdown.known')}</th>
                <th>{t('dashboard.breakdown.expected')}</th>
                <th>{t('dashboard.breakdown.missing')}</th>
                <th>{t('dashboard.breakdown.weight')}</th>
                <th>{t('dashboard.breakdown.ratio')}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.summary.completeness.categories ?? []).map((category) => (
                <tr key={category.category}>
                  <td>{category.label}</td>
                  <td>{category.known}</td>
                  <td>{category.expected}</td>
                  <td>{category.missing}</td>
                  <td>{category.weight}</td>
                  <td>{Math.round(category.ratio * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={t('dashboard.timeline.title')} description={t('dashboard.timeline.description')}>
        <ul className="list-reset list-grid">
          {(data?.timeline ?? []).length === 0 ? <li className="muted">{t('dashboard.timeline.empty')}</li> : null}
          {(data?.timeline ?? []).map((event) => (
            <li key={event.id} className="card" style={{ padding: '1rem' }}>
              <div className="space-between">
                <strong>{event.title}</strong>
                <span className="muted">{formatDateTime(event.timestamp)}</span>
              </div>
              <div className="muted">
                {event.action}
                {event.entity_type ? ` · ${event.entity_type}` : ''}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
