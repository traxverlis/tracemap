import * as c from './client'
import type { Photo } from './types'

export const listPhotos = (identity_id?: string) =>
  c.get<Photo[]>('/photos', identity_id ? { identity_id } : undefined)

export async function uploadPhoto(
  identityId: string,
  file: File,
  meta?: { platform?: string; source?: string; notes?: string },
): Promise<Photo> {
  const formData = new FormData()
  formData.append('identity_id', identityId)
  formData.append('file', file)
  if (meta?.platform) formData.append('platform', meta.platform)
  if (meta?.source) formData.append('source', meta.source)
  if (meta?.notes) formData.append('notes', meta.notes)
  return c.postFormData<Photo>('/photos', formData)
}

export const deletePhoto = (id: string) => c.delete_<void>(`/photos/${id}`)
