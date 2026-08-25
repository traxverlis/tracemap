import { useCallback, useMemo, useState, type FormEvent } from 'react'

import { deletePhoto, listPhotos, uploadPhoto } from '../api/photos'
import type { Photo } from '../api/types'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable, type DataTableColumn } from '../components/DataTable'
import { Field } from '../components/Field'
import { ErrorState, IdentityRequiredState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { useFetch } from '../hooks/useFetch'
import { useIdentity } from '../hooks/useIdentity'
import { useToast } from '../hooks/useToast'
import { formatDateTime, getErrorDetail, maybeNull } from '../utils'

export function PhotosPage(): JSX.Element {
  const { selectedIdentityId } = useIdentity()
  const { addToast } = useToast()
  const [files, setFiles] = useState<File[]>([])
  const [platform, setPlatform] = useState('')
  const [source, setSource] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<Photo | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  const fetchPhotos = useCallback(() => {
    if (!selectedIdentityId) return Promise.resolve([])
    return listPhotos(selectedIdentityId)
  }, [selectedIdentityId])

  const { data, loading, error, refetch } = useFetch(selectedIdentityId ? fetchPhotos : null, [fetchPhotos])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedIdentityId || files.length === 0) {
      addToast({ title: 'Select one or more files first', tone: 'warning' })
      return
    }
    setSubmitting(true)
    try {
      await Promise.all(
        files.map((file) =>
          uploadPhoto(selectedIdentityId, file, {
            platform: maybeNull(platform) ?? undefined,
            source: maybeNull(source) ?? undefined,
            notes: maybeNull(notes) ?? undefined,
          }),
        ),
      )
      addToast({ title: 'Photo upload complete', tone: 'success' })
      setFiles([])
      setPlatform('')
      setSource('')
      setNotes('')
      await refetch()
    } catch (errorValue) {
      addToast({ title: 'Unable to upload photos', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  const destroy = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deletePhoto(deleting.id)
      addToast({ title: 'Photo deleted', tone: 'success' })
      setDeleting(null)
      await refetch()
    } catch (errorValue) {
      addToast({ title: 'Unable to delete photo', description: getErrorDetail(errorValue), tone: 'danger' })
    } finally {
      setDeletingBusy(false)
    }
  }

  const columns = useMemo<DataTableColumn<Photo>[]>(
    () => [
      { key: 'filename', header: 'Filename', render: (row) => row.filename, sortValue: (row) => row.filename, filterValue: (row) => row.filename },
      { key: 'source', header: 'Source', render: (row) => row.source ?? '—', sortValue: (row) => row.source ?? '', filterValue: (row) => row.source ?? '' },
      { key: 'platform', header: 'Platform', render: (row) => row.platform ?? '—', sortValue: (row) => row.platform ?? '', filterValue: (row) => row.platform ?? '' },
      { key: 'size', header: 'Size', render: (row) => row.size_bytes ? `${row.size_bytes.toLocaleString()} bytes` : '—', sortValue: (row) => row.size_bytes ?? 0 },
      { key: 'created', header: 'Created', render: (row) => formatDateTime(row.created_at), sortValue: (row) => row.created_at },
      { key: 'actions', header: 'Actions', filterable: false, render: (row) => <div className="inline" onClick={(event) => event.stopPropagation()}><Button variant="danger" size="sm" onClick={() => setDeleting(row)}>Delete</Button></div> },
    ],
    [],
  )

  if (!selectedIdentityId) {
    return (
      <div className="page-stack">
        <PageHeader title="Photos and avatars" description="Upload reference photos, avatars, and metadata for the active identity." />
        <IdentityRequiredState />
      </div>
    )
  }

  if (loading && !data) return <LoadingState message="Loading photos…" />
  if (error && !data) return <ErrorState message={error} onRetry={() => void refetch()} />

  return (
    <div className="page-stack">
      <PageHeader title="Photos and avatars" description="Upload files and track metadata like source, platform, and hashes." />
      <Card title="Upload photos" description="Attach one or more files with optional platform and source metadata.">
        <form className="form-grid" onSubmit={submit}>
          <div className="span-6"><Field label="Files" htmlFor="photo-files" required><input id="photo-files" type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></Field></div>
          <div className="span-3"><Field label="Platform" htmlFor="photo-platform"><input id="photo-platform" value={platform} onChange={(event) => setPlatform(event.target.value)} /></Field></div>
          <div className="span-3"><Field label="Source" htmlFor="photo-source"><input id="photo-source" value={source} onChange={(event) => setSource(event.target.value)} /></Field></div>
          <div className="span-12"><Field label="Notes" htmlFor="photo-notes"><textarea id="photo-notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></Field></div>
          <div className="span-12"><Button type="submit" isLoading={submitting}>Upload selected photos</Button></div>
        </form>
      </Card>
      {error && data ? <ErrorState message={error} onRetry={() => void refetch()} /> : null}
      <DataTable columns={columns} rows={data ?? []} rowKey={(row) => row.id} showFilters emptyTitle="No photos yet" emptyDescription="Upload reference images or avatars to document this identity." />
      <ConfirmDialog open={Boolean(deleting)} title="Delete photo" description={<p>Delete {deleting?.filename}?</p>} onClose={() => setDeleting(null)} onConfirm={() => void destroy()} isLoading={deletingBusy} />
    </div>
  )
}
