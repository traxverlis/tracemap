import * as c from './client'
import type { Profile } from './types'

export interface ProfileFilters {
  identity_id?: string
  platform?: string
  q?: string
}

export const listProfiles = (filters?: ProfileFilters) =>
  c.get<Profile[]>('/profiles', filters as Record<string, string | number | boolean | undefined>)
export const createProfile = (data: Partial<Profile>) => c.post<Profile>('/profiles', data)
export const updateProfile = (id: string, data: Partial<Profile>) => c.patch<Profile>(`/profiles/${id}`, data)
export const deleteProfile = (id: string) => c.delete_<void>(`/profiles/${id}`)
