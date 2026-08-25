import { useCallback, useMemo, useState } from 'react'

import { createProfile, deleteProfile, listProfiles, updateProfile } from '../api/profiles'
import type { Profile } from '../api/types'
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
import { getErrorDetail, maybeNull } from '../utils'

interface ProfileFormState {
  platform: string
  username: string
  url: string
  is_active: boolean
  is_public: boolean
  notes: string
}

const emptyForm: ProfileFormState = {
  platform: '',
  username: '',
  url: '',
  is_active: true,
  is_public: true,
  notes: '',
}

const toFormState = (profile: Profile): ProfileFormState => ({
  platform: profile.platform,
  username: profile.username ?? '',
  url: profile.url ?? '',
  is_active: profile.is_active,
  is_public: profile.is_public,
  notes: profile.notes ?? '',
})

export function ProfilesPage(): JSX.Element {
  const { selectedIdentityId } = useIdentity()
  const { addToast } = useToast()
  const { t } = useI18n()
  const [editing, setEditing] = useState<Profile | null>(null)
  const [deleting, setDeleting] = useState<Profile | null>(null)
  const [form, setForm] = useState<ProfileFormState>(emptyForm)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingBusy, setDeletingBusy] = useState(false)

  const fetchProfiles = useCallback(() => {
    if (!selectedIdentityId) return Promise.resolve([])
    return listProfiles({ identity_id: selectedIdentityId })
  }, [selectedIdentityId])

  const { data, loading, error, refetch } = useFetch(selectedIdentityId ? fetchProfiles : null, [fetchProfiles])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (profile: Profile) => {
    setEditing(profile)
    setForm(toFormState(profile))
    setModalOpen(true)
  }

  const save = async () => {
    if (!selectedIdentityId || !form.platform.trim()) {
      addToast({ title: t('inventory.profiles.platformRequired'), tone: 'warning' })
      return
    }
    setSubmitting(true)
    try {
      const payload: Partial<Profile> = {
        identity_id: selectedIdentityId,
        platform: form.platform.trim(),
        username: maybeNull(form.username),
        url: maybeNull(form.url),
        is_active: form.is_active,
        is_public: form.is_public,
        notes: maybeNull(form.notes),
      }
      if (editing) {
        await updateProfile(editing.id, payload)
        addToast({ title: t('inventory.profiles.updated'), tone: 'success' })
      } else {
        await createProfile(payload)
        addToast({ title: t('inventory.profiles.created'), tone: 'success' })
      }
      setModalOpen(false)
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('inventory.profiles.saveFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  const destroy = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deleteProfile(deleting.id)
      addToast({ title: t('inventory.profiles.deleted'), tone: 'success' })
      setDeleting(null)
      await refetch()
    } catch (errorValue) {
      addToast({ title: t('inventory.profiles.deleteFailed'), description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setDeletingBusy(false)
    }
  }

  const columns = useMemo<DataTableColumn<Profile>[]>(
    () => [
      { key: 'platform', header: t('inventory.profiles.platform'), render: (row) => row.platform, sortValue: (row) => row.platform, filterValue: (row) => row.platform },
      { key: 'username', header: t('inventory.profiles.username'), render: (row) => row.username ?? '—', sortValue: (row) => row.username ?? '', filterValue: (row) => row.username ?? '' },
      { key: 'url', header: t('inventory.profiles.url'), render: (row) => row.url ? <a href={row.url} target="_blank" rel="noreferrer">{t('common.open')}</a> : '—', sortValue: (row) => row.url ?? '', filterValue: (row) => row.url ?? '' },
      { key: 'active', header: t('common.active'), render: (row) => <Badge tone={row.is_active ? 'success' : 'warning'}>{row.is_active ? t('common.yes') : t('common.no')}</Badge>, sortValue: (row) => row.is_active },
      { key: 'public', header: t('inventory.profiles.public'), render: (row) => <Badge tone={row.is_public ? 'info' : 'neutral'}>{row.is_public ? t('inventory.profiles.public') : t('inventory.profiles.private')}</Badge>, sortValue: (row) => row.is_public },
      { key: 'actions', header: t('common.actions'), filterable: false, render: (row) => <div className="inline" onClick={(event) => event.stopPropagation()}><Button variant="ghost" size="sm" onClick={() => openEdit(row)}>{t('common.edit')}</Button><Button variant="danger" size="sm" onClick={() => setDeleting(row)}>{t('common.delete')}</Button></div> },
    ],
    [t],
  )

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title={t('inventory.profiles.title')} description={t('inventory.profiles.identityDescription')} />
        <IdentityRequiredState />
      </div>
    )
  }

  if (loading && !data) return <LoadingState message={t('inventory.profiles.loading')} />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title={t('inventory.profiles.title')} description={t('inventory.profiles.description')} actions={<Button onClick={openCreate}>{t('inventory.profiles.add')}</Button>} />
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      <DataTable columns={columns} rows={data ?? []} rowKey={(row) => row.id} showFilters onRowClick={openEdit} emptyTitle={t('inventory.profiles.emptyTitle')} emptyDescription={t('inventory.profiles.emptyDescription')} />
      <Modal open={modalOpen} title={editing ? t('inventory.profiles.edit') : t('inventory.profiles.add')} onClose={() => setModalOpen(false)} footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => void save()} isLoading={submitting}>{editing ? t('common.saveChanges') : t('inventory.profiles.create')}</Button></>}>
        <div className="form-grid">
          <div className="span-6"><Field label={t('inventory.profiles.platform')} htmlFor="profile-platform" required><input id="profile-platform" value={form.platform} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label={t('inventory.profiles.username')} htmlFor="profile-username"><input id="profile-username" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} /></Field></div>
          <div className="span-12"><Field label={t('inventory.profiles.url')} htmlFor="profile-url"><input id="profile-url" value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} /></Field></div>
          <div className="span-3"><Field label={t('common.active')} htmlFor="profile-active"><label className="checkbox-row"><input id="profile-active" type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} /><span>{form.is_active ? t('common.yes') : t('common.no')}</span></label></Field></div>
          <div className="span-3"><Field label={t('inventory.profiles.public')} htmlFor="profile-public"><label className="checkbox-row"><input id="profile-public" type="checkbox" checked={form.is_public} onChange={(event) => setForm((current) => ({ ...current, is_public: event.target.checked }))} /><span>{form.is_public ? t('inventory.profiles.public') : t('inventory.profiles.private')}</span></label></Field></div>
          <div className="span-12"><Field label={t('common.notes')} htmlFor="profile-notes"><textarea id="profile-notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></Field></div>
        </div>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title={t('inventory.profiles.deleteTitle')} description={<p>{t('inventory.profiles.deleteConfirm')}</p>} onClose={() => setDeleting(null)} onConfirm={() => void destroy()} isLoading={deletingBusy} />
    </div>
  )
}
