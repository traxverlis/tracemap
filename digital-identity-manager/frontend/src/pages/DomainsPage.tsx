import { useCallback, useMemo, useState } from 'react'

import { createDomain, deleteDomain, listDomains, updateDomain } from '../api/domains'
import type { Domain } from '../api/types'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable, type DataTableColumn } from '../components/DataTable'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { ErrorState, IdentityRequiredState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { useFetch } from '../hooks/useFetch'
import { useIdentity } from '../hooks/useIdentity'
import { useToast } from '../hooks/useToast'
import { useI18n } from '../i18n'
import { formatDate, getErrorDetail, maybeNull } from '../utils'

interface DomainFormState {
  domain: string
  known_owner: string
  registrar: string
  status: string
  valid_from: string
  valid_to: string
  notes: string
}

const emptyForm: DomainFormState = {
  domain: '',
  known_owner: '',
  registrar: '',
  status: '',
  valid_from: '',
  valid_to: '',
  notes: '',
}

const toFormState = (domain: Domain): DomainFormState => ({
  domain: domain.domain,
  known_owner: domain.known_owner ?? '',
  registrar: domain.registrar ?? '',
  status: domain.status ?? '',
  valid_from: domain.valid_from ?? '',
  valid_to: domain.valid_to ?? '',
  notes: domain.notes ?? '',
})

export function DomainsPage(): JSX.Element {
  const { selectedIdentityId } = useIdentity()
  const { addToast } = useToast()
  const { t } = useI18n()
  const [editing, setEditing] = useState<Domain | null>(null)
  const [deleting, setDeleting] = useState<Domain | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<DomainFormState>(emptyForm)

  const fetchDomains = useCallback(() => {
    if (!selectedIdentityId) return Promise.resolve([])
    return listDomains({ identity_id: selectedIdentityId })
  }, [selectedIdentityId])

  const { data, loading, error, refetch } = useFetch(selectedIdentityId ? fetchDomains : null, [fetchDomains])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (domain: Domain) => {
    setEditing(domain)
    setForm(toFormState(domain))
    setModalOpen(true)
  }

  const save = async () => {
    if (!selectedIdentityId || !form.domain.trim()) {
      addToast({ title: t('inventory.domains.domainRequired'), tone: 'warning' })
      return
    }
    setSubmitting(true)
    try {
      const payload: Partial<Domain> = {
        identity_id: selectedIdentityId,
        domain: form.domain.trim(),
        known_owner: maybeNull(form.known_owner),
        registrar: maybeNull(form.registrar),
        status: maybeNull(form.status),
        valid_from: maybeNull(form.valid_from),
        valid_to: maybeNull(form.valid_to),
        notes: maybeNull(form.notes),
      }
      if (editing) {
        await updateDomain(editing.id, payload)
        addToast({ title: t('inventory.domains.updated'), tone: 'success' })
      } else {
        await createDomain(payload)
        addToast({ title: t('inventory.domains.created'), tone: 'success' })
      }
      setModalOpen(false)
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('inventory.domains.saveFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  const destroy = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deleteDomain(deleting.id)
      addToast({ title: t('inventory.domains.deleted'), tone: 'success' })
      setDeleting(null)
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('inventory.domains.deleteFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setDeletingBusy(false)
    }
  }

  const columns = useMemo<DataTableColumn<Domain>[]>(
    () => [
      { key: 'domain', header: t('inventory.domains.domain'), render: (row) => row.domain, sortValue: (row) => row.domain, filterValue: (row) => row.domain },
      { key: 'owner', header: t('inventory.domains.owner'), render: (row) => row.known_owner ?? '—', sortValue: (row) => row.known_owner ?? '', filterValue: (row) => row.known_owner ?? '' },
      { key: 'registrar', header: t('inventory.domains.registrar'), render: (row) => row.registrar ?? '—', sortValue: (row) => row.registrar ?? '', filterValue: (row) => row.registrar ?? '' },
      { key: 'status', header: t('common.status'), render: (row) => row.status ?? '—', sortValue: (row) => row.status ?? '', filterValue: (row) => row.status ?? '' },
      { key: 'validity', header: t('inventory.domains.validity'), render: (row) => `${formatDate(row.valid_from)} → ${formatDate(row.valid_to)}`, sortValue: (row) => row.valid_from ?? '' },
      { key: 'actions', header: t('common.actions'), filterable: false, render: (row) => <div className="inline" onClick={(event) => event.stopPropagation()}><Button variant="ghost" size="sm" onClick={() => openEdit(row)}>{t('common.edit')}</Button><Button variant="danger" size="sm" onClick={() => setDeleting(row)}>{t('common.delete')}</Button></div> },
    ],
    [t],
  )

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title={t('inventory.domains.title')} description={t('inventory.domains.identityDescription')} />
        <IdentityRequiredState />
      </div>
    )
  }

  if (loading && !data) return <LoadingState message={t('inventory.domains.loading')} />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title={t('inventory.domains.title')} description={t('inventory.domains.description')} actions={<Button onClick={openCreate}>{t('inventory.domains.add')}</Button>} />
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      <DataTable columns={columns} rows={data ?? []} rowKey={(row) => row.id} showFilters onRowClick={openEdit} emptyTitle={t('inventory.domains.emptyTitle')} emptyDescription={t('inventory.domains.emptyDescription')} />
      <Modal open={modalOpen} title={editing ? t('inventory.domains.edit') : t('inventory.domains.add')} onClose={() => setModalOpen(false)} footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => void save()} isLoading={submitting}>{editing ? t('common.saveChanges') : t('inventory.domains.create')}</Button></>}>
        <div className="form-grid">
          <div className="span-6"><Field label={t('inventory.domains.domain')} htmlFor="domain-domain" required><input id="domain-domain" value={form.domain} onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label={t('inventory.domains.knownOwner')} htmlFor="domain-owner"><input id="domain-owner" value={form.known_owner} onChange={(event) => setForm((current) => ({ ...current, known_owner: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label={t('inventory.domains.registrar')} htmlFor="domain-registrar"><input id="domain-registrar" value={form.registrar} onChange={(event) => setForm((current) => ({ ...current, registrar: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label={t('common.status')} htmlFor="domain-status"><input id="domain-status" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} /></Field></div>
          <div className="span-3"><Field label={t('inventory.domains.validFrom')} htmlFor="domain-from"><input id="domain-from" type="date" value={form.valid_from} onChange={(event) => setForm((current) => ({ ...current, valid_from: event.target.value }))} /></Field></div>
          <div className="span-3"><Field label={t('inventory.domains.validTo')} htmlFor="domain-to"><input id="domain-to" type="date" value={form.valid_to} onChange={(event) => setForm((current) => ({ ...current, valid_to: event.target.value }))} /></Field></div>
          <div className="span-12"><Field label={t('common.notes')} htmlFor="domain-notes"><textarea id="domain-notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></Field></div>
        </div>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title={t('inventory.domains.deleteTitle')} description={<p>{t('inventory.domains.deleteConfirm')}</p>} onClose={() => setDeleting(null)} onConfirm={() => void destroy()} isLoading={deletingBusy} />
    </div>
  )
}
