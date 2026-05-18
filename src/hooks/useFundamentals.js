import { useQuery } from '@tanstack/react-query'
import client from '../api/client'

export function useFundamentals(symbol) {
  return useQuery({
    queryKey:  ['fundamentals', symbol],
    queryFn:   () => client.get(`/fundamentals/${symbol}`),
    staleTime: 300_000,
    refetchInterval: (query) => {
      // If data is partial (API rate-limited), retry every 30s
      const d = query.state.data?.data ?? query.state.data
      return d?._partial ? 30_000 : false
    },
    enabled: !!symbol,
  })
}
