import { useQuery } from '@tanstack/react-query'
import client from '../api/client'

export function useQuotes(symbols, options = {}) {
  return useQuery({
    queryKey: ['quotes', [...symbols].sort().join(',')],   // sort → stable key regardless of order
    queryFn:  () => client.get(`/quotes?symbols=${symbols.join(',')}`),
    refetchInterval: options.refetchInterval ?? 8_000,    // poll every 8 s
    staleTime: 5_000,                                     // match server TTL
    enabled: symbols.length > 0,
  })
}
