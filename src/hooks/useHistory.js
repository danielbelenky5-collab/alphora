import { useQuery } from '@tanstack/react-query'
import client from '../api/client'

export function useHistory(symbol, period) {
  return useQuery({
    queryKey: ['history', symbol, period],
    queryFn: () => client.get(`/history/${symbol}?period=${period}`),
    staleTime: 60000,
    enabled: !!symbol,
  })
}
