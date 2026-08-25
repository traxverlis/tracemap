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
import { useI18n, type TranslationKey } from '../i18n'
import { formatDateTime, getErrorDetail, maybeNull, prettyJson, safeParseJson, toNumber } from '../utils'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_TOOLS = ['maigret', 'sherlock', 'whatsmyname', 'openosint'] as const

type IdentifierType = Identifier['type']

/** `'all'` covers the unfiltered inventory page, which has no fixed type. */
type IdentifierScope = IdentifierType | 'all'

const IDENTIFIER_TYPES: readonly IdentifierType[] = ['email', 'phone', 'username', 'name', 'address', 'domain']

const TYPE_LABEL_KEYS: Record<IdentifierType, TranslationKey> = {
  email: 'identifiers.type.email',
  phone: 'identifiers.type.phone',
  username: 'identifiers.type.username',
  name: 'identifiers.type.name',
  address: 'identifiers.type.address',
  domain: 'identifiers.type.domain',
}

const ADD_LABEL_KEYS: Record<IdentifierScope, TranslationKey> = {
  all: 'identifiers.add.all',
  email: 'identifiers.add.email',
  phone: 'identifiers.add.phone',
  username: 'identifiers.add.username',
  name: 'identifiers.add.name',
  address: 'identifiers.add.address',
  domain: 'identifiers.add.domain',
}

const EDIT_LABEL_KEYS: Record<IdentifierType, TranslationKey> = {
  email: 'identifiers.edit.email',
  phone: 'identifiers.edit.phone',
  username: 'identifiers.edit.username',
  name: 'identifiers.edit.name',
  address: 'identifiers.edit.address',
  domain: 'identifiers.edit.domain',
}

const LOADING_KEYS: Record<IdentifierScope, TranslationKey> = {
  all: 'identifiers.loading.all',
  email: 'identifiers.loading.email',
  phone: 'identifiers.loading.phone',
  username: 'identifiers.loading.username',
  name: 'identifiers.loading.name',
  address: 'identifiers.loading.address',
  domain: 'identifiers.loading.domain',
}

const EMPTY_TITLE_KEYS: Record<IdentifierScope, TranslationKey> = {
  all: 'identifiers.empty.all',
  email: 'identifiers.empty.email',
  phone: 'identifiers.empty.phone',
  username: 'identifiers.empty.username',
  name: 'identifiers.empty.name',
  address: 'identifiers.empty.address',
  domain: 'identifiers.empty.domain',
}

