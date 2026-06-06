import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

const STORAGE_KEY = 'watchlistV2'
export const MAX_STOCKS = 30
const TOKEN_KEY = 'alphora_token'

// ── API helper ────────────────────────────────────────────────────────────────
function apiFetch(path, options = {}) {
  const base = import.meta.env.VITE_API_URL
    ? `https://${import.meta.env.VITE_API_URL}/api`
    : '/api'
  const token = localStorage.getItem(TOKEN_KEY)
  return fetch(`${base}/user${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  }).then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
}

// ── localStorage helpers ──────────────────────────────────────────────────────
function loadFromStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.lists?.length > 0) return saved
  } catch {}
  try {
    const old = JSON.parse(localStorage.getItem('watchlist') || '[]')
    if (old.length > 0)
      return { lists: [{ name: 'רשימה 1', symbols: old }], activeIndex: 0 }
  } catch {}
  return { lists: [{ name: 'רשימה 1', symbols: [] }], activeIndex: 0 }
}

function persistLocal(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// ── Server response → internal state ─────────────────────────────────────────
function serverToState(data) {
  const lists = (data.lists || []).map(l => ({
    name: l.listName,
    symbols: (l.symbols || []).filter(s => s !== '__PLACEHOLDER__'),
    _listIndex: l.listIndex,
  }))
  if (lists.length === 0)
    lists.push({ name: 'רשימה 1', symbols: [], _listIndex: 0 })
  return { lists, activeIndex: 0 }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useWatchlist() {
  const { user } = useAuth()
  const isLoggedIn = !!user

  const [state, setStateRaw] = useState(loadFromStorage)
  const [loadingServer, setLoadingServer] = useState(false)
  const stateRef = useRef(state)

  const setState = useCallback((fn) => {
    setStateRaw(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn
      stateRef.current = next
      return next
    })
  }, [])

  // ── Load from server when auth status changes ─────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) {
      const local = loadFromStorage()
      setState(local)
      stateRef.current = local
      return
    }
    setLoadingServer(true)
    apiFetch('/watchlist')
      .then(data => setState(serverToState(data)))
      .catch(() => {})
      .finally(() => setLoadingServer(false))
  }, [isLoggedIn]) // eslint-disable-line react-hooks/exhaustive-deps

  const { lists, activeIndex } = state
  const activeList  = lists[activeIndex] || lists[0] || { name: 'רשימה 1', symbols: [] }
  const watchlist   = activeList.symbols
  const totalLists  = lists.length

  // ── Local-only update (guests) ────────────────────────────────────────────
  const updateLocal = useCallback((fn) => {
    setState(prev => { const next = fn(prev); persistLocal(next); return next })
  }, [setState])

  // ── Add symbol ────────────────────────────────────────────────────────────
  const add = useCallback((symbol) => {
    const cur = stateRef.current
    const idx = cur.activeIndex
    const list = cur.lists[idx]
    if (!list || list.symbols.includes(symbol) || list.symbols.length >= MAX_STOCKS) return

    setState(prev => {
      const lists = prev.lists.map((l, i) =>
        i !== prev.activeIndex ? l : { ...l, symbols: [...l.symbols, symbol] }
      )
      return { ...prev, lists }
    })

    if (!isLoggedIn) {
      persistLocal({ ...cur, lists: cur.lists.map((l, i) =>
        i !== idx ? l : { ...l, symbols: [...l.symbols, symbol] }
      )})
      return
    }
    apiFetch('/watchlist/symbol', {
      method: 'POST',
      body: JSON.stringify({ listIndex: list._listIndex ?? idx, listName: list.name, symbol }),
    }).catch(() => {})
  }, [isLoggedIn, setState])

  // ── Remove symbol ─────────────────────────────────────────────────────────
  const remove = useCallback((symbol) => {
    const cur = stateRef.current
    const idx = cur.activeIndex
    const list = cur.lists[idx]

    setState(prev => ({
      ...prev,
      lists: prev.lists.map((l, i) =>
        i !== prev.activeIndex ? l : { ...l, symbols: l.symbols.filter(s => s !== symbol) }
      ),
    }))

    if (!isLoggedIn) {
      persistLocal({ ...cur, lists: cur.lists.map((l, i) =>
        i !== idx ? l : { ...l, symbols: l.symbols.filter(s => s !== symbol) }
      )})
      return
    }
    apiFetch(`/watchlist/symbol/${symbol}?listIndex=${list._listIndex ?? idx}`, {
      method: 'DELETE',
    }).catch(() => {})
  }, [isLoggedIn, setState])

  // ── Navigate lists ────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setState(prev => ({ ...prev, activeIndex: (prev.activeIndex + 1) % prev.lists.length }))
  }, [setState])

  const goPrev = useCallback(() => {
    setState(prev => ({ ...prev, activeIndex: (prev.activeIndex - 1 + prev.lists.length) % prev.lists.length }))
  }, [setState])

  // ── Add list ──────────────────────────────────────────────────────────────
  const addList = useCallback(() => {
    const cur = stateRef.current
    const newName = `רשימה ${cur.lists.length + 1}`

    if (!isLoggedIn) {
      updateLocal(prev => ({
        lists: [...prev.lists, { name: newName, symbols: [] }],
        activeIndex: prev.lists.length,
      }))
      return
    }
    apiFetch('/watchlist/list', { method: 'POST', body: JSON.stringify({ listName: newName }) })
      .then(data => setState(prev => ({
        lists: [...prev.lists, { name: newName, symbols: [], _listIndex: data.listIndex }],
        activeIndex: prev.lists.length,
      })))
      .catch(() => {})
  }, [isLoggedIn, updateLocal, setState])

  // ── Remove list ───────────────────────────────────────────────────────────
  const removeList = useCallback((index) => {
    const cur = stateRef.current
    if (cur.lists.length <= 1) return
    const list = cur.lists[index]

    setState(prev => {
      const lists = prev.lists.filter((_, i) => i !== index)
      return { lists, activeIndex: Math.min(prev.activeIndex, lists.length - 1) }
    })

    if (!isLoggedIn) {
      const next = { lists: cur.lists.filter((_, i) => i !== index), activeIndex: Math.min(cur.activeIndex, cur.lists.length - 2) }
      persistLocal(next)
      return
    }
    apiFetch(`/watchlist/list/${list._listIndex ?? index}`, { method: 'DELETE' }).catch(() => {})
  }, [isLoggedIn, setState])

  // ── Rename list ───────────────────────────────────────────────────────────
  const renameList = useCallback((index, name) => {
    const cur = stateRef.current
    const list = cur.lists[index]

    setState(prev => ({ ...prev, lists: prev.lists.map((l, i) => i === index ? { ...l, name } : l) }))

    if (!isLoggedIn) {
      persistLocal({ ...cur, lists: cur.lists.map((l, i) => i === index ? { ...l, name } : l) })
      return
    }
    apiFetch(`/watchlist/list/${list._listIndex ?? index}/name`, {
      method: 'PUT',
      body: JSON.stringify({ listName: name }),
    }).catch(() => {})
  }, [isLoggedIn, setState])

  return {
    watchlist,
    activeList,
    activeIndex,
    totalLists,
    loadingServer,
    add,
    remove,
    goNext,
    goPrev,
    addList,
    removeList,
    renameList,
  }
}
