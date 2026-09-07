import { AnalysisResult } from './AnalysisResult'
import { WorkItemActions } from './WorkItemActions'
import type { WorkItem, WorkItemAction } from '../types/work-item'
import { StatusBadge } from './StatusBadge'

interface WorkItemCardProps {
  item: WorkItem
  pendingAction?: WorkItemAction
  disabled: boolean
  onAction: () => void
}

export function WorkItemCard({ item, pendingAction, disabled, onAction }: WorkItemCardProps) {
  return (
    <div className="grid gap-3.5 wrap-anywhere" aria-busy={Boolean(pendingAction)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="muted">{item.externalId}</span>
        <StatusBadge status={item.status} />
      </div>
      <h3 className="text-xl font-bold">{item.title}</h3>
      <p className="whitespace-pre-wrap wrap-anywhere">{item.description}</p>
      <p className="muted">Last updated {new Date(item.updatedAt).toLocaleString()}</p>

      <AnalysisResult item={item} />

      <WorkItemActions item={item} pendingAction={pendingAction} disabled={disabled} onAction={onAction} />
    </div>
  )
}
