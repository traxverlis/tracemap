import * as c from './client'
import type { Completeness, Identity } from './types'

export const listIdentities = () => c.get<Identity[]>('/identities')
export const createIdentity = (data: Partial<Identity>) => c.post<Identity>('/identities', data)
export const getIdentity = (id: string) => c.get<Identity>(`/identities/${id}`)
export const updateIdentity = (id: string, data: Partial<Identity>) => c.patch<Identity>(`/identities/${id}`, data)
export const deleteIdentity = (id: string) => c.delete_<void>(`/identities/${id}`)
export const setAuthorization = (id: string, acknowledged: boolean) =>
  c.post<Identity>(`/identities/${id}/authorization`, { acknowledged })
export const getCompleteness = (id: string) => c.get<Completeness>(`/identities/${id}/completeness`)
export const updateCompletenessTargets = (
  id: string,
  targets: { category: string; expected_count: number }[],
) => c.put<Completeness>(`/identities/${id}/completeness-targets`, { targets })
