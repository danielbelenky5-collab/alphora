import { useState, useCallback } from 'react'

const STORAGE_KEY = 'watchlistV2'
export const MAX_STOCKS = 30

function loadFromStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.lists?.length > 0) return saved
  } catch {}
  // Migrate old single-list format
  try {
    const old = JSON.parse(localStorage.getItem('watchlist') || '[]')
    if (old.length > 0) {
      return { lists: [{ name: 'רשימה 1', symbols: old }], activeIndex: 0 }
    }
  } catch {}
  return { lists: [{ name: 'רשימה 1', symbols: [] }], activeIndex: 0 }
}

function persist(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function useWatchlist() {
  const [state, setState] = useState(loadFromStorage)

  const { lists, activeIndex } = state
  const activeList   = lists[activeIndex] || lists[0] || { name: 'רשימה 1', symbols: [] }
  const watchlist    = activeList.symbols
  const totalLists   = lists.length

  const update = useCallback((fn) => {
    setState(prev => {
      const next = fn(prev)
      persist(next)
      return next
    })
  }, [])

  const add = useCallback((symbol) => {
    update(prev => {
      const lists = prev.lists.map((l, i) => {
        if (i !== prev.activeIndex) return l
        if (l.symbols.includes(symbol) || l.symbols.length >= MAX_STOCKS) return l
        return { ...l, symbols: [...l.symbols, symbol] }
      })
      return { ...prev, lists }
    })
  }, [update])

  const remove = useCallback((symbol) => {
    update(prev => {
      const lists = prev.lists.map((l, i) =>
        i !== prev.activeIndex ? l : { ...l, symbols: l.symbols.filter(s => s !== symbol) }
      )
      return { ...prev, lists }
    })
  }, [update])

  const goNext = useCallback(() => {
    update(prev => ({ ...prev, activeIndex: (prev.activeIndex + 1) % prev.lists.length }))
  }, [update])

  const goPrev = useCallback(() => {
    update(prev => ({ ...prev, activeIndex: (prev.activeIndex - 1 + prev.lists.length) % prev.lists.length }))
  }, [update])

  const addList = useCallback(() => {
    update(prev => {
      const newIndex = prev.lists.length
      return {
        lists: [...prev.lists, { name: `רשימה ${newIndex + 1}`, symbols: [] }],
        activeIndex: newIndex,
      }
    })
  }, [update])

  const removeList = useCallback((index) => {
    update(prev => {
      if (prev.lists.length <= 1) return prev
      const lists = prev.lists.filter((_, i) => i !== index)
      const activeIndex = Math.min(prev.activeIndex, lists.length - 1)
      return { lists, activeIndex }
    })
  }, [update])

  const renameList = useCallback((index, name) => {
    update(prev => {
      const lists = prev.lists.map((l, i) => i === index ? { ...l, name } : l)
      return { ...prev, lists }
    })
  }, [update])

  return {
    watchlist,
    activeList,
    activeIndex,
    totalLists,
    add,
    remove,
    goNext,
    goPrev,
    addList,
    removeList,
    renameList,
  }
}
