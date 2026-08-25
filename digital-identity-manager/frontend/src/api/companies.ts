import * as c from './client'
import type { Company } from './types'

export interface CompanyFilters {
  identity_id?: string
  q?: string
  is_former?: boolean
}

export const listCompanies = (filters?: CompanyFilters) =>
  c.get<Company[]>('/companies', filters as Record<string, string | number | boolean | undefined>)
export const createCompany = (data: Partial<Company>) => c.post<Company>('/companies', data)
export const updateCompany = (id: string, data: Partial<Company>) => c.patch<Company>(`/companies/${id}`, data)
export const deleteCompany = (id: string) => c.delete_<void>(`/companies/${id}`)
