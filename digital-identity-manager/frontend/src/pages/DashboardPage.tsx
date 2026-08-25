import { useCallback, useMemo } from 'react'

import { getDashboardSummary, getTimeline } from '../api/dashboard'
import { Card } from '../components/Card'
import { ErrorState, IdentityRequiredState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { RingChart } from '../components/RingChart'
import { useFetch } from '../hooks/useFetch'
import { useIdentity } from '../hooks/useIdentity'
import { formatDateTime } from '../utils'

export function DashboardPage(): JSX.Element {
  const { selectedIdentity, selectedIdentityId, loading: identityLoading } = useIdentity()

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

  const stats = useMemo(
    () =>
      data
        ? [
            ['Identifiers', data.summary.identifiers],
            ['Emails', data.summary.emails],
            ['Phones', data.summary.phones],
            ['Usernames', data.summary.usernames],
            ['Addresses', data.summary.addresses],
            ['Profiles', data.summary.profiles],
            ['Accounts found', data.summary.accounts_found],
            ['Relationships confirmed', data.summary.relationships_confirmed],
            ['Relationships to review', data.summary.relationships_to_review],
            ['Data brokers', data.summary.data_brokers],
            ['Deletion TODO', data.summary.deletions_todo],
            ['Deletion requested', data.summary.deletions_requested],
            ['Deletion confirmed', data.summary.deletions_confirmed],
            ['Data reappeared', data.summary.data_reappeared],
            ['Breaches', data.summary.breaches],
          ]
        : [],
    [data],
  )

  if (identityLoading && !selectedIdentityId) {
    return <LoadingState message="Loading identities…" />
  }

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title="Dashboard" description="See completeness, timeline, and operational counts for the active identity." />
        <IdentityRequiredState />
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="page-stack">
        <PageHeader title="Dashboard" description="See completeness, timeline, and operational counts for the active identity." />
        <LoadingState message="Loading dashboard summary…" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="page-stack">
        <PageHeader title="Dashboard" description="See completeness, timeline, and operational counts for the active identity." />
        <ErrorState message={error} onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Dashboard"
        description={`Operational overview for ${selectedIdentity?.label ?? 'the active identity'}.`}
      />

      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}

      <div className="split-grid">
        <Card title="Completeness score" description={data?.summary.completeness.explanation ?? 'Coverage overview'}>
          <RingChart score={data?.summary.completeness.score ?? 0} label="Completeness" />
        </Card>
        <Card title="Scanning cadence" description="Latest activity and upcoming scheduled scans.">
          <div className="stack stack--sm">
            <div>
              <strong>Last scan</strong>
              <p className="muted">
                {data?.summary.last_scan
                  ? `${data.summary.last_scan.tool} · ${data.summary.last_scan.scan_type} · ${formatDateTime(
                      data.summary.last_scan.finished_at ?? data.summary.last_scan.created_at,
                    )}`
                  : 'No completed scan yet.'}
              </p>
            </div>
            <div>
              <strong>Next scheduled scans</strong>
              <ul className="list-reset list-grid">
                {(data?.summary.next_scans ?? []).length === 0 ? <li className="muted">No scheduled scans.</li> : null}
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
        {stats.map(([label, value]) => (
          <article key={label} className="stat-card">
            <div className="stat-card__label">{label}</div>
            <div className="stat-card__value">{value}</div>
          </article>
        ))}
      </div>

      <Card title="Completeness breakdown" description="Category-level completeness and remaining gaps.">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Known</th>
                <th>Expected</th>
                <th>Missing</th>
                <th>Weight</th>
                <th>Ratio</th>
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

      <Card title="Recent timeline" description="The latest events recorded for this identity.">
        <ul className="list-reset list-grid">
          {(data?.timeline ?? []).length === 0 ? <li className="muted">No timeline entries yet.</li> : null}
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
