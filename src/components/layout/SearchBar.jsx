import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearch } from '../../hooks/useSearch'
import { useApp } from '../../contexts/AppContext'

export default function SearchBar({ mode = 'topbar' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const { t } = useApp()

  const { data: results, isFetching } = useSearch(query)

  useEffect(() => {
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(symbol) {
    setQuery('')
    setOpen(false)
    navigate(`/stock/${symbol}`)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (query.trim()) handleSelect(query.trim().toUpperCase())
  }

  function handleChange(e) {
    setQuery(e.target.value)
    setOpen(e.target.value.length > 1)
  }

  const isLanding = mode === 'landing'

  return (
    <div
      ref={containerRef}
      className={`relative ${isLanding ? 'w-full max-w-xl' : 'w-full max-w-sm'}`}
    >
      <form onSubmit={handleSubmit}>
        <div className={`
          flex items-center gap-2
          bg-surface-card border border-surface-border
          rounded-xl px-4 transition-all
          focus-within:border-brand-500
          ${isLanding ? 'py-4 text-lg' : 'py-2.5 text-sm'}
        `}>
          <button type="submit" className="text-tx-muted hover:text-tx-primary transition-colors flex-shrink-0">
            <svg className={isLanding ? 'w-5 h-5' : 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => query.length > 1 && setOpen(true)}
            placeholder={t('searchPlaceholder')}
            dir="auto"
            className={`
              flex-1 bg-transparent outline-none text-tx-primary placeholder-tx-muted
              font-heebo
              ${isLanding ? 'text-lg' : 'text-sm'}
            `}
          />

          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}
              className="text-tx-muted hover:text-tx-primary transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {open && (
        <div className="absolute top-full mt-1 w-full z-50 card shadow-xl overflow-hidden">
          {isFetching && (
            <div className="px-4 py-3 text-sm text-tx-muted font-heebo">{t('loading')}</div>
          )}
          {!isFetching && results?.length === 0 && (
            <div className="px-4 py-3 text-sm text-tx-muted font-heebo">{t('noResults')}</div>
          )}
          {results?.map(item => (
            <button
              key={item.symbol}
              onClick={() => handleSelect(item.symbol)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors text-left"
            >
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold text-tx-primary font-inter">{item.symbol}</span>
                <span className="text-xs text-tx-muted font-heebo">{item.name}</span>
              </div>
              <span className="text-xs text-tx-muted">{item.exchange}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
