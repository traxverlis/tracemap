import * as c from './client'
import type { DataBroker, ImportCatalogResponse } from './types'

export interface DataBrokerFilters {
  country?: string
  category?: string
  q?: string
}

export const listDataBrokers = (filters?: DataBrokerFilters) =>
  c.get<DataBroker[]>('/data-brokers', filters as Record<string, string | number | boolean | undefined>)
export const createDataBroker = (data: Partial<DataBroker>) => c.post<DataBroker>('/data-brokers', data)
export const updateDataBroker = (id: string, data: Partial<DataBroker>) =>
  c.patch<DataBroker>(`/data-brokers/${id}`, data)
export const deleteDataBroker = (id: string) => c.delete_<void>(`/data-brokers/${id}`)
export const importCatalog = () => c.post<ImportCatalogResponse>('/data-brokers/import')
