import * as c from './client'
import type { Identifier } from './types'

export interface IdentifierFilters {
  identity_id?: string
  type?: string
  is_active?: boolean
  q?: string
}

export const listIdentifiers = (filters?: IdentifierFilters) =>
  c.get<Identifier[]>('/identifiers', filters as Record<string, string | number | boolean | undefined>)
export const createIdentifier = (data: Partial<Identifier>) => c.post<Identifier>('/identifiers', data)
export const getIdentifier = (id: string) => c.get<Identifier>(`/identifiers/${id}`)
export const updateIdentifier = (id: string, data: Partial<Identifier>) =>
  c.patch<Identifier>(`/identifiers/${id}`, data)
export const deleteIdentifier = (id: string) => c.delete_<void>(`/identifiers/${id}`)
