import type { WorkItemFilters } from './types/work-item'

export const workItemKeys = {
  all: ['work-items'] as const,
  lists: ['work-items', 'list'] as const,
  list: (filters: WorkItemFilters) => ['work-items', 'list', filters] as const,
  create: ['work-items', 'mutations', 'create'] as const,
  action: ['work-items', 'mutations', 'action'] as const,
}
