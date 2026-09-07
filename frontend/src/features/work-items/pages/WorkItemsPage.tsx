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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<WorkItemStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [showIngestForm, setShowIngestForm] = useState(false)
  const query = useWorkItems({
    page,
    pageSize: 10,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  })
  const creation = useCreateWorkItem()
  const { runAction, pendingItemIds, byItem } = useWorkItemActions()
  const items = query.data?.items ?? []
  const isLoading = query.isPending
  const loadError = query.error?.message
  const isIngesting = creation.isPending
  const selectedItem = items.find((item) => item.id === selectedId)
  const isBusy = isLoading || pendingItemIds.size > 0 || isIngesting
  const action = selectedId ? byItem.get(selectedId) : undefined
  const firstItem = query.data?.total ? (query.data.page - 1) * query.data.pageSize + 1 : 0
  const lastItem = query.data ? Math.min(query.data.page * query.data.pageSize, query.data.total) : 0

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
      setPage(1)
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
    if (!nextAction) return

    runAction(selectedItem.id, nextAction, () => {
      if (statusFilter !== 'ALL') changePage(1)
    })
  }

  function changePage(nextPage: number) {
    setPage(nextPage)
    setSelectedId(null)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 md:px-6 lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <header className="mb-6 flex shrink-0 flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold tracking-widest text-blue-700">OPERATIONS</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Work items</h1>
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

      {loadError && (
        <div className="mb-5">
          <ErrorMessage>
            <strong>{query.data === undefined ? 'Could not load work items.' : 'Could not refresh work items.'}</strong> {loadError}
            {query.data !== undefined && <p>The displayed list may be out of date. Any successful changes remain saved.</p>}
            <Button className="mt-2.5 block" disabled={isBusy || query.isFetching} onClick={refresh}>Try again</Button>
          </ErrorMessage>
        </div>
      )}

      <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="panel flex flex-col overflow-hidden lg:min-h-0" aria-labelledby="queue-heading" aria-busy={query.isFetching}>
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="queue-heading">Work queue</h2>
              <p className="muted mt-1">Choose an item to review its details.</p>
            </div>
            <label className="w-full sm:w-48">
              Filter by status
              <select
                className="control"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as WorkItemStatus | 'ALL')
                  setPage(1)
                  setSelectedId(null)
                }}
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
              <p className="muted my-4 shrink-0">
                {query.data.total === 0
                  ? 'No results'
                  : `Showing ${firstItem}–${lastItem} of ${query.data.total}`}
              </p>
              <div className="max-h-[55vh] min-h-0 flex-1 overflow-y-auto pr-1 lg:max-h-none">
                <WorkItemList
                  items={items}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  emptyMessage={statusFilter === 'ALL'
                    ? 'No work items yet. Use Ingest item to add incoming work.'
                    : 'No work items match this status.'}
                />
              </div>
              {query.data.totalPages > 1 && (
                <nav className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4" aria-label="Work item pages">
                  <Button
                    disabled={page === 1 || query.isPlaceholderData}
                    onClick={() => changePage(page - 1)}
                  >
                    Previous
                  </Button>
                  <span className="muted">Page {query.data.page} of {query.data.totalPages}</span>
                  <Button
                    disabled={page === query.data.totalPages || query.isPlaceholderData}
                    onClick={() => changePage(page + 1)}
                  >
                    Next
                  </Button>
                </nav>
              )}
            </>
          )}
        </section>

        <section className="panel lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden" aria-labelledby="details-heading">
          <div className="shrink-0 border-b border-slate-200 pb-4">
            <h2 id="details-heading">{showIngestForm ? 'New work item' : 'Item details'}</h2>
            <p className="muted mt-1">
              {showIngestForm ? 'Add incoming work to the queue.' : 'Review the request and its latest analysis.'}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pt-5 pr-1">
            {showIngestForm ? (
              <CreateWorkItemForm
                disabled={isBusy}
                isSubmitting={isIngesting}
                error={creation.error?.message ?? ''}
                onSubmit={handleIngest}
                onCancel={() => setShowIngestForm(false)}
              />
            ) : selectedItem ? (
              <div className="space-y-5">
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
              </div>
            ) : (
              <p className="py-7 text-slate-500">Select a work item to view its details and AI analysis.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
