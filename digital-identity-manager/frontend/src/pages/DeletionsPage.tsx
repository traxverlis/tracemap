import { useCallback, useMemo, useState } from 'react'

import { createDeletionRequest, deleteDeletionRequest, listDeletionRequests, updateDeletionRequest } from '../api/deletions'
import type { DeletionRequest } from '../api/types'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { ErrorState, IdentityRequiredState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { useFetch } from '../hooks/useFetch'
import { useIdentity } from '../hooks/useIdentity'
import { useToast } from '../hooks/useToast'
import { useI18n, type TranslationKey } from '../i18n'
import { formatDateTime, getErrorDetail, maybeNull } from '../utils'

interface DeletionFormState {
  finding_id: string
  broker_id: string
  status: DeletionRequest['status']
  method: string
  requested_at: string
  confirmation: string
  confirmation_url: string
  verified_at: string
  next_check: string
  notes: string
}

const statuses: DeletionRequest['status'][] = ['TODO', 'REQUESTED', 'IN_PROGRESS', 'CONFIRMED', 'REFUSED', 'REAPPEARED']

const statusLabelKeys: Record<DeletionRequest['status'], TranslationKey> = {
  TODO: 'privacy.deletions.status.TODO',
  REQUESTED: 'privacy.deletions.status.REQUESTED',
  IN_PROGRESS: 'privacy.deletions.status.IN_PROGRESS',
  CONFIRMED: 'privacy.deletions.status.CONFIRMED',
  REFUSED: 'privacy.deletions.status.REFUSED',
  REAPPEARED: 'privacy.deletions.status.REAPPEARED',
}

const emptyForm: DeletionFormState = {
  finding_id: '',
  broker_id: '',
  status: 'TODO',
  method: '',
  requested_at: '',
  confirmation: '',
  confirmation_url: '',
  verified_at: '',
  next_check: '',
  notes: '',
}

const toFormState = (item: DeletionRequest): DeletionFormState => ({
  finding_id: item.finding_id ?? '',
  broker_id: item.broker_id ?? '',
  status: item.status,
  method: item.method ?? '',
  requested_at: item.requested_at ?? '',
  confirmation: item.confirmation ?? '',
  confirmation_url: item.confirmation_url ?? '',
  verified_at: item.verified_at ?? '',
  next_check: item.next_check ?? '',
  notes: item.notes ?? '',
})

export function DeletionsPage(): JSX.Element {
  const { selectedIdentityId } = useIdentity()
  const { addToast } = useToast()
  const { t } = useI18n()
  const [statusFilter, setStatusFilter] = useState('')
  const [editing, setEditing] = useState<DeletionRequest | null>(null)
  const [form, setForm] = useState<DeletionFormState>(emptyForm)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<DeletionRequest | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  const fetchDeletions = useCallback(() => {
    if (!selectedIdentityId) return Promise.resolve([])
    return listDeletionRequests({ identity_id: selectedIdentityId, status: maybeNull(statusFilter) ?? undefined })
  }, [selectedIdentityId, statusFilter])

  const { data, loading, error, refetch } = useFetch(selectedIdentityId ? fetchDeletions : null, [fetchDeletions])

  const grouped = useMemo(() => {
    const map = new Map<DeletionRequest['status'], DeletionRequest[]>()
    for (const status of statuses) map.set(status, [])
    for (const item of data ?? []) {
      map.get(item.status)?.push(item)
    }
    return map
  }, [data])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: DeletionRequest) => {
    setEditing(item)
    setForm(toFormState(item))
    setModalOpen(true)
  }

  const save = async () => {
    if (!selectedIdentityId) return
    setSubmitting(true)
    try {
      const payload: Partial<DeletionRequest> = {
        identity_id: selectedIdentityId,
        finding_id: maybeNull(form.finding_id),
        broker_id: maybeNull(form.broker_id),
        status: form.status,
        method: maybeNull(form.method),
        requested_at: maybeNull(form.requested_at),
        confirmation: maybeNull(form.confirmation),
        confirmation_url: maybeNull(form.confirmation_url),
        verified_at: maybeNull(form.verified_at),
        next_check: maybeNull(form.next_check),
        notes: maybeNull(form.notes),
      }
      if (editing) {
        await updateDeletionRequest(editing.id, payload)
        addToast({ title: t('privacy.deletions.toast.updated'), tone: 'success' })
      } else {
        await createDeletionRequest(payload)
        addToast({ title: t('privacy.deletions.toast.created'), tone: 'success' })
      }
      setModalOpen(false)
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('privacy.deletions.toast.saveFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  const destroy = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deleteDeletionRequest(deleting.id)
      addToast({ title: t('privacy.deletions.toast.deleted'), tone: 'success' })
      setDeleting(null)
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('privacy.deletions.toast.deleteFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setDeletingBusy(false)
    }
  }

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title={t('privacy.deletions.title')} description={t('privacy.deletions.intro')} />
        <IdentityRequiredState />
      </div>
    )
  }

  if (loading && !data) return <LoadingState message={t('privacy.deletions.loading')} />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title={t('privacy.deletions.title')} description={t('privacy.deletions.description')} actions={<Button onClick={openCreate}>{t('privacy.deletions.add')}</Button>} />
      <Card title={t('privacy.deletions.filter.title')} description={t('privacy.deletions.filter.description')}>
        <div className="form-grid">
          <div className="span-4">
            <Field label={t('common.status')} htmlFor="deletion-status-filter">
              <select id="deletion-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">{t('privacy.deletions.filter.allStatuses')}</option>
                {statuses.map((status) => <option key={status} value={status}>{t(statusLabelKeys[status])}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </Card>
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      <div className="kanban">
        {statuses.map((status) => (
          <section key={status} className="kanban__column">
            <div className="space-between">
              <strong>{t(statusLabelKeys[status])}</strong>
              <Badge tone="primary">{grouped.get(status)?.length ?? 0}</Badge>
            </div>
            {(grouped.get(status) ?? []).length === 0 ? <span className="muted">{t('privacy.deletions.empty')}</span> : null}
            {(grouped.get(status) ?? []).map((item) => (
              <article key={item.id} className="kanban__card">
                <div className="space-between">
                  <strong>{item.method ?? t('privacy.deletions.unspecifiedMethod')}</strong>
                  <Badge tone={status === 'CONFIRMED' ? 'success' : status === 'REFUSED' ? 'danger' : 'warning'}>{t(statusLabelKeys[item.status])}</Badge>
                </div>
                <div className="stack stack--sm">
                  <span className="muted">{t('privacy.deletions.card.requested', { date: formatDateTime(item.requested_at) })}</span>
                  <span className="muted">{t('privacy.deletions.card.verified', { date: formatDateTime(item.verified_at) })}</span>
                  <span className="muted">{t('privacy.deletions.card.nextCheck', { date: formatDateTime(item.next_check) })}</span>
                  <span className="muted">{t('privacy.deletions.card.confirmation', { value: item.confirmation ?? '—' })}</span>
                  {item.confirmation_url ? <a href={item.confirmation_url} target="_blank" rel="noreferrer">{t('privacy.deletions.card.confirmationLink')}</a> : null}
                </div>
                <div className="inline" style={{ marginTop: '0.75rem' }}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>{t('common.edit')}</Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleting(item)}>{t('common.delete')}</Button>
                </div>
              </article>
            ))}
          </section>
        ))}
      </div>
      <Modal open={modalOpen} title={editing ? t('privacy.deletions.modal.editTitle') : t('privacy.deletions.modal.createTitle')} onClose={() => setModalOpen(false)} size="lg" footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => void save()} isLoading={submitting}>{editing ? t('common.saveChanges') : t('privacy.deletions.modal.create')}</Button></>}>
        <div className="form-grid">
          <div className="span-4"><Field label={t('common.status')} htmlFor="deletion-status"><select id="deletion-status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as DeletionRequest['status'] }))}>{statuses.map((status) => <option key={status} value={status}>{t(statusLabelKeys[status])}</option>)}</select></Field></div>
          <div className="span-4"><Field label={t('privacy.deletions.field.method')} htmlFor="deletion-method"><input id="deletion-method" value={form.method} onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))} /></Field></div>
          <div className="span-4"><Field label={t('privacy.deletions.field.brokerId')} htmlFor="deletion-broker-id"><input id="deletion-broker-id" value={form.broker_id} onChange={(event) => setForm((current) => ({ ...current, broker_id: event.target.value }))} /></Field></div>
          <div className="span-4"><Field label={t('privacy.deletions.field.findingId')} htmlFor="deletion-finding-id"><input id="deletion-finding-id" value={form.finding_id} onChange={(event) => setForm((current) => ({ ...current, finding_id: event.target.value }))} /></Field></div>
          <div className="span-4"><Field label={t('privacy.deletions.field.requestedAt')} htmlFor="deletion-requested"><input id="deletion-requested" type="datetime-local" value={form.requested_at} onChange={(event) => setForm((current) => ({ ...current, requested_at: event.target.value }))} /></Field></div>
          <div className="span-4"><Field label={t('privacy.deletions.field.verifiedAt')} htmlFor="deletion-verified"><input id="deletion-verified" type="datetime-local" value={form.verified_at} onChange={(event) => setForm((current) => ({ ...current, verified_at: event.target.value }))} /></Field></div>
          <div className="span-4"><Field label={t('privacy.deletions.field.nextCheck')} htmlFor="deletion-next-check"><input id="deletion-next-check" type="datetime-local" value={form.next_check} onChange={(event) => setForm((current) => ({ ...current, next_check: event.target.value }))} /></Field></div>
          <div className="span-4"><Field label={t('privacy.deletions.field.confirmation')} htmlFor="deletion-confirmation"><input id="deletion-confirmation" value={form.confirmation} onChange={(event) => setForm((current) => ({ ...current, confirmation: event.target.value }))} /></Field></div>
          <div className="span-4"><Field label={t('privacy.deletions.field.confirmationUrl')} htmlFor="deletion-confirmation-url"><input id="deletion-confirmation-url" value={form.confirmation_url} onChange={(event) => setForm((current) => ({ ...current, confirmation_url: event.target.value }))} /></Field></div>
          <div className="span-12"><Field label={t('common.notes')} htmlFor="deletion-notes"><textarea id="deletion-notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></Field></div>
        </div>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title={t('privacy.deletions.confirmDelete.title')} description={<p>{t('privacy.deletions.confirmDelete.description')}</p>} onClose={() => setDeleting(null)} onConfirm={() => void destroy()} isLoading={deletingBusy} />
    </div>
  )
}
