import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import client from '../api/client'

export function useSearch(query) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400)
    return () => clearTimeout(timer)
  }, [query])

  return useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => client.get(`/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length > 1,
    staleTime: 60000,
  })
}
