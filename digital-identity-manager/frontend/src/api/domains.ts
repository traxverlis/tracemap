import * as c from './client'
import type { Domain } from './types'

export interface DomainFilters {
  identity_id?: string
  q?: string
  status?: string
}

export const listDomains = (filters?: DomainFilters) =>
  c.get<Domain[]>('/domains', filters as Record<string, string | number | boolean | undefined>)
export const createDomain = (data: Partial<Domain>) => c.post<Domain>('/domains', data)
export const updateDomain = (id: string, data: Partial<Domain>) => c.patch<Domain>(`/domains/${id}`, data)
export const deleteDomain = (id: string) => c.delete_<void>(`/domains/${id}`)
