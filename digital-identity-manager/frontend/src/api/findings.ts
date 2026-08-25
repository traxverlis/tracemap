import * as c from './client'
import type { Evidence, Finding } from './types'

export interface FindingFilters {
  identity_id?: string
  category?: string
  status?: string
  q?: string
}

export const listFindings = (filters?: FindingFilters) =>
  c.get<Finding[]>('/findings', filters as Record<string, string | number | boolean | undefined>)
export const createFinding = (data: Partial<Finding>) => c.post<Finding>('/findings', data)
export const updateFinding = (id: string, data: Partial<Finding>) => c.patch<Finding>(`/findings/${id}`, data)
export const deleteFinding = (id: string) => c.delete_<void>(`/findings/${id}`)
export const listEvidence = (findingId: string) => c.get<Evidence[]>(`/findings/${findingId}/evidence`)
export const createEvidence = (findingId: string, data: Partial<Evidence>) =>
  c.post<Evidence>(`/findings/${findingId}/evidence`, data)
