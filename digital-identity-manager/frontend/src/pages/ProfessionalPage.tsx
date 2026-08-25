import { useCallback, useMemo, useState } from 'react'

import { createCompany, deleteCompany, listCompanies, updateCompany } from '../api/companies'
import type { Company } from '../api/types'
import { Badge } from '../components/Badge'
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

interface CompanyFormState {
  name: string
  position: string
  website: string
  professional_profile_url: string
  professional_domain: string
  valid_from: string
  valid_to: string
  is_former: boolean
  notes: string
}

const emptyForm: CompanyFormState = {
  name: '',
  position: '',
  website: '',
  professional_profile_url: '',
  professional_domain: '',
  valid_from: '',
  valid_to: '',
  is_former: false,
  notes: '',
}

const toFormState = (company: Company): CompanyFormState => ({
  name: company.name,
  position: company.position ?? '',
  website: company.website ?? '',
  professional_profile_url: company.professional_profile_url ?? '',
  professional_domain: company.professional_domain ?? '',
  valid_from: company.valid_from ?? '',
  valid_to: company.valid_to ?? '',
  is_former: company.is_former,
  notes: company.notes ?? '',
})

export function ProfessionalPage(): JSX.Element {
  const { selectedIdentityId } = useIdentity()
  const { addToast } = useToast()
  const { t } = useI18n()
  const [editing, setEditing] = useState<Company | null>(null)
  const [form, setForm] = useState<CompanyFormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<Company | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchCompanies = useCallback(() => {
    if (!selectedIdentityId) return Promise.resolve([])
    return listCompanies({ identity_id: selectedIdentityId })
  }, [selectedIdentityId])

  const { data, loading, error, refetch } = useFetch(selectedIdentityId ? fetchCompanies : null, [fetchCompanies])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (company: Company) => {
    setEditing(company)
    setForm(toFormState(company))
    setModalOpen(true)
  }

  const save = async () => {
    if (!selectedIdentityId || !form.name.trim()) {
      addToast({ title: t('identifiers.professional.toast.nameRequired'), tone: 'warning' })
      return
    }
    setSubmitting(true)
    try {
      const payload: Partial<Company> = {
        identity_id: selectedIdentityId,
        name: form.name.trim(),
        position: maybeNull(form.position),
        website: maybeNull(form.website),
        professional_profile_url: maybeNull(form.professional_profile_url),
        professional_domain: maybeNull(form.professional_domain),
        valid_from: maybeNull(form.valid_from),
        valid_to: maybeNull(form.valid_to),
        is_former: form.is_former,
        notes: maybeNull(form.notes),
      }
      if (editing) {
        await updateCompany(editing.id, payload)
        addToast({ title: t('identifiers.professional.toast.updated'), tone: 'success' })
      } else {
        await createCompany(payload)
        addToast({ title: t('identifiers.professional.toast.created'), tone: 'success' })
      }
      setModalOpen(false)
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('identifiers.professional.toast.saveFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  const destroy = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deleteCompany(deleting.id)
      addToast({ title: t('identifiers.professional.toast.removed'), tone: 'success' })
      setDeleting(null)
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('identifiers.professional.toast.deleteFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setDeletingBusy(false)
    }
  }

  const columns = useMemo<DataTableColumn<Company>[]>(
    () => [
      { key: 'name', header: t('identifiers.professional.company'), render: (row) => row.name, sortValue: (row) => row.name, filterValue: (row) => row.name },
      { key: 'position', header: t('identifiers.professional.position'), render: (row) => row.position ?? '—', sortValue: (row) => row.position ?? '', filterValue: (row) => row.position ?? '' },
      { key: 'domain', header: t('identifiers.professional.domain'), render: (row) => row.professional_domain ?? '—', sortValue: (row) => row.professional_domain ?? '', filterValue: (row) => row.professional_domain ?? '' },
      { key: 'status', header: t('identifiers.professional.timeline'), render: (row) => <Badge tone={row.is_former ? 'warning' : 'success'}>{row.is_former ? t('identifiers.professional.former') : t('identifiers.professional.current')}</Badge>, sortValue: (row) => row.is_former },
      { key: 'dates', header: t('identifiers.professional.dates'), render: (row) => `${formatDate(row.valid_from)} → ${formatDate(row.valid_to)}`, sortValue: (row) => row.valid_from ?? '' },
      {
        key: 'actions',
        header: t('common.actions'),
        filterable: false,
        render: (row) => (
          <div className="inline" onClick={(event) => event.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>{t('common.edit')}</Button>
            <Button variant="danger" size="sm" onClick={() => setDeleting(row)}>{t('common.delete')}</Button>
          </div>
        ),
      },
    ],
    [t],
  )

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title={t('identifiers.professional.title')} description={t('identifiers.professional.descriptionFull')} />
        <IdentityRequiredState />
      </div>
    )
  }

  if (loading && !data) return <LoadingState message={t('identifiers.professional.loading')} />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title={t('identifiers.professional.title')} description={t('identifiers.professional.description')} actions={<Button onClick={openCreate}>{t('identifiers.professional.add')}</Button>} />
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      <DataTable columns={columns} rows={data ?? []} rowKey={(row) => row.id} showFilters onRowClick={openEdit} emptyTitle={t('identifiers.professional.emptyTitle')} emptyDescription={t('identifiers.professional.emptyDescription')} />
      <Modal open={modalOpen} title={editing ? t('identifiers.professional.editRole') : t('identifiers.professional.addRole')} onClose={() => setModalOpen(false)} footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => void save()} isLoading={submitting}>{editing ? t('common.saveChanges') : t('identifiers.professional.createRole')}</Button></>}>
        <div className="form-grid">
          <div className="span-6"><Field label={t('identifiers.professional.company')} htmlFor="company-name" required><input id="company-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label={t('identifiers.professional.position')} htmlFor="company-position"><input id="company-position" value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label={t('identifiers.professional.field.website')} htmlFor="company-website"><input id="company-website" value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label={t('identifiers.professional.field.profileUrl')} htmlFor="company-profile"><input id="company-profile" value={form.professional_profile_url} onChange={(event) => setForm((current) => ({ ...current, professional_profile_url: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label={t('identifiers.professional.field.domain')} htmlFor="company-domain"><input id="company-domain" value={form.professional_domain} onChange={(event) => setForm((current) => ({ ...current, professional_domain: event.target.value }))} /></Field></div>
          <div className="span-3"><Field label={t('identifiers.field.validFrom')} htmlFor="company-from"><input id="company-from" type="date" value={form.valid_from} onChange={(event) => setForm((current) => ({ ...current, valid_from: event.target.value }))} /></Field></div>
          <div className="span-3"><Field label={t('identifiers.field.validTo')} htmlFor="company-to"><input id="company-to" type="date" value={form.valid_to} onChange={(event) => setForm((current) => ({ ...current, valid_to: event.target.value }))} /></Field></div>
          <div className="span-3"><Field label={t('identifiers.professional.field.formerRole')} htmlFor="company-former"><label className="checkbox-row"><input id="company-former" type="checkbox" checked={form.is_former} onChange={(event) => setForm((current) => ({ ...current, is_former: event.target.checked }))} /><span>{form.is_former ? t('identifiers.professional.former') : t('identifiers.professional.current')}</span></label></Field></div>
          <div className="span-12"><Field label={t('common.notes')} htmlFor="company-notes"><textarea id="company-notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></Field></div>
        </div>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title={t('identifiers.professional.delete.title')} description={<p>{t('identifiers.professional.delete.description')}</p>} onClose={() => setDeleting(null)} onConfirm={() => void destroy()} isLoading={deletingBusy} />
    </div>
  )
}
