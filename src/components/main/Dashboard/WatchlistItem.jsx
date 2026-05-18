import { useNavigate } from 'react-router-dom'
import { useApp } from '../../../contexts/AppContext'
import { useMarketStatus } from '../../../hooks/useMarketStatus'
import { getStock } from '../../../constants/stocks'

// ── Market status dot ────────────────────────────────────────────────────────
// Priority:
//   1. Yahoo `tradeable === false` → halted (orange) — most specific
//   2. Yahoo `marketState` when quote is loaded → most accurate real-time
//   3. `useMarketStatus` hook (ET clock + NYSE holidays) → instant fallback
//
// marketState values from Yahoo Finance:
//   REGULAR   = market open, normal trading
//   PRE       = pre-market
//   POST      = after-hours
//   POSTPOST  = extended after-hours
//   PREPRE    = before pre-market
//   CLOSED    = market closed

function MarketDot({ marketState, tradeable, quoteLoaded, lang }) {
  // Instant clock-based fallback (updates every 30 s)
  const clockStatus = useMarketStatus()  // 'open' | 'premarket' | 'afterhours' | 'closed'

  // Resolve the effective market state
  // Use Yahoo's answer when the quote has arrived; otherwise trust the clock
  let effectiveState
  if (quoteLoaded) {
    effectiveState = marketState  // Yahoo is authoritative once loaded
  } else {
    // Map clock status → Yahoo-style state for unified handling below
    effectiveState = {
      open:       'REGULAR',
      premarket:  'PRE',
      afterhours: 'POST',
      closed:     'CLOSED',
    }[clockStatus] ?? 'CLOSED'
  }

  const isOpen    = effectiveState === 'REGULAR'
  const isHalted  = isOpen && tradeable === false
  const isPrePost = ['PRE', 'POST', 'POSTPOST', 'PREPRE'].includes(effectiveState)

  let color, pulse, title
  if (isHalted) {
    color = '#f97316'
    pulse = false
    title = lang === 'he' ? 'מסחר מושהה זמנית' : 'Trading temporarily halted'
  } else if (isOpen) {
    color = '#22c55e'
    pulse = true
    title = lang === 'he' ? '🟢 שוק פתוח' : '🟢 Market open'
  } else if (isPrePost) {
    color = '#f97316'
    pulse = false
    title = effectiveState === 'PRE'
      ? (lang === 'he' ? '🟡 פרה-מרקט' : '🟡 Pre-market')
      : (lang === 'he' ? '🟡 אחרי שעות' : '🟡 After hours')
  } else {
    color = '#ef4444'
    pulse = false
    title = lang === 'he' ? '🔴 שוק סגור' : '🔴 Market closed'
  }

  return (
    <span title={title} style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, width: '9px', height: '9px' }}>
      {pulse && (
        <span style={{
          position: 'absolute', inset: '-2px', borderRadius: '50%',
          background: color, opacity: 0.35,
          animation: 'wli-ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
        }} />
      )}
      <span style={{
        width: '9px', height: '9px', borderRadius: '50%',
        background: color, display: 'block', flexShrink: 0,
        boxShadow: `0 0 ${pulse ? '6px' : '3px'} ${color}88`,
      }} />
      <style>{`
        @keyframes wli-ping {
          0%   { transform: scale(1);   opacity: 0.35; }
          70%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
    </span>
  )
}

export default function WatchlistItem({ symbol, quote, onRemove }) {
  const { lang } = useApp()
  const navigate  = useNavigate()
  const stock     = getStock(symbol)

  const price       = quote?.regularMarketPrice
  const change      = quote?.regularMarketChangePercent
  const isPos       = (change ?? 0) >= 0
  const marketState = quote?.marketState ?? 'CLOSED'
  const tradeable   = quote?.tradeable   ?? true
  const quoteLoaded = quote != null

  return (
    <div
      className="flex items-center justify-between py-2.5 border-b border-surface-border/50 group cursor-pointer hover:bg-surface-hover/40 transition-colors rounded px-1"
      onClick={() => navigate(`/stock/${symbol}`)}
      title={lang === 'he' ? `פתח את ${symbol}` : `Open ${symbol}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Market status dot */}
        <MarketDot marketState={marketState} tradeable={tradeable} quoteLoaded={quoteLoaded} lang={lang} />

        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-tx-primary font-inter">{symbol}</span>
          <span className="text-xs text-tx-muted truncate font-heebo">
            {lang === 'he' ? (stock?.nameHe || stock?.nameEn || symbol) : (stock?.nameEn || symbol)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium text-tx-primary font-inter tabular-nums">
            {price != null ? price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
          </span>
          {change != null && (
            <span className={`text-xs font-inter tabular-nums ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPos ? '+' : ''}{change.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={e => { e.stopPropagation(); onRemove(symbol) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-tx-muted hover:text-red-400 p-0.5"
          title={lang === 'he' ? 'הסר מניה' : 'Remove stock'}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
