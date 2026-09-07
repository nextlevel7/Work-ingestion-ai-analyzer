import { useQuery } from '@tanstack/react-query'
import { getWorkItems } from '../api/work-items.api'
import { workItemKeys } from '../query-keys'
import type { WorkItemFilters } from '../types/work-item'

export function useWorkItems(filters: WorkItemFilters) {
  return useQuery({
    queryKey: workItemKeys.list(filters),
    queryFn: ({ signal }) => getWorkItems(filters, signal),
    placeholderData: (previous, previousQuery) => {
      const previousFilters = previousQuery?.queryKey[2] as WorkItemFilters | undefined
      return previousFilters?.status === filters.status ? previous : undefined
    },
    staleTime: 30_000,
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}
