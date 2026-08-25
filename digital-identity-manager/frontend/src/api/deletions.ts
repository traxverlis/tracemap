import * as c from './client'
import type { DeletionRequest } from './types'

export interface DeletionFilters {
  identity_id?: string
  status?: string
  broker_id?: string
  q?: string
}

export const listDeletionRequests = (filters?: DeletionFilters) =>
  c.get<DeletionRequest[]>('/deletion-requests', filters as Record<string, string | number | boolean | undefined>)
export const createDeletionRequest = (data: Partial<DeletionRequest>) =>
  c.post<DeletionRequest>('/deletion-requests', data)
export const updateDeletionRequest = (id: string, data: Partial<DeletionRequest>) =>
  c.patch<DeletionRequest>(`/deletion-requests/${id}`, data)
export const deleteDeletionRequest = (id: string) => c.delete_<void>(`/deletion-requests/${id}`)
