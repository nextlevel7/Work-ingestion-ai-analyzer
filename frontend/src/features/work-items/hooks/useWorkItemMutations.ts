import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import * as api from '../api/work-items.api'
import { workItemKeys } from '../query-keys'
import type { WorkItem, WorkItemAction, WorkItemPage } from '../types/work-item'

interface ActionInput {
  id: string
  action: WorkItemAction
}

const operations = {
  analyse: api.analyseWorkItem,
  retry: api.retryWorkItem,
  complete: api.completeWorkItem,
}

async function refreshAfterSave(client: QueryClient, savedItem: WorkItem) {
  // Cancel older reads before caching the saved item.
  await client.cancelQueries({ queryKey: workItemKeys.all })
  client.setQueriesData<WorkItemPage>({ queryKey: workItemKeys.lists }, (data) => {
    if (!data?.items.some((item) => item.id === savedItem.id)) return data
    return {
      ...data,
      items: data.items.map((item) => item.id === savedItem.id ? savedItem : item),
    }
  })
  // A failed refresh must not turn a successful save into a mutation error.
  await client.invalidateQueries({ queryKey: workItemKeys.all }, { throwOnError: false })
}

export function useCreateWorkItem() {
  const client = useQueryClient()
  return useMutation({
    mutationKey: workItemKeys.create,
    mutationFn: api.ingestWorkItem,
    retry: false,
    onSuccess: ({ item }) => refreshAfterSave(client, item),
  })
}

export function useWorkItemActions() {
  const client = useQueryClient()
  const mutation = useMutation({
    mutationKey: workItemKeys.action,
    mutationFn: ({ id, action }: ActionInput) => operations[action](id),
    retry: false,
    onSuccess: (item) => refreshAfterSave(client, item),
  })
  // Read every action so concurrent items have separate pending/error states.
  const actions = useMutationState({
    filters: {
      mutationKey: workItemKeys.action,
      exact: true,
      predicate: (entry) => entry.state.variables !== undefined,
    },
    select: (entry) => ({
      input: entry.state.variables as ActionInput,
      status: entry.state.status,
      submittedAt: entry.state.submittedAt,
      error: entry.state.error,
      data: entry.state.data as WorkItem | undefined,
    }),
  })
  const pendingItemIds = new Set(actions
    .filter((action) => action.status === 'pending')
    .map((action) => action.input.id))
  const byItem = new Map(actions.map((action) => [action.input.id, action]))

  function runAction(id: string, action: WorkItemAction, onSuccess?: () => void) {
    // Also guard calls made before the disabled button renders.
    if (client.isMutating({
      mutationKey: workItemKeys.action,
      predicate: (entry) => (entry.state.variables as ActionInput).id === id,
    }) || client.isMutating({ mutationKey: workItemKeys.create })) return
    mutation.mutate({ id, action }, { onSuccess })
  }

  return { runAction, pendingItemIds, byItem }
}
