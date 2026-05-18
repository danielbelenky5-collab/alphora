import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AddStockDropdown from './AddStockDropdown'
import WatchlistItem from './WatchlistItem'
import { useWatchlist, MAX_STOCKS } from '../../../hooks/useWatchlist'
import { useQuotes } from '../../../hooks/useQuotes'
import { useApp } from '../../../contexts/AppContext'
import { useAuth } from '../../../contexts/AuthContext'

// ── Arrow button ──────────────────────────────────────────────────────────────
function ArrowBtn({ onClick, disabled, dir }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center w-5 h-5 rounded hover:bg-surface-hover disabled:opacity-30 transition-colors text-tx-muted hover:text-tx-primary"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        {dir === 'left'
          ? <polyline points="15 18 9 12 15 6" />
          : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function DashboardPanel() {
  const { lang } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isHe = lang === 'he'

  const {
    watchlist, activeList, activeIndex, totalLists,
    add, remove, goNext, goPrev, addList, removeList, renameList,
  } = useWatchlist()

  const { data: quotes } = useQuotes(watchlist, { refetchInterval: 30000 })

  const quoteMap = {}
  if (Array.isArray(quotes)) quotes.forEach(q => { quoteMap[q.symbol] = q })

  const stocksLeft = MAX_STOCKS - watchlist.length

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingName,   setEditingName]   = useState(false)
  const [nameValue,     setNameValue]     = useState('')
  const nameInputRef = useRef(null)

  // Focus input when edit mode opens
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingName])

  function startRename() {
    setNameValue(activeList.name)
    setEditingName(true)
    setConfirmDelete(false)
  }

  function commitRename() {
    const trimmed = nameValue.trim()
    if (trimmed) renameList(activeIndex, trimmed)
    setEditingName(false)
  }

  function handleNameKey(e) {
    if (e.key === 'Enter')  commitRename()
    if (e.key === 'Escape') setEditingName(false)
  }

  if (!user) {
    return (
      <div className="card p-0 flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border flex-shrink-0">
          <div className="w-1.5 h-5 rounded-full bg-brand-500 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-tx-primary font-heebo flex-1 truncate">
            {isHe ? 'מניות למעקב' : 'Watchlist'}
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <span style={{ fontSize: 36 }}>🔒</span>
          <p className="text-sm font-semibold text-tx-primary font-heebo">
            {isHe ? 'נדרשת התחברות' : 'Login Required'}
          </p>
          <p className="text-xs text-tx-muted font-heebo leading-relaxed">
            {isHe ? 'התחבר כדי לנהל את רשימת המעקב שלך' : 'Log in to manage your watchlist'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary text-xs px-4 py-2 font-heebo"
          >
            {isHe ? 'להתחברות ←' : 'Login →'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-0 flex flex-col h-full overflow-hidden">

      {/* ── Title bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border flex-shrink-0">
        <div className="w-1.5 h-5 rounded-full bg-brand-500 flex-shrink-0" />
        <h2 className="text-sm font-semibold text-tx-primary font-heebo flex-1 truncate">
          {isHe ? 'מניות למעקב' : 'Watchlist'}
        </h2>
      </div>

      {/* ── List navigator ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-surface-border/60 flex-shrink-0 bg-surface/40">
        <ArrowBtn onClick={goPrev} disabled={totalLists <= 1} dir="left" />

        {/* List name + count — click to rename */}
        <div className="flex-1 flex flex-col items-center min-w-0 px-1">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleNameKey}
              maxLength={20}
              className="w-full text-xs font-semibold text-tx-primary font-heebo bg-surface border border-brand-500 rounded px-1 py-0 text-center outline-none"
              style={{ minWidth: 0 }}
            />
          ) : (
            <button
              onClick={startRename}
              title={isHe ? 'לחץ לשינוי שם' : 'Click to rename'}
              className="text-xs font-semibold text-tx-primary font-heebo truncate max-w-full hover:text-brand-400 transition-colors"
            >
              {activeList.name}
            </button>
          )}
          <span className="text-[10px] text-tx-muted font-inter mt-0.5">
            {activeIndex + 1} / {totalLists}
          </span>
        </div>

        <ArrowBtn onClick={goNext} disabled={totalLists <= 1} dir="right" />

        {/* Add new list */}
        <button
          onClick={addList}
          className="ml-1 flex items-center justify-center w-5 h-5 rounded hover:bg-surface-hover transition-colors text-tx-muted hover:text-brand-400"
          title={isHe ? 'הוסף רשימה חדשה' : 'Add new list'}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Delete current list — only when >1 list */}
        {totalLists > 1 && (
          confirmDelete ? (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => { removeList(activeIndex); setConfirmDelete(false) }}
                className="text-[10px] text-red-400 hover:text-red-300 font-heebo font-semibold"
              >
                {isHe ? 'מחק' : 'Yes'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[10px] text-tx-muted hover:text-tx-primary font-heebo"
              >
                {isHe ? 'בטל' : 'No'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="ml-0.5 flex items-center justify-center w-5 h-5 rounded hover:bg-surface-hover transition-colors text-tx-muted hover:text-red-400"
              title={isHe ? 'מחק רשימה' : 'Delete list'}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          )
        )}
      </div>

      {/* ── Add stock button ──────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <AddStockDropdown watchlist={watchlist} onAdd={add} />
        {stocksLeft < MAX_STOCKS && (
          <p className="text-[10px] text-tx-muted text-center mt-1 font-heebo">
            {isHe
              ? `${watchlist.length} / ${MAX_STOCKS} מניות`
              : `${watchlist.length} / ${MAX_STOCKS} stocks`}
          </p>
        )}
      </div>

      {/* ── Stock list ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {watchlist.length === 0 ? (
          <p className="text-xs text-tx-muted text-center py-6 font-heebo">
            {isHe ? 'אין מניות ברשימה זו' : 'No stocks in this list'}
          </p>
        ) : (
          watchlist.map(symbol => (
            <WatchlistItem
              key={symbol}
              symbol={symbol}
              quote={quoteMap[symbol]}
              onRemove={remove}
            />
          ))
        )}
      </div>
    </div>
  )
}
