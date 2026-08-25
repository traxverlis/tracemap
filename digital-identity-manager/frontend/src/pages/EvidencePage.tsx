import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { listEvidence, listFindings } from '../api/findings'
import type { Finding } from '../api/types'
import { Card } from '../components/Card'
import { ErrorState, IdentityRequiredState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { useFetch } from '../hooks/useFetch'
import { useIdentity } from '../hooks/useIdentity'
import { useI18n } from '../i18n'
import { formatDateTime, prettyJson } from '../utils'

export function EvidencePage(): JSX.Element {
  const { selectedIdentityId } = useIdentity()
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(searchParams.get('finding_id'))

  const findingsQuery = useFetch<Finding[]>(selectedIdentityId ? () => listFindings({ identity_id: selectedIdentityId }) : null, [selectedIdentityId])

  useEffect(() => {
    if (!selectedFindingId && findingsQuery.data?.[0]) {
      setSelectedFindingId(findingsQuery.data[0].id)
    }
  }, [findingsQuery.data, selectedFindingId])

  const evidenceQuery = useFetch(selectedFindingId ? () => listEvidence(selectedFindingId) : null, [selectedFindingId])

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title={t('inventory.evidence.title')} description={t('inventory.evidence.identityDescription')} />
        <IdentityRequiredState />
      </div>
    )
  }

  if (findingsQuery.loading && !findingsQuery.data) return <LoadingState message={t('inventory.evidence.loadingFindings')} />
  if (findingsQuery.error && !findingsQuery.data) return <ErrorState message={findingsQuery.error} onRetry={() => void findingsQuery.refetch()} />

  const selectedFinding = findingsQuery.data?.find((finding) => finding.id === selectedFindingId) ?? null

  return (
    <div className="page-stack">
      <PageHeader title={t('inventory.evidence.title')} description={t('inventory.evidence.description')} />
      <div className="split-grid">
        <Card title={t('inventory.evidence.findingsTitle')} description={t('inventory.evidence.findingsDescription')}>
          <ul className="list-reset list-grid">
            {(findingsQuery.data ?? []).length === 0 ? <li className="muted">{t('inventory.evidence.noFindings')}</li> : null}
            {(findingsQuery.data ?? []).map((finding) => (
              <li key={finding.id}>
                <button type="button" className="button button--secondary button--full" onClick={() => setSelectedFindingId(finding.id)}>
                  {finding.title}
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={selectedFinding ? t('inventory.evidence.forFinding', { title: selectedFinding.title }) : t('inventory.evidence.detailsTitle')} description={selectedFinding?.source ?? t('inventory.evidence.selectFinding')}>
          {evidenceQuery.loading ? <LoadingState message={t('inventory.evidence.loadingEvidence')} /> : null}
          {evidenceQuery.error ? <ErrorState message={evidenceQuery.error} onRetry={() => void evidenceQuery.refetch()} /> : null}
          <div className="stack">
            {(evidenceQuery.data ?? []).length === 0 ? <div className="muted">{t('inventory.evidence.noEvidence')}</div> : null}
            {(evidenceQuery.data ?? []).map((evidence) => (
              <Card key={evidence.id} title={evidence.source_url ?? t('inventory.evidence.record')} description={formatDateTime(evidence.captured_at ?? evidence.created_at)}>
                <div className="stack stack--sm">
                  <div className="muted">{t('inventory.evidence.screenshotPath', { value: evidence.screenshot_path ?? '—' })}</div>
                  <div className="muted">{t('inventory.evidence.htmlPath', { value: evidence.html_path ?? '—' })}</div>
                  <div className="muted">{t('inventory.evidence.contentHash', { value: evidence.content_hash ?? '—' })}</div>
                  <pre className="preformatted">{prettyJson(evidence.metadata_json)}</pre>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
