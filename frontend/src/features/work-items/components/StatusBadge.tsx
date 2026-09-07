import { statusLabels } from '../types/work-item'
import type { WorkItemStatus } from '../types/work-item'

const colors: Record<WorkItemStatus, string> = {
  RECEIVED: 'bg-slate-100 text-slate-600',
  ANALYSING: 'bg-amber-100 text-amber-800',
  READY_FOR_REVIEW: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
}

export function StatusBadge({ status }: { status: WorkItemStatus }) {
  return <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${colors[status]}`}>{statusLabels[status]}</span>
}
