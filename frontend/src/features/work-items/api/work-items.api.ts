
import { request, sendRequest } from '../../../lib/api-client'
import type { CreateWorkItemInput, WorkItem, WorkItemFilters, WorkItemPage } from '../types/work-item'

export async function ingestWorkItem(input: CreateWorkItemInput) {
  const response = await sendRequest('/work-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const item: WorkItem = await response.json()
  return { item, created: response.status === 201 }
}

export function getWorkItems(filters: WorkItemFilters, signal?: AbortSignal) {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  })
  if (filters.status) params.set('status', filters.status)

  return request<WorkItemPage>(`/work-items?${params}`, { signal })
}

export function analyseWorkItem(id: string) {
  return request<WorkItem>(`/work-items/${encodeURIComponent(id)}/analyse`, {
    method: 'POST',
  })
}

export function retryWorkItem(id: string) {
  return request<WorkItem>(`/work-items/${encodeURIComponent(id)}/retry`, {
    method: 'POST',
  })
}

export function completeWorkItem(id: string) {
  return request<WorkItem>(`/work-items/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'COMPLETED' }),
  })
}
