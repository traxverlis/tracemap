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
      addToast({ title: 'Source and title are required', tone: 'warning' })
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
        addToast({ title: 'Finding updated', tone: 'success' })
      } else {
        await createFinding(payload)
        addToast({ title: 'Finding created', tone: 'success' })
      }
      setModalOpen(false)
      await refetch()
    } catch (errorValue) {
      addToast({ title: 'Unable to save finding', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  const destroy = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deleteFinding(deleting.id)
      addToast({ title: 'Finding deleted', tone: 'success' })
      setDeleting(null)
      await refetch()
    } catch (errorValue) {
      addToast({ title: 'Unable to delete finding', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setDeletingBusy(false)
    }
  }

  const columns = useMemo<DataTableColumn<Finding>[]>(
    () => [
      { key: 'title', header: 'Title', render: (row) => row.title, sortValue: (row) => row.title, filterValue: (row) => row.title },
      { key: 'category', header: 'Category', render: (row) => <Badge tone="primary">{row.category}</Badge>, sortValue: (row) => row.category, filterValue: (row) => row.category },
      { key: 'source', header: 'Source', render: (row) => row.source, sortValue: (row) => row.source, filterValue: (row) => row.source },
      { key: 'status', header: 'Status', render: (row) => <Badge tone={row.status === 'CONFIRMED' ? 'success' : 'warning'}>{row.status}</Badge>, sortValue: (row) => row.status, filterValue: (row) => row.status },
      { key: 'confidence', header: 'Confidence', render: (row) => `${row.confidence}%`, sortValue: (row) => row.confidence },
      { key: 'discovered', header: 'Discovered', render: (row) => formatDateTime(row.discovered_at), sortValue: (row) => row.discovered_at ?? '' },
      { key: 'actions', header: 'Actions', filterable: false, render: (row) => <div className="inline" onClick={(event) => event.stopPropagation()}><Button variant="secondary" size="sm" onClick={() => setEvidenceTarget(row)}>Evidence</Button><Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button><Button variant="danger" size="sm" onClick={() => setDeleting(row)}>Delete</Button></div> },
    ],
    [],
  )

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title="Findings" description="Review discovered findings, their confidence, status, and supporting evidence." />
        <IdentityRequiredState />
      </div>
    )
  }

  if (loading && !data) return <LoadingState message="Loading findings…" />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title="Findings" description="Filter, edit, and inspect findings associated with the active identity." actions={<Button onClick={openCreate}>Add finding</Button>} />
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      <DataTable columns={columns} rows={data ?? []} rowKey={(row) => row.id} showFilters onRowClick={openEdit} emptyTitle="No findings yet" emptyDescription="Create or promote results into findings to build an evidence trail." />
      <Modal open={modalOpen} title={editing ? 'Edit finding' : 'Add finding'} onClose={() => setModalOpen(false)} size="lg" footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => void save()} isLoading={submitting}>{editing ? 'Save changes' : 'Create finding'}</Button></>}>
        <div className="form-grid">
          <div className="span-4"><Field label="Source" htmlFor="finding-source" required><input id="finding-source" value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} /></Field></div>
          <div className="span-4"><Field label="Category" htmlFor="finding-category"><select id="finding-category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as Finding['category'] }))}>{['account', 'data_broker', 'breach', 'mention', 'document', 'domain', 'other'].map((item) => <option key={item} value={item}>{item}</option>)}</select></Field></div>
          <div className="span-4"><Field label="Status" htmlFor="finding-status"><input id="finding-status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} /></Field></div>
          <div className="span-12"><Field label="Title" htmlFor="finding-title" required><input id="finding-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label="Value" htmlFor="finding-value"><input id="finding-value" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label="URL" htmlFor="finding-url"><input id="finding-url" value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} /></Field></div>
          <div className="span-3"><Field label="Confidence" htmlFor="finding-confidence"><input id="finding-confidence" type="number" min={0} max={100} value={form.confidence} onChange={(event) => setForm((current) => ({ ...current, confidence: event.target.value }))} /></Field></div>
          <div className="span-3"><Field label="Discovered at" htmlFor="finding-discovered"><input id="finding-discovered" type="datetime-local" value={form.discovered_at} onChange={(event) => setForm((current) => ({ ...current, discovered_at: event.target.value }))} /></Field></div>
          <div className="span-3"><Field label="Verified at" htmlFor="finding-verified"><input id="finding-verified" type="datetime-local" value={form.last_verified_at} onChange={(event) => setForm((current) => ({ ...current, last_verified_at: event.target.value }))} /></Field></div>
          <div className="span-12"><Field label="Attributes JSON" htmlFor="finding-attributes"><textarea id="finding-attributes" value={form.attributesText} onChange={(event) => setForm((current) => ({ ...current, attributesText: event.target.value }))} /></Field></div>
        </div>
      </Modal>
      <Modal open={Boolean(evidenceTarget)} title={evidenceTarget ? `Evidence for ${evidenceTarget.title}` : 'Evidence'} onClose={() => setEvidenceTarget(null)} size="lg" footer={<Button variant="ghost" onClick={() => setEvidenceTarget(null)}>Close</Button>}>
        {evidenceQuery.loading ? <LoadingState message="Loading evidence…" /> : null}
        {evidenceQuery.error ? <ErrorState message={evidenceQuery.error} onRetry={() => void evidenceQuery.refetch()} /> : null}
        <div className="stack">
          {(evidenceQuery.data ?? []).length === 0 ? <div className="muted">No evidence records attached yet.</div> : null}
          {(evidenceQuery.data ?? []).map((evidence) => (
            <Card key={evidence.id} title={evidence.source_url ?? 'Evidence record'} description={`Captured ${formatDateTime(evidence.captured_at ?? evidence.created_at)}`}>
              <div className="stack stack--sm">
                <div className="muted">Screenshot: {evidence.screenshot_path ?? '—'}</div>
                <div className="muted">HTML capture: {evidence.html_path ?? '—'}</div>
                <pre className="preformatted">{prettyJson(evidence.metadata_json)}</pre>
              </div>
            </Card>
          ))}
        </div>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete finding" description={<p>Delete this finding and its frontend reference?</p>} onClose={() => setDeleting(null)} onConfirm={() => void destroy()} isLoading={deletingBusy} />
    </div>
  )
}
