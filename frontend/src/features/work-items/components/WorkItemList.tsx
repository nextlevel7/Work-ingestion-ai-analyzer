import type { WorkItem } from '../types/work-item'
import { StatusBadge } from './StatusBadge'

interface WorkItemListProps {
  items: WorkItem[]
  selectedId: string | null
  emptyMessage: string
  onSelect: (id: string) => void
}

export function WorkItemList({ items, selectedId, emptyMessage, onSelect }: WorkItemListProps) {
  if (items.length === 0) return <p className="py-7 text-slate-500">{emptyMessage}</p>

  return (
    <ul className="grid list-none gap-2.5" aria-label="Work items">
      {items.map((item) => (
        <li key={item.id}>
          <button
            className="work-item"
            aria-pressed={item.id === selectedId}
            onClick={() => onSelect(item.id)}
          >
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="muted">{item.externalId}</span>
              <StatusBadge status={item.status} />
            </span>
            <strong>{item.title}</strong>
            <span className="muted">Created {new Date(item.createdAt).toLocaleString()}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
