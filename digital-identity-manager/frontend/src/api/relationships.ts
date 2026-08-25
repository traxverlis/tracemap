import * as c from './client'
import type {
  CorrelationRulesResponse,
  CorrelationRunResponse,
  GraphEdge,
  GraphNode,
  Relationship,
  ReviewItem,
} from './types'

export interface RelationshipFilters {
  identity_id?: string
  status?: string
  q?: string
}

export const listRelationships = (filters?: RelationshipFilters) =>
  c.get<Relationship[]>('/relationships', filters as Record<string, string | number | boolean | undefined>)
export const getRelationshipGraph = (identity_id: string) =>
  c.get<{ nodes: GraphNode[]; edges: GraphEdge[] }>('/relationships/graph', { identity_id })
export const getReviewQueue = (identity_id: string) =>
  c.get<ReviewItem[]>('/relationships/review', { identity_id })
export const decideRelationship = (
  id: string,
  data: { decision: 'CONFIRM' | 'REJECT' | 'LATER'; reason?: string },
) => c.post<Relationship>(`/relationships/${id}/decision`, data)
export const runCorrelation = (identity_id: string) =>
  c.post<CorrelationRunResponse>('/correlation/run', { identity_id })
export const getCorrelationRules = () => c.get<CorrelationRulesResponse>('/correlation/rules')
