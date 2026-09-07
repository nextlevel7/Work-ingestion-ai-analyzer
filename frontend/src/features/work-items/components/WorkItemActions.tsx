import { Button } from '../../../components/ui/Button'
import { statusActions } from '../types/work-item'
import type { WorkItem, WorkItemAction } from '../types/work-item'

interface WorkItemActionsProps {
  item: WorkItem
  pendingAction?: WorkItemAction
  disabled: boolean
  onAction: () => void
}

const labels = {
  analyse: { idle: 'Analyse item', pending: 'Analysing…' },
  retry: { idle: 'Retry analysis', pending: 'Retrying analysis…' },
  complete: { idle: 'Complete work item', pending: 'Completing…' },
}

export function WorkItemActions({ item, pendingAction, disabled, onAction }: WorkItemActionsProps) {
  const action = pendingAction ?? statusActions[item.status]
  if (!action) return null

  const label = labels[action]
  return (
    <div className="grid justify-items-start gap-2.5 border-t border-slate-200 pt-4">
      <Button primary disabled={disabled || Boolean(pendingAction)} onClick={onAction}>
        {pendingAction ? label.pending : label.idle}
      </Button>
      {pendingAction && <p className="muted" role="status">{label.pending} Please wait.</p>}
    </div>
  )
}
