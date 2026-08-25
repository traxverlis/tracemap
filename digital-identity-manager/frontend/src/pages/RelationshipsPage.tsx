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
import { getErrorDetail, prettyJson } from '../utils'

export function RelationshipsPage(): JSX.Element {
  const { selectedIdentityId } = useIdentity()
  const { addToast } = useToast()
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
      addToast({ title: 'Correlation run complete', description: `Created ${response.created}, updated ${response.updated}.`, tone: 'success' })
      await refetch()
    } catch (errorValue) {
      addToast({ title: 'Correlation run failed', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setRunning(false)
    }
  }

  const decide = async (relationshipId: string, decision: 'CONFIRM' | 'REJECT' | 'LATER') => {
    try {
      await decideRelationship(relationshipId, { decision })
      addToast({ title: `Marked as ${decision.toLowerCase()}`, tone: decision === 'CONFIRM' ? 'success' : 'info' })
      await refetch()
    } catch (errorValue) {
      addToast({ title: 'Unable to submit decision', description: getErrorDetail(errorValue), tone: 'danger' })
    }
  }

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title="Relationships" description="Explore linked entities and review queued correlation suggestions." />
        <IdentityRequiredState />
      </div>
    )
  }

  if (loading && !data) return <LoadingState message="Loading relationships…" />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title="Relationships" description="Visualise linked entities and triage suggested matches." actions={<Button onClick={() => void launchCorrelation()} isLoading={running}>Run correlation</Button>} />
      <Tabs items={[{ id: 'graph', label: 'Graph' }, { id: 'review', label: 'Review queue' }]} value={tab} onChange={(value) => setTab(value as 'graph' | 'review')} />
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      {tab === 'graph' ? (
        <div className="split-grid">
          <Card title="Relationship graph" description="Simple force-directed view of the active identity and connected entities.">
            {data ? <RelationshipGraph nodes={data.graph.nodes} edges={data.graph.edges} /> : null}
          </Card>
          <Card title="Correlation rules" description={`Method: ${data?.rules.method ?? 'Unknown'} · max auto score ${data?.rules.max_auto_score ?? '—'}`}>
            <ul className="list-reset list-grid">
              {(data?.rules.rules ?? []).map((rule) => (
                <li key={rule.key} className="card" style={{ padding: '1rem' }}>
                  <div className="space-between">
                    <strong>{rule.label}</strong>
                    <Badge tone="primary">{rule.weight}</Badge>
                  </div>
                  <p className="muted" style={{ marginBottom: 0 }}>{rule.description}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : (
        <div className="page-stack">
          {(data?.reviewItems ?? []).length === 0 ? <EmptyState title="Review queue is empty" description="Run correlation or wait for new suggested relationships." /> : null}
          {(data?.reviewItems ?? []).map((item) => (
            <Card key={item.relationship.id} title={item.question} description={`${item.source_label} → ${item.target_label}`} actions={<Badge tone={item.relationship.status === 'SUGGESTED' ? 'warning' : 'primary'}>{item.relationship.status}</Badge>}>
              <div className="stack">
                <div className="inline">
                  {item.platform ? <Badge tone="info">{item.platform}</Badge> : null}
                  {item.username ? <Badge tone="primary">{item.username}</Badge> : null}
                  <Badge tone="warning">Score {item.relationship.explanation_json.score ?? item.relationship.confidence}</Badge>
                </div>
                {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a> : null}
                <div className="muted">Reason: {item.relationship.reason ?? 'No free-text reason provided.'}</div>
                <div>
                  <strong>Score breakdown</strong>
                  <ul className="list-grid">
                    {(item.relationship.explanation_json.components ?? []).map((component) => (
                      <li key={`${item.relationship.id}-${component.rule}`}>
                        <span>{component.label}</span> · <span className="muted">{component.weight}</span>
                        {component.detail ? ` · ${component.detail}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
                <details>
                  <summary>Context</summary>
                  <pre className="preformatted">{prettyJson(item.context)}</pre>
                </details>
                <div className="inline">
                  <Button onClick={() => void decide(item.relationship.id, 'CONFIRM')}>Confirm</Button>
                  <Button variant="danger" onClick={() => void decide(item.relationship.id, 'REJECT')}>Reject</Button>
                  <Button variant="secondary" onClick={() => void decide(item.relationship.id, 'LATER')}>Later</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
