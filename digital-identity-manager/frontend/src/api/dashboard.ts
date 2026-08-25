import * as c from './client'
import type { DashboardSummary, TimelineEvent } from './types'

export const getDashboardSummary = (identity_id: string) =>
  c.get<DashboardSummary>('/dashboard/summary', { identity_id })
export const getTimeline = (identity_id: string, limit = 10) =>
  c.get<TimelineEvent[]>('/timeline', { identity_id, limit })
