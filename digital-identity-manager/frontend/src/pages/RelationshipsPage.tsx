import { useCallback, useState } from 'react'

import { decideRelationship, getCorrelationRules, getRelationshipGraph, getReviewQueue, runCorrelation } from '../api/relationships'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { ErrorState, IdentityRequiredState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { RelationshipGraph } from '../components/RelationshipGraph'
import { Tabs } from '../components/Tabs'
import { useFetch } from '../hooks/useFetch'
import { useIdentity } from '../hooks/useIdentity'
import { useToast } from '../hooks/useToast'
import { useI18n, type TranslationKey, type Translator } from '../i18n'
import { getErrorDetail, prettyJson } from '../utils'

type Decision = 'CONFIRM' | 'REJECT' | 'LATER'

const DECISION_TOAST_KEYS: Record<Decision, TranslationKey> = {
  CONFIRM: 'findings.relationships.toast.markedConfirmed',
  REJECT: 'findings.relationships.toast.markedRejected',
  LATER: 'findings.relationships.toast.markedLater',
}

const RELATIONSHIP_STATUS_KEYS: Record<string, TranslationKey> = {
  UNKNOWN: 'findings.relationships.status.UNKNOWN',
  SUGGESTED: 'findings.relationships.status.SUGGESTED',
  CONFIRMED: 'findings.relationships.status.CONFIRMED',
  REJECTED: 'findings.relationships.status.REJECTED',
}

const RULE_LABEL_KEYS: Record<string, TranslationKey> = {
  same_email: 'findings.relationships.rule.same_email.label',
  same_phone: 'findings.relationships.rule.same_phone.label',
  explicit_link: 'findings.relationships.rule.explicit_link.label',
  same_username: 'findings.relationships.rule.same_username.label',
  same_domain: 'findings.relationships.rule.same_domain.label',
  same_avatar: 'findings.relationships.rule.same_avatar.label',
  same_name: 'findings.relationships.rule.same_name.label',
  similar_bio: 'findings.relationships.rule.similar_bio.label',
  similar_username: 'findings.relationships.rule.similar_username.label',
  same_company: 'findings.relationships.rule.same_company.label',
  same_city: 'findings.relationships.rule.same_city.label',
  conflicting_country: 'findings.relationships.rule.conflicting_country.label',
  conflicting_timeline: 'findings.relationships.rule.conflicting_timeline.label',
}

const RULE_DESCRIPTION_KEYS: Record<string, TranslationKey> = {
  same_email: 'findings.relationships.rule.same_email.description',
  same_phone: 'findings.relationships.rule.same_phone.description',
  explicit_link: 'findings.relationships.rule.explicit_link.description',
  same_username: 'findings.relationships.rule.same_username.description',
  same_domain: 'findings.relationships.rule.same_domain.description',
  same_avatar: 'findings.relationships.rule.same_avatar.description',
  same_name: 'findings.relationships.rule.same_name.description',
  similar_bio: 'findings.relationships.rule.similar_bio.description',
  similar_username: 'findings.relationships.rule.similar_username.description',
  same_company: 'findings.relationships.rule.same_company.description',
  same_city: 'findings.relationships.rule.same_city.description',
  conflicting_country: 'findings.relationships.rule.conflicting_country.description',
  conflicting_timeline: 'findings.relationships.rule.conflicting_timeline.description',
}

/** Rule identifiers stay untouched; the server wording is the fallback. */
const ruleLabel = (t: Translator, rule: string, fallback: string): string => {
  const key = RULE_LABEL_KEYS[rule]
  return key ? t(key) : fallback
}

const ruleDescription = (t: Translator, rule: string, fallback: string): string => {
  const key = RULE_DESCRIPTION_KEYS[rule]
  return key ? t(key) : fallback
}

/** The wire value is preserved; only the badge wording is localised. */
const relationshipStatusLabel = (t: Translator, status: string): string => {
  const key = RELATIONSHIP_STATUS_KEYS[status]
  return key ? t(key) : status
}

export function RelationshipsPage(): JSX.Element {
  const { selectedIdentityId } = useIdentity()
  const { addToast } = useToast()
  const { t } = useI18n()
  const [tab, setTab] = useState<'graph' | 'review'>('graph')
  const [running, setRunning] = useState(false)

  const fetchRelationships = useCallback(async () => {
    if (!selectedIdentityId) return null
    const [graph, reviewItems, rules] = await Promise.all([
      getRelationshipGraph(selectedIdentityId),
      getReviewQueue(selectedIdentityId),
      getCorrelationRules(),
    ])
    return { graph, reviewItems, rules }
  }, [selectedIdentityId])

  const { data, loading, error, refetch } = useFetch(selectedIdentityId ? fetchRelationships : null, [fetchRelationships])

  const launchCorrelation = async () => {
    if (!selectedIdentityId) return
    setRunning(true)
    try {
      const response = await runCorrelation(selectedIdentityId)
      addToast({ title: t('findings.relationships.toast.runComplete'), description: t('findings.relationships.toast.runCompleteDetail', { created: response.created, updated: response.updated }), tone: 'success' })
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('findings.relationships.toast.runFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setRunning(false)
    }
  }

  const decide = async (relationshipId: string, decision: Decision) => {
    try {
      await decideRelationship(relationshipId, { decision })
      addToast({ title: t(DECISION_TOAST_KEYS[decision]), tone: decision === 'CONFIRM' ? 'success' : 'info' })
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('findings.relationships.toast.decisionFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    }
  }

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title={t('findings.relationships.title')} description={t('findings.relationships.descriptionExplore')} />
        <IdentityRequiredState />
      </div>
    )
  }

  if (loading && !data) return <LoadingState message={t('findings.relationships.loading')} />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title={t('findings.relationships.title')} description={t('findings.relationships.description')} actions={<Button onClick={() => void launchCorrelation()} isLoading={running}>{t('findings.relationships.run')}</Button>} />
      <Tabs items={[{ id: 'graph', label: t('findings.relationships.tab.graph') }, { id: 'review', label: t('findings.relationships.tab.review') }]} value={tab} onChange={(value) => setTab(value as 'graph' | 'review')} />
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      {tab === 'graph' ? (
        <div className="split-grid">
          <Card title={t('findings.relationships.graphCard.title')} description={t('findings.relationships.graphCard.description')}>
            {data ? <RelationshipGraph nodes={data.graph.nodes} edges={data.graph.edges} /> : null}
          </Card>
          <Card title={t('findings.relationships.rules.title')} description={t('findings.relationships.rules.description', { method: data?.rules.method ?? t('findings.relationships.rules.unknownMethod'), score: data?.rules.max_auto_score ?? '—' })}>
            <ul className="list-reset list-grid">
              {(data?.rules.rules ?? []).map((rule) => (
                <li key={rule.key} className="card" style={{ padding: '1rem' }}>
                  <div className="space-between">
                    <strong>{ruleLabel(t, rule.key, rule.label)}</strong>
                    <Badge tone="primary">{rule.weight}</Badge>
                  </div>
                  <p className="muted" style={{ marginBottom: 0 }}>{ruleDescription(t, rule.key, rule.description)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : (
        <div className="page-stack">
          {(data?.reviewItems ?? []).length === 0 ? <EmptyState title={t('findings.relationships.review.emptyTitle')} description={t('findings.relationships.review.emptyDescription')} /> : null}
          {(data?.reviewItems ?? []).map((item) => (
            <Card key={item.relationship.id} title={item.platform ? t('findings.relationships.review.questionPlatform', { platform: item.platform }) : t('findings.relationships.review.questionEntities', { source: item.source_label, target: item.target_label })} description={`${item.source_label} → ${item.target_label}`} actions={<Badge tone={item.relationship.status === 'SUGGESTED' ? 'warning' : 'primary'}>{relationshipStatusLabel(t, item.relationship.status)}</Badge>}>
              <div className="stack">
                <div className="inline">
                  {item.platform ? <Badge tone="info">{item.platform}</Badge> : null}
                  {item.username ? <Badge tone="primary">{item.username}</Badge> : null}
                  <Badge tone="warning">{t('findings.relationships.review.score', { score: item.relationship.explanation_json.score ?? item.relationship.confidence })}</Badge>
                </div>
                {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a> : null}
                <div className="muted">{t('findings.relationships.review.reason', { reason: item.relationship.reason ?? t('findings.relationships.review.reasonNone') })}</div>
                <div>
                  <strong>{t('findings.relationships.review.breakdown')}</strong>
                  <ul className="list-grid">
                    {(item.relationship.explanation_json.components ?? []).map((component) => (
                      <li key={`${item.relationship.id}-${component.rule}`}>
                        <span>{ruleLabel(t, component.rule, component.label)}</span> · <span className="muted">{component.weight}</span>
                        {component.detail ? ` · ${component.detail}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
                <details>
                  <summary>{t('findings.relationships.review.context')}</summary>
                  <pre className="preformatted">{prettyJson(item.context)}</pre>
                </details>
                <div className="inline">
                  <Button onClick={() => void decide(item.relationship.id, 'CONFIRM')}>{t('common.confirm')}</Button>
                  <Button variant="danger" onClick={() => void decide(item.relationship.id, 'REJECT')}>{t('findings.relationships.action.reject')}</Button>
                  <Button variant="secondary" onClick={() => void decide(item.relationship.id, 'LATER')}>{t('findings.relationships.action.later')}</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
