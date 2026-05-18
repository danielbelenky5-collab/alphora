import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import { STOCKS } from '../../../constants/stocks'
import { useApp } from '../../../contexts/AppContext'

function useSearchDebounced(query, delay = 350) {
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!query || query.length < 1) { setResults([]); return }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await axios.get(`/api/search?q=${encodeURIComponent(query)}`)
        setResults(Array.isArray(res.data) ? res.data : [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, delay)
    return () => clearTimeout(timerRef.current)
  }, [query, delay])

  return { results, searching }
}

export default function AddStockDropdown({ watchlist, onAdd }) {
  const { lang, t } = useApp()
  const [open,   setOpen]   = useState(false)
  const [filter, setFilter] = useState('')
  const ref      = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else setFilter('')
  }, [open])

  const { results: searchResults, searching } = useSearchDebounced(filter)

  // Local predefined list filtered
  const localMatches = filter.length > 0
    ? STOCKS.filter(s =>
        !watchlist.includes(s.symbol) &&
        (s.symbol.toLowerCase().includes(filter.toLowerCase()) ||
         s.nameEn.toLowerCase().includes(filter.toLowerCase()) ||
         s.nameHe.includes(filter))
      )
    : STOCKS.filter(s => !watchlist.includes(s.symbol))

  // Live search results: dedupe against local and already-in-watchlist
  const liveResults = searchResults.filter(
    r => !watchlist.includes(r.symbol) &&
         !localMatches.some(l => l.symbol === r.symbol)
  )

  const handleAdd = useCallback((symbol) => {
    onAdd(symbol)
    setOpen(false)
    setFilter('')
  }, [onAdd])

  const isEmpty = localMatches.length === 0 && liveResults.length === 0 && !searching

  // Group local by sector only when no filter
  const sectors = filter.length === 0
    ? [...new Set(localMatches.map(s => s.sector))]
    : null

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full btn-primary text-sm font-heebo flex items-center justify-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {t('addStock')}
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 z-50 card shadow-xl"
          style={{ width: 'max(220px, 100%)', maxHeight: 300, overflowY: 'auto' }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-surface-border sticky top-0 bg-[var(--color-surface-alt,#161b22)]">
            <div className="relative">
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tx-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder={lang === 'he' ? 'חפש כל מניה...' : 'Search any stock...'}
                className="w-full bg-surface text-sm text-tx-primary placeholder-tx-muted pl-7 pr-2 py-1 rounded outline-none font-heebo"
              />
              {searching && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 border border-brand-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </div>

          {/* Empty */}
          {isEmpty && !searching && (
            <div className="px-3 py-3 text-xs text-tx-muted font-heebo text-center">
              {filter ? (lang === 'he' ? 'לא נמצאו תוצאות' : 'No results found') : t('allAdded')}
            </div>
          )}

          {/* Local results — grouped by sector when no filter, flat when filtering */}
          {sectors ? (
            sectors.map(sector => (
              <div key={sector}>
                <div className="px-3 py-1 text-[10px] font-bold text-tx-muted uppercase tracking-wider bg-surface/50 font-inter">
                  {sector}
                </div>
                {localMatches.filter(s => s.sector === sector).map(stock => (
                  <StockRow key={stock.symbol} symbol={stock.symbol}
                    name={lang === 'he' ? stock.nameHe : stock.nameEn}
                    onAdd={handleAdd} />
                ))}
              </div>
            ))
          ) : (
            localMatches.map(stock => (
              <StockRow key={stock.symbol} symbol={stock.symbol}
                name={lang === 'he' ? stock.nameHe : stock.nameEn}
                onAdd={handleAdd} />
            ))
          )}

          {/* Live search results */}
          {liveResults.length > 0 && (
            <>
              {(localMatches.length > 0) && (
                <div className="px-3 py-1 text-[10px] font-bold text-tx-muted uppercase tracking-wider bg-surface/50 font-inter border-t border-surface-border">
                  {lang === 'he' ? 'תוצאות חיפוש' : 'Search results'}
                </div>
              )}
              {liveResults.map(r => (
                <StockRow key={r.symbol} symbol={r.symbol} name={r.name}
                  badge={r.exchange} onAdd={handleAdd} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function StockRow({ symbol, name, badge, onAdd }) {
  return (
    <button
      onClick={() => onAdd(symbol)}
      className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-hover transition-colors"
    >
      <span className="text-sm font-semibold text-tx-primary font-inter">{symbol}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs text-tx-muted font-heebo truncate max-w-[110px]">{name}</span>
        {badge && (
          <span className="text-[10px] text-tx-muted font-inter opacity-60 flex-shrink-0">{badge}</span>
        )}
      </div>
    </button>
  )
}
