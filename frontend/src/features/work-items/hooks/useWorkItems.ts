import { useQuery } from '@tanstack/react-query'
import { getWorkItems } from '../api/work-items.api'
import { workItemKeys } from '../query-keys'

export function useWorkItems() {
  return useQuery({
    queryKey: workItemKeys.list,
    queryFn: ({ signal }) => getWorkItems(signal),
    staleTime: 30_000,
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}
