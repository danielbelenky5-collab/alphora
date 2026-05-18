import { useQueries } from '@tanstack/react-query'
import client from '../api/client'

/**
 * Fetches intraday (5-min) sparkline data for the given symbols.
 * - Uses period=Intraday → 5-min candles for today
 * - Refreshes every 30 s during the session so the chart stays live
 */
export function useSparklines(symbols) {
  const results = useQueries({
    queries: symbols.map(symbol => ({
      queryKey:       ['sparkline-intraday', symbol],
      queryFn:        () => client.get(`/history/${symbol}?period=Intraday`),
      staleTime:      20_000,   // treat fresh for 20 s
      refetchInterval: 30_000,  // poll every 30 s
    })),
  })

  const sparkMap = {}
  symbols.forEach((symbol, i) => {
    const data = results[i]?.data?.data
    if (Array.isArray(data) && data.length >= 2) {
      sparkMap[symbol] = data.map(d => d.close).filter(v => v != null)
    } else {
      sparkMap[symbol] = []
    }
  })

  const isLoading = results.some(r => r.isLoading)
  return { sparkMap, isLoading }
}
