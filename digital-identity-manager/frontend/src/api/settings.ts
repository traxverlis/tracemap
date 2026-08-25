import * as c from './client'
import { ApiClientError } from './client'
import type { SettingsResponse } from './types'

export const getSettings = () => c.get<SettingsResponse>('/settings')

export async function exportData(identity_id?: string): Promise<Blob> {
  const url = new URL('/api/settings/export', window.location.origin)
  if (identity_id) {
    url.searchParams.set('identity_id', identity_id)
  }

  const token = localStorage.getItem('dim_token')
  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `****** } : {},
  })

  if (!res.ok) {
    const text = await res.text()
    let detail = res.statusText
    try {
      const parsed = JSON.parse(text) as { detail?: string }
      detail = parsed.detail ?? detail
    } catch {
      if (text) detail = text
    }
    throw new ApiClientError(detail, res.status)
  }

  return res.blob()
}

export const eraseData = (data: { identity_id?: string | null; confirm: string }) =>
  c.post<{ deleted: Record<string, number> }>('/settings/erase', data)
