import type { WorkItem } from '../types/work-item'
import { StatusBadge } from './StatusBadge'

interface WorkItemListProps {
  items: WorkItem[]
  selectedId: string | null
  emptyMessage: string
  onSelect: (id: string) => void
}

export function WorkItemList({ items, selectedId, emptyMessage, onSelect }: WorkItemListProps) {
  if (items.length === 0) {
    return <p className="my-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{emptyMessage}</p>
  }

  return (
    <ul className="grid list-none gap-2.5" aria-label="Work items">
      {items.map((item) => (
        <li key={item.id}>
          <button
            className="work-item"
            aria-pressed={item.id === selectedId}
            onClick={() => onSelect(item.id)}
          >
            <span className="flex min-w-0 items-center justify-between gap-2">
              <span className="muted truncate">{item.externalId}</span>
              <StatusBadge status={item.status} />
            </span>
            <strong className="truncate">{item.title}</strong>
            <span className="truncate text-sm text-slate-600">{item.description}</span>
            <span className="muted">{new Date(item.createdAt).toLocaleDateString()}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