interface IdentifierManagerPageProps {
  titleKey: TranslationKey
  descriptionKey: TranslationKey
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
  titleKey,
  descriptionKey,
  fixedType,
  showUsernameScans = false,
  showSensitiveNotice = false,
}: IdentifierManagerPageProps): JSX.Element {
  const { selectedIdentity, selectedIdentityId } = useIdentity()
  const { addToast } = useToast()
  const { t } = useI18n()
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

  const scope: IdentifierScope = fixedType ?? 'all'
  const title = t(titleKey)
  const description = t(descriptionKey)

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
      addToast({
        title: t('identifiers.toast.valueRequired.title'),
        description: t('identifiers.toast.valueRequired.description'),
        tone: 'warning',
      })
      return
    }
    if (targetType === 'email' && !EMAIL_REGEX.test(value)) {
      addToast({
        title: t('identifiers.toast.invalidEmail.title'),
        description: t('identifiers.toast.invalidEmail.description'),
        tone: 'warning',
      })
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
        addToast({ title: t('identifiers.toast.updated'), tone: 'success' })
      } else {
        await createIdentifier(payload)
        addToast({ title: t('identifiers.toast.created'), tone: 'success' })
      }
      closeModal()
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('identifiers.toast.saveFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deleteIdentifier(deleting.id)
      addToast({ title: t('identifiers.toast.deleted'), tone: 'success' })
      setDeleting(null)
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('identifiers.toast.deleteFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
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
        title: t('identifiers.toast.scanQueued.title', { tool }),
        description: t('identifiers.toast.scanQueued.description', { target }),
        tone: 'success',
      })
    } catch (errorValue) {
      addToast({ title: t('identifiers.toast.scanFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    }
  }

  const columns = useMemo<DataTableColumn<Identifier>[]>(() => {
    const baseColumns: DataTableColumn<Identifier>[] = []
    if (!fixedType) {
      baseColumns.push({
        key: 'type',
        header: t('common.type'),
        render: (row) => <Badge tone="primary">{t(TYPE_LABEL_KEYS[row.type])}</Badge>,
        sortValue: (row) => row.type,
        filterValue: (row) => row.type,
      })
    }

    baseColumns.push(
      {
        key: 'value',
        header: t('common.value'),
        render: (row) => {
          if (row.type === 'phone') return <PhoneMask value={row.value} />
          if (row.type === 'address') {
            return (
              <div className="stack stack--sm">
                <span>{row.value}</span>
                <Badge tone="warning">{t('identifiers.highlySensitive')}</Badge>
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
        header: t('common.label'),
        render: (row) => row.label ?? '—',
        sortValue: (row) => row.label ?? '',
        filterValue: (row) => row.label ?? '',
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (row) => (
          <Badge tone={row.is_active ? 'success' : 'warning'}>
            {row.is_active ? t('common.active') : t('common.inactive')}
          </Badge>
        ),
        sortValue: (row) => row.is_active,
        filterValue: (row) => row.is_active,
      },
      {
        key: 'confidence',
        header: t('common.confidence'),
        render: (row) => `${row.confidence}%`,
        sortValue: (row) => row.confidence,
      },
      {
        key: 'updated_at',
        header: t('common.updated'),
        render: (row) => formatDateTime(row.updated_at),
        sortValue: (row) => row.updated_at,
        filterValue: (row) => row.updated_at,
      },
      {
        key: 'actions',
        header: t('common.actions'),
        filterable: false,
        render: (row) => (
          <div className="inline" onClick={(event) => event.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
              {t('common.edit')}
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
                        ? t('identifiers.scan.launch', { tool })
                        : t('identifiers.scan.authorizationRequired')
                    }
                    onClick={() => void launchUsernameScan(tool, row.value)}
                  >
                    {tool}
                  </Button>
                ))
              : null}
            <Button variant="danger" size="sm" onClick={() => setDeleting(row)}>
              {t('common.delete')}
            </Button>
          </div>
        ),
      },
    )
    return baseColumns
  }, [canScan, fixedType, showUsernameScans, t])

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
        <LoadingState message={t(LOADING_KEYS[scope])} />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="page-stack">
        <PageHeader title={title} description={description} actions={<Button variant="secondary" onClick={() => void refetch()}>{t('common.retry')}</Button>} />
        <ErrorState message={error} onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="page-stack">
      <PageHeader title={title} description={description} actions={<Button onClick={openCreate}>{t(ADD_LABEL_KEYS[scope])}</Button>} />

      {showUsernameScans && !selectedIdentity?.authorization_ack ? (
        <div className="warning-banner">{t('identifiers.banner.authorizationRequired')}</div>
      ) : null}

      {showSensitiveNotice ? (
        <div className="warning-banner">{t('identifiers.banner.sensitiveAddresses')}</div>
      ) : null}

      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}

      <DataTable
        columns={columns}
        rows={data ?? []}
        rowKey={(row) => row.id}
        showFilters
        onRowClick={openEdit}
        emptyTitle={t(EMPTY_TITLE_KEYS[scope])}
        emptyDescription={t('identifiers.emptyDescription')}
      />

      <Modal
        open={modalOpen}
        title={editing ? t(EDIT_LABEL_KEYS[editing.type]) : t(ADD_LABEL_KEYS[fixedType ?? form.type])}
        onClose={closeModal}
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void save()} isLoading={submitting}>
              {editing ? t('common.saveChanges') : t('common.create')}
            </Button>
          </>
        }
      >
        <div className="form-grid">
          {!fixedType ? (
            <div className="span-4">
              <Field label={t('common.type')} htmlFor="identifier-type">
                <select
                  id="identifier-type"
                  value={form.type}
                  onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as IdentifierType }))}
                >
                  {IDENTIFIER_TYPES.map((item) => (
                    <option key={item} value={item}>
                      {t(TYPE_LABEL_KEYS[item])}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : null}
          <div className="span-6">
            <Field label={t('common.value')} htmlFor="identifier-value" required>
              <input id="identifier-value" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} />
            </Field>
          </div>
          <div className="span-3">
            <Field label={t('common.confidence')} htmlFor="identifier-confidence">
              <input id="identifier-confidence" type="number" min={0} max={100} value={form.confidence} onChange={(event) => setForm((current) => ({ ...current, confidence: event.target.value }))} />
            </Field>
          </div>
          <div className="span-3">
            <Field label={t('common.label')} htmlFor="identifier-label">
              <input id="identifier-label" value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} />
            </Field>
          </div>
          <div className="span-3">
            <Field label={t('identifiers.field.subtype')} htmlFor="identifier-subtype">
              <input id="identifier-subtype" value={form.subtype} onChange={(event) => setForm((current) => ({ ...current, subtype: event.target.value }))} />
            </Field>
          </div>
          {(fixedType ?? form.type) === 'phone' ? (
            <div className="span-3">
              <Field label={t('identifiers.field.countryHint')} htmlFor="identifier-country" hint={t('identifiers.field.countryHintHelp')}>
                <input id="identifier-country" value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} />
              </Field>
            </div>
          ) : null}
          <div className="span-3">
            <Field label={t('identifiers.field.validFrom')} htmlFor="identifier-valid-from">
              <input id="identifier-valid-from" type="date" value={form.valid_from} onChange={(event) => setForm((current) => ({ ...current, valid_from: event.target.value }))} />
            </Field>
          </div>
          <div className="span-3">
            <Field label={t('identifiers.field.validTo')} htmlFor="identifier-valid-to">
              <input id="identifier-valid-to" type="date" value={form.valid_to} onChange={(event) => setForm((current) => ({ ...current, valid_to: event.target.value }))} />
            </Field>
          </div>
          <div className="span-3">
            <Field label={t('common.active')} htmlFor="identifier-active">
              <label className="checkbox-row">
                <input id="identifier-active" type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
                <span>{form.is_active ? t('common.yes') : t('common.no')}</span>
              </label>
            </Field>
          </div>
          <div className="span-12">
            <Field label={t('common.notes')} htmlFor="identifier-notes">
              <textarea id="identifier-notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </Field>
          </div>
          <div className="span-12">
            <Field label={t('identifiers.field.attributes')} htmlFor="identifier-attributes" hint={t('identifiers.field.attributesHint')}>
              <textarea id="identifier-attributes" value={form.attributesText} onChange={(event) => setForm((current) => ({ ...current, attributesText: event.target.value }))} />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('identifiers.delete.title')}
        description={<p>{t('identifiers.delete.description', { value: deleting?.value ?? '' })}</p>}
        onClose={() => setDeleting(null)}
        onConfirm={() => void remove()}
        isLoading={deletingBusy}
      />
    </div>
  )
}
