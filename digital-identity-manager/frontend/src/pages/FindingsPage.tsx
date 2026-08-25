import { useCallback, useMemo, useState } from 'react'

import { createFinding, deleteFinding, listEvidence, listFindings, updateFinding } from '../api/findings'
import type { Evidence, Finding } from '../api/types'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable, type DataTableColumn } from '../components/DataTable'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { ErrorState, IdentityRequiredState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { useFetch } from '../hooks/useFetch'
import { useIdentity } from '../hooks/useIdentity'
import { useToast } from '../hooks/useToast'
import { useI18n, type TranslationKey, type Translator } from '../i18n'
import { formatDateTime, getErrorDetail, maybeNull, prettyJson, safeParseJson, toNumber } from '../utils'

interface FindingFormState {
  source: string
  category: Finding['category']
  title: string
  value: string
  url: string
  confidence: string
  status: string
  discovered_at: string
  last_verified_at: string
  attributesText: string
}

const CATEGORIES: Finding['category'][] = ['account', 'data_broker', 'breach', 'mention', 'document', 'domain', 'other']

const CATEGORY_KEYS: Record<Finding['category'], TranslationKey> = {
  account: 'findings.category.account',
  data_broker: 'findings.category.data_broker',
  breach: 'findings.category.breach',
  mention: 'findings.category.mention',
  document: 'findings.category.document',
  domain: 'findings.category.domain',
  other: 'findings.category.other',
}

const STATUS_KEYS: Record<string, TranslationKey> = {
  NEW: 'findings.status.NEW',
  SUGGESTED: 'findings.status.SUGGESTED',
  CONFIRMED: 'findings.status.CONFIRMED',
  REJECTED: 'findings.status.REJECTED',
  LATER: 'findings.status.LATER',
  REAPPEARED: 'findings.status.REAPPEARED',
  REMOVED: 'findings.status.REMOVED',
}

/** Wire values are kept untouched; only the displayed wording is localised. */
const categoryLabel = (t: Translator, category: Finding['category']): string => t(CATEGORY_KEYS[category])

const statusLabel = (t: Translator, status: string): string => {
  const key = STATUS_KEYS[status]
  return key ? t(key) : status
}

const emptyForm: FindingFormState = {
  source: '',
  category: 'other',
  title: '',
  value: '',
  url: '',
  confidence: '0',
  status: 'NEW',
  discovered_at: '',
  last_verified_at: '',
  attributesText: '{}',
}

const toFormState = (finding: Finding): FindingFormState => ({
  source: finding.source,
  category: finding.category,
  title: finding.title,
  value: finding.value ?? '',
  url: finding.url ?? '',
  confidence: String(finding.confidence),
  status: finding.status,
  discovered_at: finding.discovered_at ?? '',
  last_verified_at: finding.last_verified_at ?? '',
  attributesText: prettyJson(finding.attributes),
})

export function FindingsPage(): JSX.Element {
  const { selectedIdentityId } = useIdentity()
  const { addToast } = useToast()
  const { t } = useI18n()
  const [editing, setEditing] = useState<Finding | null>(null)
  const [form, setForm] = useState<FindingFormState>(emptyForm)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<Finding | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [evidenceTarget, setEvidenceTarget] = useState<Finding | null>(null)

  const fetchFindings = useCallback(() => {
    if (!selectedIdentityId) return Promise.resolve([])
    return listFindings({ identity_id: selectedIdentityId })
  }, [selectedIdentityId])

  const { data, loading, error, refetch } = useFetch(selectedIdentityId ? fetchFindings : null, [fetchFindings])
  const evidenceQuery = useFetch<Evidence[]>(evidenceTarget ? () => listEvidence(evidenceTarget.id) : null, [evidenceTarget?.id])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (finding: Finding) => {
    setEditing(finding)
    setForm(toFormState(finding))
    setModalOpen(true)
  }

  const save = async () => {
    if (!selectedIdentityId || !form.source.trim() || !form.title.trim()) {
      addToast({ title: t('findings.toast.requiredFields'), tone: 'warning' })
      return
    }
    setSubmitting(true)
    try {
      const payload: Partial<Finding> = {
        identity_id: selectedIdentityId,
        source: form.source.trim(),
        category: form.category,
        title: form.title.trim(),
        value: maybeNull(form.value),
        url: maybeNull(form.url),
        confidence: toNumber(form.confidence, 0),
        status: form.status,
        discovered_at: maybeNull(form.discovered_at),
        last_verified_at: maybeNull(form.last_verified_at),
        attributes: safeParseJson(form.attributesText),
      }
      if (editing) {
        await updateFinding(editing.id, payload)
        addToast({ title: t('findings.toast.updated'), tone: 'success' })
      } else {
        await createFinding(payload)
        addToast({ title: t('findings.toast.created'), tone: 'success' })
      }
      setModalOpen(false)
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('findings.toast.saveFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  const destroy = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deleteFinding(deleting.id)
      addToast({ title: t('findings.toast.deleted'), tone: 'success' })
      setDeleting(null)
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('findings.toast.deleteFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setDeletingBusy(false)
    }
  }

  const columns = useMemo<DataTableColumn<Finding>[]>(
    () => [
      { key: 'title', header: t('findings.column.title'), render: (row) => row.title, sortValue: (row) => row.title, filterValue: (row) => row.title },
      { key: 'category', header: t('common.category'), render: (row) => <Badge tone="primary">{categoryLabel(t, row.category)}</Badge>, sortValue: (row) => categoryLabel(t, row.category), filterValue: (row) => categoryLabel(t, row.category) },
      { key: 'source', header: t('common.source'), render: (row) => row.source, sortValue: (row) => row.source, filterValue: (row) => row.source },
      { key: 'status', header: t('common.status'), render: (row) => <Badge tone={row.status === 'CONFIRMED' ? 'success' : 'warning'}>{statusLabel(t, row.status)}</Badge>, sortValue: (row) => statusLabel(t, row.status), filterValue: (row) => statusLabel(t, row.status) },
      { key: 'confidence', header: t('common.confidence'), render: (row) => t('findings.percent', { value: row.confidence }), sortValue: (row) => row.confidence },
      { key: 'discovered', header: t('findings.column.discovered'), render: (row) => formatDateTime(row.discovered_at), sortValue: (row) => row.discovered_at ?? '' },
      { key: 'actions', header: t('common.actions'), filterable: false, render: (row) => <div className="inline" onClick={(event) => event.stopPropagation()}><Button variant="secondary" size="sm" onClick={() => setEvidenceTarget(row)}>{t('findings.evidence.action')}</Button><Button variant="ghost" size="sm" onClick={() => openEdit(row)}>{t('common.edit')}</Button><Button variant="danger" size="sm" onClick={() => setDeleting(row)}>{t('common.delete')}</Button></div> },
    ],
    [t],
  )

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title={t('findings.title')} description={t('findings.descriptionReview')} />
        <IdentityRequiredState />
      </div>
    )
  }

  if (loading && !data) return <LoadingState message={t('findings.loading')} />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title={t('findings.title')} description={t('findings.description')} actions={<Button onClick={openCreate}>{t('findings.add')}</Button>} />
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      <DataTable columns={columns} rows={data ?? []} rowKey={(row) => row.id} showFilters onRowClick={openEdit} emptyTitle={t('findings.empty.title')} emptyDescription={t('findings.empty.description')} />
      <Modal open={modalOpen} title={editing ? t('findings.modal.editTitle') : t('findings.modal.createTitle')} onClose={() => setModalOpen(false)} size="lg" footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => void save()} isLoading={submitting}>{editing ? t('common.saveChanges') : t('findings.modal.createSubmit')}</Button></>}>
        <div className="form-grid">
          <div className="span-4"><Field label={t('common.source')} htmlFor="finding-source" required><input id="finding-source" value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} /></Field></div>
          <div className="span-4"><Field label={t('common.category')} htmlFor="finding-category"><select id="finding-category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as Finding['category'] }))}>{CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabel(t, item)}</option>)}</select></Field></div>
          <div className="span-4"><Field label={t('common.status')} htmlFor="finding-status"><input id="finding-status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} /></Field></div>
          <div className="span-12"><Field label={t('findings.field.title')} htmlFor="finding-title" required><input id="finding-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label={t('common.value')} htmlFor="finding-value"><input id="finding-value" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label={t('findings.field.url')} htmlFor="finding-url"><input id="finding-url" value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} /></Field></div>
          <div className="span-3"><Field label={t('common.confidence')} htmlFor="finding-confidence"><input id="finding-confidence" type="number" min={0} max={100} value={form.confidence} onChange={(event) => setForm((current) => ({ ...current, confidence: event.target.value }))} /></Field></div>
          <div className="span-3"><Field label={t('findings.field.discoveredAt')} htmlFor="finding-discovered"><input id="finding-discovered" type="datetime-local" value={form.discovered_at} onChange={(event) => setForm((current) => ({ ...current, discovered_at: event.target.value }))} /></Field></div>
          <div className="span-3"><Field label={t('findings.field.verifiedAt')} htmlFor="finding-verified"><input id="finding-verified" type="datetime-local" value={form.last_verified_at} onChange={(event) => setForm((current) => ({ ...current, last_verified_at: event.target.value }))} /></Field></div>
          <div className="span-12"><Field label={t('findings.field.attributes')} htmlFor="finding-attributes"><textarea id="finding-attributes" value={form.attributesText} onChange={(event) => setForm((current) => ({ ...current, attributesText: event.target.value }))} /></Field></div>
        </div>
      </Modal>
      <Modal open={Boolean(evidenceTarget)} title={evidenceTarget ? t('findings.evidence.titleFor', { title: evidenceTarget.title }) : t('findings.evidence.title')} onClose={() => setEvidenceTarget(null)} size="lg" footer={<Button variant="ghost" onClick={() => setEvidenceTarget(null)}>{t('common.close')}</Button>}>
        {evidenceQuery.loading ? <LoadingState message={t('findings.evidence.loading')} /> : null}
        {evidenceQuery.error ? <ErrorState message={evidenceQuery.error} onRetry={() => void evidenceQuery.refetch()} /> : null}
        <div className="stack">
          {(evidenceQuery.data ?? []).length === 0 ? <div className="muted">{t('findings.evidence.empty')}</div> : null}
          {(evidenceQuery.data ?? []).map((evidence) => (
            <Card key={evidence.id} title={evidence.source_url ?? t('findings.evidence.record')} description={t('findings.evidence.captured', { date: formatDateTime(evidence.captured_at ?? evidence.created_at) })}>
              <div className="stack stack--sm">
                <div className="muted">{t('findings.evidence.screenshot', { path: evidence.screenshot_path ?? '—' })}</div>
                <div className="muted">{t('findings.evidence.html', { path: evidence.html_path ?? '—' })}</div>
                <pre className="preformatted">{prettyJson(evidence.metadata_json)}</pre>
              </div>
            </Card>
          ))}
        </div>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title={t('findings.delete.title')} description={<p>{t('findings.delete.description')}</p>} onClose={() => setDeleting(null)} onConfirm={() => void destroy()} isLoading={deletingBusy} />
    </div>
  )
}
