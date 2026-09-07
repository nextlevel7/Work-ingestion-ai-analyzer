import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { ErrorMessage } from '../../../components/ui/ErrorMessage'
import { CreateWorkItemForm } from '../components/CreateWorkItemForm'
import { WorkItemCard } from '../components/WorkItemCard'
import { WorkItemList } from '../components/WorkItemList'
import { useWorkItems } from '../hooks/useWorkItems'
import { useCreateWorkItem, useWorkItemActions } from '../hooks/useWorkItemMutations'
import { statusActions, statusLabels } from '../types/work-item'
import type { CreateWorkItemInput, WorkItemStatus } from '../types/work-item'

export function WorkItemsPage() {
  const query = useWorkItems()
  const creation = useCreateWorkItem()
  const { runAction, pendingItemIds, byItem } = useWorkItemActions()
  const items = query.data ?? []
  const isLoading = query.isPending
  const loadError = query.error?.message
  const isIngesting = creation.isPending
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<WorkItemStatus | 'ALL'>('ALL')
  const [showIngestForm, setShowIngestForm] = useState(false)
  const filteredItems = items.filter((item) => statusFilter === 'ALL' || item.status === statusFilter)
  const selectedItem = items.find((item) => item.id === selectedId)
  const isBusy = isLoading || pendingItemIds.size > 0 || isIngesting
  const action = selectedId ? byItem.get(selectedId) : undefined
  const showCreationNotice = creation.isSuccess && creation.data.item.id === selectedId
    && (!action || creation.submittedAt >= action.submittedAt)
  const actionError = !showCreationNotice && action?.status === 'error' ? action.error?.message : ''
  let notice = ''
  if (showCreationNotice) {
    notice = creation.data.created
      ? 'Item created. You can now start its analysis.'
      : 'Existing item found. The original content and status were not changed.'
  } else if (action?.status === 'success') {
    if (action.data?.status === 'READY_FOR_REVIEW') {
      notice = 'Analysis finished. Review the results before completing this item.'
    } else if (action.data?.status === 'COMPLETED') {
      notice = 'Work item completed.'
    }
  }

  async function handleIngest(input: CreateWorkItemInput) {
    try {
      const result = await creation.mutateAsync(input)
      setSelectedId(result.item.id)
      setStatusFilter('ALL')
      setShowIngestForm(false)
    } catch {
      // The mutation exposes its error; retain the form and its input values.
    }
  }

  function refresh() {
    void query.refetch()
  }

  function handleAction() {
    if (!selectedItem) return
    const nextAction = statusActions[selectedItem.status]
    if (nextAction) runAction(selectedItem.id, nextAction)
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-9">
      <header className="mb-7 flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-bold tracking-wider text-slate-600">OPERATIONS</p>
          <h1 className="my-1 text-3xl font-bold">Work items</h1>
          <p className="muted">Review incoming work, run AI analysis, and complete reviewed items.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2.5">
          <Button disabled={isBusy || query.isFetching} onClick={refresh}>
            {isLoading ? 'Loading…' : query.isFetching ? 'Refreshing…' : 'Refresh items'}
          </Button>
          <Button
            primary
            disabled={isBusy || showIngestForm}
            aria-expanded={showIngestForm}
            aria-controls="ingest-form"
            onClick={() => { creation.reset(); setShowIngestForm(true) }}
          >
            Ingest item
          </Button>
        </div>
      </header>

      {showIngestForm && (
        <CreateWorkItemForm
          disabled={isBusy}
          isSubmitting={isIngesting}
          error={creation.error?.message ?? ''}
          onSubmit={handleIngest}
          onCancel={() => setShowIngestForm(false)}
        />
      )}

      {loadError && (
        <div className="mb-5">
          <ErrorMessage>
            <strong>{query.data === undefined ? 'Could not load work items.' : 'Could not refresh work items.'}</strong> {loadError}
            {query.data !== undefined && <p>The displayed list may be out of date. Any successful changes remain saved.</p>}
            <Button className="mt-2.5 block" disabled={isBusy || query.isFetching} onClick={refresh}>Try again</Button>
          </ErrorMessage>
        </div>
      )}

      <div className="grid items-start gap-6 md:grid-cols-2">
        <section className="panel" aria-labelledby="queue-heading" aria-busy={query.isFetching}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="queue-heading">Work queue</h2>
            <label className="w-full sm:w-44">
              Status
              <select
                className="control"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as WorkItemStatus | 'ALL')}
              >
                <option value="ALL">All statuses</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          {isLoading && <p className="py-7 text-slate-500" role="status">Loading work items…</p>}
          {query.isFetching && !isLoading && <p className="muted" role="status">Refreshing work items…</p>}
          {query.data !== undefined && (
            <>
              <p className="muted my-4">Showing {filteredItems.length} of {items.length} items</p>
              <WorkItemList
                items={filteredItems}
                selectedId={selectedId}
                onSelect={setSelectedId}
                emptyMessage={items.length === 0
                  ? 'No work items yet. Use Ingest item to add incoming work.'
                  : 'No work items match this status.'}
              />
            </>
          )}
        </section>

        <section className="panel space-y-5" aria-labelledby="details-heading">
          <h2 id="details-heading">Item details</h2>
          {selectedItem ? (
            <>
              {actionError && (
                <ErrorMessage>
                  <strong>Action failed.</strong> {actionError}
                  <p>Refresh items to check the latest status before trying again.</p>
                </ErrorMessage>
              )}
              {notice && <p className="notice notice-success" role="status">{notice}</p>}
              <WorkItemCard
                item={selectedItem}
                pendingAction={action?.status === 'pending' ? action.input.action : undefined}
                disabled={isLoading || isIngesting || Boolean(loadError)}
                onAction={handleAction}
              />
            </>
          ) : (
            <p className="py-7 text-slate-500">Select a work item to view its details and AI analysis.</p>
          )}
        </section>
      </div>
    </main>
  )
}
