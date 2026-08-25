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
      addToast({ title: 'Platform is required', tone: 'warning' })
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
        addToast({ title: 'Profile updated', tone: 'success' })
      } else {
        await createProfile(payload)
        addToast({ title: 'Profile created', tone: 'success' })
      }
      setModalOpen(false)
      await refetch()
    } catch (errorValue) {
      addToast({ title: 'Unable to save profile', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  const destroy = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deleteProfile(deleting.id)
      addToast({ title: 'Profile deleted', tone: 'success' })
      setDeleting(null)
      await refetch()
    } catch (errorValue) {
      addToast({ title: 'Unable to delete profile', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setDeletingBusy(false)
    }
  }

  const columns = useMemo<DataTableColumn<Profile>[]>(
    () => [
      { key: 'platform', header: 'Platform', render: (row) => row.platform, sortValue: (row) => row.platform, filterValue: (row) => row.platform },
      { key: 'username', header: 'Username', render: (row) => row.username ?? '—', sortValue: (row) => row.username ?? '', filterValue: (row) => row.username ?? '' },
      { key: 'url', header: 'URL', render: (row) => row.url ? <a href={row.url} target="_blank" rel="noreferrer">Open</a> : '—', sortValue: (row) => row.url ?? '', filterValue: (row) => row.url ?? '' },
      { key: 'active', header: 'Active', render: (row) => <Badge tone={row.is_active ? 'success' : 'warning'}>{row.is_active ? 'Yes' : 'No'}</Badge>, sortValue: (row) => row.is_active },
      { key: 'public', header: 'Public', render: (row) => <Badge tone={row.is_public ? 'info' : 'neutral'}>{row.is_public ? 'Public' : 'Private'}</Badge>, sortValue: (row) => row.is_public },
      { key: 'actions', header: 'Actions', filterable: false, render: (row) => <div className="inline" onClick={(event) => event.stopPropagation()}><Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button><Button variant="danger" size="sm" onClick={() => setDeleting(row)}>Delete</Button></div> },
    ],
    [],
  )

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title="Profiles" description="Track platform profiles and visibility for the active identity." />
        <IdentityRequiredState />
      </div>
    )
  }

  if (loading && !data) return <LoadingState message="Loading profiles…" />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title="Profiles" description="Record known public or private profiles tied to the active identity." actions={<Button onClick={openCreate}>Add profile</Button>} />
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      <DataTable columns={columns} rows={data ?? []} rowKey={(row) => row.id} showFilters onRowClick={openEdit} emptyTitle="No profiles yet" emptyDescription="Create a profile record to track public handles and URLs." />
      <Modal open={modalOpen} title={editing ? 'Edit profile' : 'Add profile'} onClose={() => setModalOpen(false)} footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => void save()} isLoading={submitting}>{editing ? 'Save changes' : 'Create profile'}</Button></>}>
        <div className="form-grid">
          <div className="span-6"><Field label="Platform" htmlFor="profile-platform" required><input id="profile-platform" value={form.platform} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))} /></Field></div>
          <div className="span-6"><Field label="Username" htmlFor="profile-username"><input id="profile-username" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} /></Field></div>
          <div className="span-12"><Field label="URL" htmlFor="profile-url"><input id="profile-url" value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} /></Field></div>
          <div className="span-3"><Field label="Active" htmlFor="profile-active"><label className="checkbox-row"><input id="profile-active" type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} /><span>{form.is_active ? 'Yes' : 'No'}</span></label></Field></div>
          <div className="span-3"><Field label="Public" htmlFor="profile-public"><label className="checkbox-row"><input id="profile-public" type="checkbox" checked={form.is_public} onChange={(event) => setForm((current) => ({ ...current, is_public: event.target.checked }))} /><span>{form.is_public ? 'Public' : 'Private'}</span></label></Field></div>
          <div className="span-12"><Field label="Notes" htmlFor="profile-notes"><textarea id="profile-notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></Field></div>
        </div>
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} title="Delete profile" description={<p>Delete this profile record?</p>} onClose={() => setDeleting(null)} onConfirm={() => void destroy()} isLoading={deletingBusy} />
    </div>
  )
}
