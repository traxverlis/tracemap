import * as c from './client'
import type { PromoteResponse, Scan, ScanResult } from './types'

export interface ScanFilters {
  identity_id?: string
  status?: string
  tool?: string
}

export const listScans = (filters?: ScanFilters) =>
  c.get<Scan[]>('/scans', filters as Record<string, string | number | boolean | undefined>)
export const createScan = (data: {
  identity_id: string
  tool: string
  scan_type: string
  target: string
  parameters_json: Record<string, unknown>
}) => c.post<Scan>('/scans', data)
export const getScan = (id: string) => c.get<Scan>(`/scans/${id}`)
export const getScanResults = (scanId: string) => c.get<ScanResult[]>(`/scans/${scanId}/results`)
export const cancelScan = (id: string) => c.post<Scan>(`/scans/${id}/cancel`)
export const promoteScanResults = (scanId: string, result_ids: string[]) =>
  c.post<PromoteResponse>(`/scans/${scanId}/promote`, { result_ids })
