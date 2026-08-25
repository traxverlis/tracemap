import { useCallback, useMemo, useState } from 'react'

import { createDataBroker, deleteDataBroker, importCatalog, listDataBrokers, updateDataBroker } from '../api/databrokers'
import { createDeletionRequest } from '../api/deletions'
import type { DataBroker } from '../api/types'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable, type DataTableColumn } from '../components/DataTable'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { ErrorState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { useFetch } from '../hooks/useFetch'
import { useIdentity } from '../hooks/useIdentity'
import { useToast } from '../hooks/useToast'
import { useI18n } from '../i18n'
import { formatDateTime, getErrorDetail, maybeNull } from '../utils'

interface BrokerFormState {
  name: string
  domain: string
  country: string
  category: string
  search_url: string
  optout_url: string
  optout_method: string
  requires_email: boolean
  requires_phone: boolean
  requires_identity_document: boolean
  automation_possible: boolean
  notes: string
}

const emptyForm: BrokerFormState = {
  name: '',
  domain: '',
  country: '',
  category: '',
  search_url: '',
  optout_url: '',
  optout_method: '',
  requires_email: false,
  requires_phone: false,
  requires_identity_document: false,
  automation_possible: false,
  notes: '',
}

const toFormState = (broker: DataBroker): BrokerFormState => ({
  name: broker.name,
  domain: broker.domain ?? '',
  country: broker.country ?? '',
  category: broker.category ?? '',
  search_url: broker.search_url ?? '',
  optout_url: broker.optout_url ?? '',
  optout_method: broker.optout_method ?? '',
  requires_email: broker.requires_email,
  requires_phone: broker.requires_phone,
  requires_identity_document: broker.requires_identity_document,
  automation_possible: broker.automation_possible,
  notes: broker.notes ?? '',
})

export function DataBrokersPage(): JSX.Element {
  const { selectedIdentityId } = useIdentity()
  const { addToast } = useToast()
  const { t } = useI18n()
  const [country, setCountry] = useState('')
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<DataBroker | null>(null)
  const [deleting, setDeleting] = useState<DataBroker | null>(null)
  const [form, setForm] = useState<BrokerFormState>(emptyForm)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [importing, setImporting] = useState(false)

  const fetchBrokers = useCallback(
    () =>
      listDataBrokers({
        country: maybeNull(country) ?? undefined,
        category: maybeNull(category) ?? undefined,
        q: maybeNull(query) ?? undefined,
      }),
    [country, category, query],
  )

  const { data, loading, error, refetch } = useFetch(fetchBrokers, [fetchBrokers])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (broker: DataBroker) => {
    setEditing(broker)
    setForm(toFormState(broker))
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      addToast({ title: t('privacy.brokers.toast.nameRequired'), tone: 'warning' })
      return
    }
    setSubmitting(true)
    try {
      const payload: Partial<DataBroker> = {
        name: form.name.trim(),
        domain: maybeNull(form.domain),
        country: maybeNull(form.country),
        category: maybeNull(form.category),
        search_url: maybeNull(form.search_url),
        optout_url: maybeNull(form.optout_url),
        optout_method: maybeNull(form.optout_method),
        requires_email: form.requires_email,
        requires_phone: form.requires_phone,
        requires_identity_document: form.requires_identity_document,
        automation_possible: form.automation_possible,
        notes: maybeNull(form.notes),
      }
      if (editing) {
        await updateDataBroker(editing.id, payload)
        addToast({ title: t('privacy.brokers.toast.updated'), tone: 'success' })
      } else {
        await createDataBroker(payload)
        addToast({ title: t('privacy.brokers.toast.created'), tone: 'success' })
      }
      setModalOpen(false)
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('privacy.brokers.toast.saveFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  const destroy = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deleteDataBroker(deleting.id)
      addToast({ title: t('privacy.brokers.toast.deleted'), tone: 'success' })
      setDeleting(null)
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('privacy.brokers.toast.deleteFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setDeletingBusy(false)
    }
  }

  const createRequest = async (broker: DataBroker) => {
    if (!selectedIdentityId) {
      addToast({ title: t('privacy.brokers.toast.identityRequired'), description: t('privacy.brokers.toast.identityRequiredDescription'), tone: 'warning' })
      return
    }
    try {
      await createDeletionRequest({ identity_id: selectedIdentityId, broker_id: broker.id, status: 'TODO', method: broker.optout_method })
      addToast({ title: t('privacy.brokers.toast.requestCreated'), description: t('privacy.brokers.toast.requestCreatedDescription', { name: broker.name }), tone: 'success' })
    } catch (errorValue) {
      addToast({ title: t('privacy.brokers.toast.requestFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    }
  }

  const runImport = async () => {
    setImporting(true)
    try {
      const response = await importCatalog()
      addToast({ title: t('privacy.brokers.toast.importFinished'), description: t('privacy.brokers.toast.importFinishedDescription', { imported: response.imported, skipped: response.skipped }), tone: 'success' })
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('privacy.brokers.toast.importFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setImporting(false)
    }
  }

  const columns = useMemo<DataTableColumn<DataBroker>[]>(
    () => [
      { key: 'name', header: t('common.name'), render: (row) => row.name, sortValue: (row) => row.name, filterValue: (row) => row.name },
      { key: 'country', header: t('common.country'), render: (row) => row.country ?? '—', sortValue: (row) => row.country ?? '', filterValue: (row) => row.country ?? '' },
      { key: 'category', header: t('common.category'), render: (row) => row.category ?? '—', sortValue: (row) => row.category ?? '', filterValue: (row) => row.category ?? '' },
      { key: 'optout', header: t('privacy.brokers.column.optoutUrl'), render: (row) => row.optout_url ? <a href={row.optout_url} target="_blank" rel="noreferrer">{t('common.open')}</a> : '—', sortValue: (row) => row.optout_url ?? '', filterValue: (row) => row.optout_url ?? '' },
      { key: 'requirements', header: t('privacy.brokers.column.requires'), filterable: false, render: (row) => <div className="inline">{row.requires_email ? <Badge tone="warning">{t('privacy.brokers.requires.email')}</Badge> : null}{row.requires_phone ? <Badge tone="warning">{t('privacy.brokers.requires.phone')}</Badge> : null}{row.requires_identity_document ? <Badge tone="danger">{t('privacy.brokers.requires.idDocument')}</Badge> : null}</div> },
      { key: 'last_checked', header: t('privacy.brokers.column.lastChecked'), render: (row) => formatDateTime(row.last_checked), sortValue: (row) => row.last_checked ?? '' },
      { key: 'actions', header: t('common.actions'), filterable: false, render: (row) => <div className="inline" onClick={(event) => event.stopPropagation()}><Button variant="secondary" size="sm" disabled={!selectedIdentityId} title={selectedIdentityId ? t('privacy.brokers.action.createDeletionTitle') : t('privacy.brokers.action.identityRequiredTitle')} onClick={() => void createRequest(row)}>{t('privacy.brokers.action.createDeletion')}</Button><Button variant="ghost" size="sm" onClick={() => openEdit(row)}>{t('common.edit')}</Button><Button variant="danger" size="sm" onClick={() => setDeleting(row)}>{t('common.delete')}</Button></div> },
    ],
    [selectedIdentityId, t],
  )

  if (loading && !data) return <LoadingState message={t('privacy.brokers.loading')} />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title={t('privacy.brokers.title')} description={t('privacy.brokers.description')} actions={<div className="inline"><Button variant="secondary" onClick={() => void runImport()} isLoading={importing}>{t('privacy.brokers.importCatalog')}</Button><Button onClick={openCreate}>{t('privacy.brokers.add')}</Button></div>} />
      <Card title={t('privacy.brokers.filters.title')} description={t('privacy.brokers.filters.description')}>
        <div className="form-grid">
          <div className="span-4"><Field label={t('common.country')} htmlFor="broker-country-filter"><input id="broker-country-filter" value={country} onChange={(event) => setCountry(event.target.value)} /></Field></div>
          <div className="span-4"><Field label={t('common.category')} htmlFor="broker-category-filter"><input id="broker-category-filter" value={category} onChange={(event) => setCategory(event.target.value)} /></Field></div>
          <div className="span-4"><Field label={t('privacy.brokers.filters.search')} htmlFor="broker-query-filter"><input id="broker-query-filter" value={query} onChange={(event) => setQuery(event.target.value)} /></Field></div>
        </div>
      </Card>
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      <DataTable columns={columns} rows={data ?? []} rowKey={(row) => row.id} onRowClick={openEdit} emptyTitle={t('privacy.brokers.empty.title')} emptyDescription={t('privacy.brokers.empty.description')} />
      <Modal open={modalOpen} title={editing ? t('privacy.brokers.modal.editTitle') : t('privacy.brokers.modal.createTitle')} onClose={() => setModalOpen(false)} size="lg" footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => void save()} isLoading={submitting}>{editing ? t('common.saveChanges') : t('privacy.brokers.modal.create')}</Button></>}>
        <div className="form-grid">
          <div className="span-6"><Field label={t('common.name')} htmlFor="broker-name" required><input id="broker-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label={t('privacy.brokers.field.domain')} htmlFor="broker-domain"><input id="broker-domain" value={form.domain} onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value }))} /></Field></div>
          <div className="span-4"><Field label={t('common.country')} htmlFor="broker-country"><input id="broker-country" value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} /></Field></div>
          <div className="span-4"><Field label={t('common.category')} htmlFor="broker-category"><input id="broker-category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></Field></div>
          <div className="span-4"><Field label={t('privacy.brokers.field.optoutMethod')} htmlFor="broker-method"><input id="broker-method" value={form.optout_method} onChange={(event) => setForm((current) => ({ ...current, optout_method: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label={t('privacy.brokers.field.searchUrl')} htmlFor="broker-search-url"><input id="broker-search-url" value={form.search_url} onChange={(event) => setForm((current) => ({ ...current, search_url: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label={t('privacy.brokers.field.optoutUrl')} htmlFor="broker-optout-url" hint={t('privacy.brokers.field.optoutUrlHint')}><input id="broker-optout-url" value={form.optout_url} onChange={(event) => setForm((current) => ({ ...current, optout_url: event.target.value }))} /></Field></div>
          <div className="span-3"><Field label={t('privacy.brokers.field.requiresEmail')} htmlFor="broker-requires-email"><label className="checkbox-row"><input id="broker-requires-email" type="checkbox" checked={form.requires_email} onChange={(event) => setForm((current) => ({ ...current, requires_email: event.target.checked }))} /><span>{form.requires_email ? t('common.yes') : t('common.no')}</span></label></Field></div>
          <div className="span-3"><Field label={t('privacy.brokers.field.requiresPhone')} htmlFor="broker-requires-phone"><label className="checkbox-row"><input id="broker-requires-phone" type="checkbox" checked={form.requires_phone} onChange={(event) => setForm((current) => ({ ...current, requires_phone: event.target.checked }))} /><span>{form.requires_phone ? t('common.yes') : t('common.no')}</span></label></Field></div>
          <div className="span-3"><Field label={t('privacy.brokers.field.requiresIdDocument')} htmlFor="broker-requires-id"><label className="checkbox-row"><input id="broker-requires-id" type="checkbox" checked={form.requires_identity_document} onChange={(event) => setForm((current) => ({ ...current, requires_identity_document: event.target.checked }))} /><span>{form.requires_identity_document ? t('common.yes') : t('common.no')}</span></label></Field></div>
          <div className="span-3"><Field label={t('privacy.brokers.field.automationPossible')} htmlFor="broker-automation"><label className="checkbox-row"><input id="broker-automation" type="checkbox" checked={form.automation_possible} onChange={(event) => setForm((current) => ({ ...current, automation_possible: event.target.checked }))} /><span>{form.automation_possible ? t('common.yes') : t('common.no')}</span></label></Field></div>
          <div className="span-12"><Field label={t('common.notes')} htmlFor="broker-notes"><textarea id="broker-notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></Field></div>
        </div>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title={t('privacy.brokers.confirmDelete.title')} description={<p>{t('privacy.brokers.confirmDelete.description', { name: deleting?.name ?? '' })}</p>} onClose={() => setDeleting(null)} onConfirm={() => void destroy()} isLoading={deletingBusy} />
    </div>
  )
}
