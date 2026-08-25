import { useCallback, useMemo, useState } from 'react'

import { createIdentifier, deleteIdentifier, listIdentifiers, updateIdentifier } from '../api/identifiers'
import { createScan } from '../api/scans'
import type { Identifier } from '../api/types'
import { Badge } from '../components/Badge'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable, type DataTableColumn } from '../components/DataTable'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { ErrorState, IdentityRequiredState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { PhoneMask } from '../components/PhoneMask'
import { useFetch } from '../hooks/useFetch'
import { useIdentity } from '../hooks/useIdentity'
import { useToast } from '../hooks/useToast'
import { formatDateTime, getErrorDetail, maybeNull, prettyJson, safeParseJson, toNumber } from '../utils'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_TOOLS = ['maigret', 'sherlock', 'whatsmyname', 'openosint'] as const

type IdentifierType = Identifier['type']

interface IdentifierManagerPageProps {
  title: string
  description: string
  fixedType?: IdentifierType
  showUsernameScans?: boolean
  showSensitiveNotice?: boolean
}

interface IdentifierFormState {
  type: IdentifierType
  value: string
  subtype: string
  label: string
  is_active: boolean
  confidence: string
  valid_from: string
  valid_to: string
  notes: string
  country: string
  attributesText: string
}

const emptyForm = (type: IdentifierType): IdentifierFormState => ({
  type,
  value: '',
  subtype: '',
  label: '',
  is_active: true,
  confidence: '100',
  valid_from: '',
  valid_to: '',
  notes: '',
  country: '',
  attributesText: '{}',
})

const toFormState = (identifier: Identifier): IdentifierFormState => ({
  type: identifier.type,
  value: identifier.value,
  subtype: identifier.subtype ?? '',
  label: identifier.label ?? '',
  is_active: identifier.is_active,
  confidence: String(identifier.confidence),
  valid_from: identifier.valid_from ?? '',
  valid_to: identifier.valid_to ?? '',
  notes: identifier.notes ?? '',
  country: typeof identifier.attributes.country === 'string' ? identifier.attributes.country : '',
  attributesText: prettyJson(identifier.attributes),
})

export function IdentifierManagerPage({
  title,
  description,
  fixedType,
  showUsernameScans = false,
  showSensitiveNotice = false,
}: IdentifierManagerPageProps): JSX.Element {
  const { selectedIdentity, selectedIdentityId } = useIdentity()
  const { addToast } = useToast()
  const [editing, setEditing] = useState<Identifier | null>(null)
  const [deleting, setDeleting] = useState<Identifier | null>(null)
  const [form, setForm] = useState<IdentifierFormState>(emptyForm(fixedType ?? 'email'))
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingBusy, setDeletingBusy] = useState(false)

  const fetchIdentifiers = useCallback(() => {
    if (!selectedIdentityId) return Promise.resolve([])
    return listIdentifiers({ identity_id: selectedIdentityId, type: fixedType })
  }, [fixedType, selectedIdentityId])

  const { data, loading, error, refetch } = useFetch(selectedIdentityId ? fetchIdentifiers : null, [fetchIdentifiers])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm(fixedType ?? 'email'))
    setModalOpen(true)
  }

  const openEdit = (identifier: Identifier) => {
    setEditing(identifier)
    setForm(toFormState(identifier))
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm(fixedType ?? 'email'))
  }

  const canScan = Boolean(selectedIdentity?.authorization_ack)

  const save = async () => {
    if (!selectedIdentityId) return
    const targetType = fixedType ?? form.type
    const value = form.value.trim()
    if (!value) {
      addToast({ title: 'Value required', description: 'Enter a non-empty identifier value.', tone: 'warning' })
      return
    }
    if (targetType === 'email' && !EMAIL_REGEX.test(value)) {
      addToast({ title: 'Invalid email format', description: 'Use a valid email address before saving.', tone: 'warning' })
      return
    }

    setSubmitting(true)
    try {
      const attributes = safeParseJson(form.attributesText)
      const payload: Partial<Identifier> & { identity_id?: string; country?: string } = {
        identity_id: selectedIdentityId,
        type: targetType,
        value,
        subtype: maybeNull(form.subtype),
        label: maybeNull(form.label),
        is_active: form.is_active,
        confidence: toNumber(form.confidence, 100),
        valid_from: maybeNull(form.valid_from),
        valid_to: maybeNull(form.valid_to),
        notes: maybeNull(form.notes),
        attributes,
      }
      if (targetType === 'phone' && form.country.trim()) {
        payload.country = form.country.trim()
      }

      if (editing) {
        await updateIdentifier(editing.id, payload)
        addToast({ title: 'Identifier updated', tone: 'success' })
      } else {
        await createIdentifier(payload)
        addToast({ title: 'Identifier created', tone: 'success' })
      }
      closeModal()
      await refetch()
    } catch (errorValue) {
      addToast({ title: 'Unable to save identifier', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deleteIdentifier(deleting.id)
      addToast({ title: 'Identifier deleted', tone: 'success' })
      setDeleting(null)
      await refetch()
    } catch (errorValue) {
      addToast({ title: 'Unable to delete identifier', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setDeletingBusy(false)
    }
  }

  const launchUsernameScan = async (tool: string, target: string) => {
    if (!selectedIdentityId) return
    try {
      await createScan({
        identity_id: selectedIdentityId,
        tool,
        scan_type: 'username',
        target,
        parameters_json: {},
      })
      addToast({
        title: `${tool} scan queued`,
        description: `Queued a username scan for ${target}.`,
        tone: 'success',
      })
    } catch (errorValue) {
      addToast({ title: 'Unable to queue scan', description: getErrorDetail(errorValue), tone: 'danger' })
    }
  }

  const columns = useMemo<DataTableColumn<Identifier>[]>(() => {
    const baseColumns: DataTableColumn<Identifier>[] = []
    if (!fixedType) {
      baseColumns.push({
        key: 'type',
        header: 'Type',
        render: (row) => <Badge tone="primary">{row.type}</Badge>,
        sortValue: (row) => row.type,
        filterValue: (row) => row.type,
      })
    }

    baseColumns.push(
      {
        key: 'value',
        header: 'Value',
        render: (row) => {
          if (row.type === 'phone') return <PhoneMask value={row.value} />
          if (row.type === 'address') {
            return (
              <div className="stack stack--sm">
                <span>{row.value}</span>
                <Badge tone="warning">Highly Sensitive</Badge>
              </div>
            )
          }
          return <span className="mono">{row.value}</span>
        },
        sortValue: (row) => row.value,
        filterValue: (row) => row.value,
      },
      {
        key: 'label',
        header: 'Label',
        render: (row) => row.label ?? '—',
        sortValue: (row) => row.label ?? '',
        filterValue: (row) => row.label ?? '',
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <Badge tone={row.is_active ? 'success' : 'warning'}>{row.is_active ? 'Active' : 'Inactive'}</Badge>,
        sortValue: (row) => row.is_active,
        filterValue: (row) => row.is_active,
      },
      {
        key: 'confidence',
        header: 'Confidence',
        render: (row) => `${row.confidence}%`,
        sortValue: (row) => row.confidence,
      },
      {
        key: 'updated_at',
        header: 'Updated',
        render: (row) => formatDateTime(row.updated_at),
        sortValue: (row) => row.updated_at,
        filterValue: (row) => row.updated_at,
      },
      {
        key: 'actions',
        header: 'Actions',
        filterable: false,
        render: (row) => (
          <div className="inline" onClick={(event) => event.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
              Edit
            </Button>
            {showUsernameScans && row.type === 'username'
              ? USERNAME_TOOLS.map((tool) => (
                  <Button
                    key={tool}
                    variant="secondary"
                    size="sm"
                    disabled={!canScan}
                    title={
                      canScan
                        ? `Launch ${tool}`
                        : 'Authorization acknowledgement is required before running username scans.'
                    }
                    onClick={() => void launchUsernameScan(tool, row.value)}
                  >
                    {tool}
                  </Button>
                ))
              : null}
            <Button variant="danger" size="sm" onClick={() => setDeleting(row)}>
              Delete
            </Button>
          </div>
        ),
      },
    )
    return baseColumns
  }, [canScan, fixedType, showUsernameScans])

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title={title} description={description} />
        <IdentityRequiredState />
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="page-stack">
        <PageHeader title={title} description={description} />
        <LoadingState message={`Loading ${title.toLowerCase()}…`} />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="page-stack">
        <PageHeader title={title} description={description} actions={<Button variant="secondary" onClick={() => void refetch()}>Retry</Button>} />
        <ErrorState message={error} onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="page-stack">
      <PageHeader title={title} description={description} actions={<Button onClick={openCreate}>Add {fixedType ?? 'identifier'}</Button>} />

      {showUsernameScans && !selectedIdentity?.authorization_ack ? (
        <div className="warning-banner">
          I own this identity or I have explicit written authorisation to audit it must be acknowledged before running username scans.
        </div>
      ) : null}

      {showSensitiveNotice ? (
        <div className="warning-banner">
          Address data is highly sensitive. Record only what is necessary and verify authorisation before storing it.
        </div>
      ) : null}

      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}

      <DataTable
        columns={columns}
        rows={data ?? []}
        rowKey={(row) => row.id}
        showFilters
        onRowClick={openEdit}
        emptyTitle={`No ${title.toLowerCase()} yet`}
        emptyDescription="Create your first record to begin tracking this identity."
      />

      <Modal
        open={modalOpen}
        title={editing ? `Edit ${editing.type}` : `Add ${fixedType ?? form.type}`}
        onClose={closeModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={() => void save()} isLoading={submitting}>
              {editing ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="form-grid">
          {!fixedType ? (
            <div className="span-4">
              <Field label="Type" htmlFor="identifier-type">
                <select
                  id="identifier-type"
                  value={form.type}
                  onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as IdentifierType }))}
                >
                  {['email', 'phone', 'username', 'name', 'address', 'domain'].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : null}
          <div className="span-6">
            <Field label="Value" htmlFor="identifier-value" required>
              <input id="identifier-value" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} />
            </Field>
          </div>
          <div className="span-3">
            <Field label="Confidence" htmlFor="identifier-confidence">
              <input id="identifier-confidence" type="number" min={0} max={100} value={form.confidence} onChange={(event) => setForm((current) => ({ ...current, confidence: event.target.value }))} />
            </Field>
          </div>
          <div className="span-3">
            <Field label="Label" htmlFor="identifier-label">
              <input id="identifier-label" value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} />
            </Field>
          </div>
          <div className="span-3">
            <Field label="Subtype" htmlFor="identifier-subtype">
              <input id="identifier-subtype" value={form.subtype} onChange={(event) => setForm((current) => ({ ...current, subtype: event.target.value }))} />
            </Field>
          </div>
          {(fixedType ?? form.type) === 'phone' ? (
            <div className="span-3">
              <Field label="Country hint" htmlFor="identifier-country" hint="ISO country code">
                <input id="identifier-country" value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} />
              </Field>
            </div>
          ) : null}
          <div className="span-3">
            <Field label="Valid from" htmlFor="identifier-valid-from">
              <input id="identifier-valid-from" type="date" value={form.valid_from} onChange={(event) => setForm((current) => ({ ...current, valid_from: event.target.value }))} />
            </Field>
          </div>
          <div className="span-3">
            <Field label="Valid to" htmlFor="identifier-valid-to">
              <input id="identifier-valid-to" type="date" value={form.valid_to} onChange={(event) => setForm((current) => ({ ...current, valid_to: event.target.value }))} />
            </Field>
          </div>
          <div className="span-3">
            <Field label="Active" htmlFor="identifier-active">
              <label className="checkbox-row">
                <input id="identifier-active" type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
                <span>{form.is_active ? 'Yes' : 'No'}</span>
              </label>
            </Field>
          </div>
          <div className="span-12">
            <Field label="Notes" htmlFor="identifier-notes">
              <textarea id="identifier-notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </Field>
          </div>
          <div className="span-12">
            <Field label="Attributes JSON" htmlFor="identifier-attributes" hint="Optional extra metadata as a JSON object.">
              <textarea id="identifier-attributes" value={form.attributesText} onChange={(event) => setForm((current) => ({ ...current, attributesText: event.target.value }))} />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete identifier"
        description={<p>Remove {deleting?.value} from this identity?</p>}
        onClose={() => setDeleting(null)}
        onConfirm={() => void remove()}
        isLoading={deletingBusy}
      />
    </div>
  )
}
