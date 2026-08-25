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
      addToast({ title: 'Broker name required', tone: 'warning' })
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
        addToast({ title: 'Data broker updated', tone: 'success' })
      } else {
        await createDataBroker(payload)
        addToast({ title: 'Data broker created', tone: 'success' })
      }
      setModalOpen(false)
      await refetch()
    } catch (errorValue) {
      addToast({ title: 'Unable to save data broker', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  const destroy = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deleteDataBroker(deleting.id)
      addToast({ title: 'Data broker deleted', tone: 'success' })
      setDeleting(null)
      await refetch()
    } catch (errorValue) {
      addToast({ title: 'Unable to delete data broker', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setDeletingBusy(false)
    }
  }

  const createRequest = async (broker: DataBroker) => {
    if (!selectedIdentityId) {
      addToast({ title: 'Select an identity first', description: 'Deletion requests must be associated with an identity.', tone: 'warning' })
      return
    }
    try {
      await createDeletionRequest({ identity_id: selectedIdentityId, broker_id: broker.id, status: 'TODO', method: broker.optout_method })
      addToast({ title: 'Deletion request created', description: `Created a TODO request for ${broker.name}.`, tone: 'success' })
    } catch (errorValue) {
      addToast({ title: 'Unable to create deletion request', description: getErrorDetail(errorValue), tone: 'danger' })
    }
  }

  const runImport = async () => {
    setImporting(true)
    try {
      const response = await importCatalog()
      addToast({ title: 'Catalog import finished', description: `Imported ${response.imported}, skipped ${response.skipped}.`, tone: 'success' })
      await refetch()
    } catch (errorValue) {
      addToast({ title: 'Catalog import failed', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setImporting(false)
    }
  }

  const columns = useMemo<DataTableColumn<DataBroker>[]>(
    () => [
      { key: 'name', header: 'Name', render: (row) => row.name, sortValue: (row) => row.name, filterValue: (row) => row.name },
      { key: 'country', header: 'Country', render: (row) => row.country ?? '—', sortValue: (row) => row.country ?? '', filterValue: (row) => row.country ?? '' },
      { key: 'category', header: 'Category', render: (row) => row.category ?? '—', sortValue: (row) => row.category ?? '', filterValue: (row) => row.category ?? '' },
      { key: 'optout', header: 'Opt-out URL', render: (row) => row.optout_url ? <a href={row.optout_url} target="_blank" rel="noreferrer">Open</a> : '—', sortValue: (row) => row.optout_url ?? '', filterValue: (row) => row.optout_url ?? '' },
      { key: 'requirements', header: 'Requires', filterable: false, render: (row) => <div className="inline">{row.requires_email ? <Badge tone="warning">Email</Badge> : null}{row.requires_phone ? <Badge tone="warning">Phone</Badge> : null}{row.requires_identity_document ? <Badge tone="danger">ID doc</Badge> : null}</div> },
      { key: 'last_checked', header: 'Last checked', render: (row) => formatDateTime(row.last_checked), sortValue: (row) => row.last_checked ?? '' },
      { key: 'actions', header: 'Actions', filterable: false, render: (row) => <div className="inline" onClick={(event) => event.stopPropagation()}><Button variant="secondary" size="sm" disabled={!selectedIdentityId} title={selectedIdentityId ? 'Create deletion request' : 'Select an identity first'} onClick={() => void createRequest(row)}>Create deletion</Button><Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button><Button variant="danger" size="sm" onClick={() => setDeleting(row)}>Delete</Button></div> },
    ],
    [selectedIdentityId],
  )

  if (loading && !data) return <LoadingState message="Loading data brokers…" />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title="Data brokers" description="Catalog data brokers, search URLs, and opt-out workflows without fabricating any URLs or methods." actions={<div className="inline"><Button variant="secondary" onClick={() => void runImport()} isLoading={importing}>Import catalog</Button><Button onClick={openCreate}>Add broker</Button></div>} />
      <Card title="Filters" description="Search by country, category, or free text.">
        <div className="form-grid">
          <div className="span-4"><Field label="Country" htmlFor="broker-country-filter"><input id="broker-country-filter" value={country} onChange={(event) => setCountry(event.target.value)} /></Field></div>
          <div className="span-4"><Field label="Category" htmlFor="broker-category-filter"><input id="broker-category-filter" value={category} onChange={(event) => setCategory(event.target.value)} /></Field></div>
          <div className="span-4"><Field label="Search" htmlFor="broker-query-filter"><input id="broker-query-filter" value={query} onChange={(event) => setQuery(event.target.value)} /></Field></div>
        </div>
      </Card>
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      <DataTable columns={columns} rows={data ?? []} rowKey={(row) => row.id} onRowClick={openEdit} emptyTitle="No data brokers found" emptyDescription="Create or import the catalog to manage privacy removal workflows." />
      <Modal open={modalOpen} title={editing ? 'Edit data broker' : 'Add data broker'} onClose={() => setModalOpen(false)} size="lg" footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => void save()} isLoading={submitting}>{editing ? 'Save changes' : 'Create broker'}</Button></>}>
        <div className="form-grid">
          <div className="span-6"><Field label="Name" htmlFor="broker-name" required><input id="broker-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label="Domain" htmlFor="broker-domain"><input id="broker-domain" value={form.domain} onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value }))} /></Field></div>
          <div className="span-4"><Field label="Country" htmlFor="broker-country"><input id="broker-country" value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} /></Field></div>
          <div className="span-4"><Field label="Category" htmlFor="broker-category"><input id="broker-category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></Field></div>
          <div className="span-4"><Field label="Opt-out method" htmlFor="broker-method"><input id="broker-method" value={form.optout_method} onChange={(event) => setForm((current) => ({ ...current, optout_method: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label="Search URL" htmlFor="broker-search-url"><input id="broker-search-url" value={form.search_url} onChange={(event) => setForm((current) => ({ ...current, search_url: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label="Opt-out URL" htmlFor="broker-optout-url" hint="Enter only what is provided by your API or research."><input id="broker-optout-url" value={form.optout_url} onChange={(event) => setForm((current) => ({ ...current, optout_url: event.target.value }))} /></Field></div>
          <div className="span-3"><Field label="Requires email" htmlFor="broker-requires-email"><label className="checkbox-row"><input id="broker-requires-email" type="checkbox" checked={form.requires_email} onChange={(event) => setForm((current) => ({ ...current, requires_email: event.target.checked }))} /><span>{form.requires_email ? 'Yes' : 'No'}</span></label></Field></div>
          <div className="span-3"><Field label="Requires phone" htmlFor="broker-requires-phone"><label className="checkbox-row"><input id="broker-requires-phone" type="checkbox" checked={form.requires_phone} onChange={(event) => setForm((current) => ({ ...current, requires_phone: event.target.checked }))} /><span>{form.requires_phone ? 'Yes' : 'No'}</span></label></Field></div>
          <div className="span-3"><Field label="Requires ID document" htmlFor="broker-requires-id"><label className="checkbox-row"><input id="broker-requires-id" type="checkbox" checked={form.requires_identity_document} onChange={(event) => setForm((current) => ({ ...current, requires_identity_document: event.target.checked }))} /><span>{form.requires_identity_document ? 'Yes' : 'No'}</span></label></Field></div>
          <div className="span-3"><Field label="Automation possible" htmlFor="broker-automation"><label className="checkbox-row"><input id="broker-automation" type="checkbox" checked={form.automation_possible} onChange={(event) => setForm((current) => ({ ...current, automation_possible: event.target.checked }))} /><span>{form.automation_possible ? 'Yes' : 'No'}</span></label></Field></div>
          <div className="span-12"><Field label="Notes" htmlFor="broker-notes"><textarea id="broker-notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></Field></div>
        </div>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete data broker" description={<p>Delete {deleting?.name} from the catalog?</p>} onClose={() => setDeleting(null)} onConfirm={() => void destroy()} isLoading={deletingBusy} />
    </div>
  )
}
