export type WorkItemAction = 'analyse' | 'retry' | 'complete'

export type WorkItemStatus =
  | 'RECEIVED'
  | 'ANALYSING'
  | 'READY_FOR_REVIEW'
  | 'COMPLETED'
  | 'FAILED'

export const statusLabels: Record<WorkItemStatus, string> = {
  RECEIVED: 'Received',
  ANALYSING: 'Analysing',
  READY_FOR_REVIEW: 'Ready for review',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
}

export const statusActions: Partial<Record<WorkItemStatus, WorkItemAction>> = {
  RECEIVED: 'analyse',
  FAILED: 'retry',
  READY_FOR_REVIEW: 'complete',
}

export interface CreateWorkItemInput {
  externalId: string
  title: string
  description: string
}

export interface WorkItem {
  id: string
  externalId: string
  title: string
  description: string
  status: WorkItemStatus
  category: string | null
  priority: string | null
  summary: string | null
  recommendedAction: string | null
  analysisError: string | null
  analysisAttemptCount: number
  createdAt: string
  updatedAt: string
}

export interface WorkItemPage {
  items: WorkItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface WorkItemFilters {
  page: number
  pageSize: number
  status?: WorkItemStatus
}
