import { useNavigate } from 'react-router-dom'
import SparklineChart from './SparklineChart'
import { useMarketStatus } from '../../hooks/useMarketStatus'
import { useApp } from '../../contexts/AppContext'

export default function MarketIndicator({ symbol, label, quote, sparkData, loading, updatedAt }) {
  const navigate    = useNavigate()
  const { lang }    = useApp()
  const isHe        = lang === 'he'
  const mktStatus   = useMarketStatus()   // 'open' | 'premarket' | 'afterhours' | 'closed'
  const isLive      = mktStatus === 'open'
  const isExtended  = mktStatus === 'premarket' || mktStatus === 'afterhours'

  if (loading) {
    return (
      <div className="card px-5 py-4 flex flex-col gap-2 w-52">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-6 w-28" />
        <div className="skeleton h-3 w-12" />
        <div className="skeleton h-10 w-full mt-1" />
      </div>
    )
  }

  const price        = quote?.regularMarketPrice
  const change       = quote?.regularMarketChange
  const changePercent = quote?.regularMarketChangePercent
  const isPositive   = (changePercent ?? 0) >= 0

  // Format price — BTC needs no decimals above 1k, indices need commas
  const fmtPrice = (p) => {
    if (p == null) return '—'
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Last-updated label
  const updatedLabel = (() => {
    if (!updatedAt) return null
    const sec = Math.round((Date.now() - updatedAt) / 1000)
    if (sec < 5)  return isHe ? 'עכשיו'         : 'just now'
    if (sec < 60) return isHe ? `לפני ${sec}ש'`  : `${sec}s ago`
    return isHe ? `לפני ${Math.floor(sec/60)}ד'` : `${Math.floor(sec/60)}m ago`
  })()

  return (
    <div
      onClick={() => navigate(`/stock/${symbol}`)}
      className="card px-5 py-4 flex flex-col gap-1 w-52 cursor-pointer
                 hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10
                 transition-all duration-150 select-none relative overflow-hidden"
    >
      {/* LIVE / EXTENDED badge top-right */}
      {(isLive || isExtended) && (
        <div style={{
          position: 'absolute', top: '8px', insetInlineEnd: '8px',
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '1px 7px', borderRadius: '10px',
          background: isLive ? '#22c55e18' : '#f59e0b18',
          border: `1px solid ${isLive ? '#22c55e44' : '#f59e0b44'}`,
        }}>
          {isLive && (
            <span style={{ position: 'relative', display: 'inline-flex', width: '6px', height: '6px' }}>
              <span style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: '#22c55e', opacity: 0.5,
                animation: 'mi-ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
              }} />
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'block' }} />
            </span>
          )}
          <span style={{
            fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em',
            fontFamily: 'Inter, sans-serif',
            color: isLive ? '#22c55e' : '#f59e0b',
          }}>
            {isLive
              ? (isHe ? 'חי' : 'LIVE')
              : (mktStatus === 'premarket' ? (isHe ? 'פרה' : 'PRE') : (isHe ? 'אחרי' : 'POST'))}
          </span>
        </div>
      )}

      {/* Label */}
      <span className="text-xs text-tx-muted font-heebo tracking-wide uppercase">{label}</span>

      {/* Price */}
      <span className="text-2xl font-bold text-tx-primary font-inter tabular-nums leading-tight">
        {fmtPrice(price)}
      </span>

      {/* Change % + absolute */}
      {changePercent != null && (
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-bold font-inter tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
          </span>
          {change != null && (
            <span className={`text-xs font-inter tabular-nums opacity-60 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              ({isPositive ? '+' : ''}{change.toFixed(2)})
            </span>
          )}
        </div>
      )}

      {/* Last updated */}
      {updatedLabel && (
        <span style={{ fontSize: '9px', color: '#8b949e', fontFamily: 'Inter, sans-serif', marginTop: '-2px' }}>
          {isHe ? 'עודכן ' : 'Updated '}{updatedLabel}
        </span>
      )}

      {/* Sparkline — today's intraday 5-min candles */}
      <div className="mt-1">
        <SparklineChart
          prices={sparkData}
          isPositive={isPositive}
          width={168}
          height={42}
        />
      </div>

      <style>{`
        @keyframes mi-ping {
          0%   { transform: scale(1);   opacity: 0.5; }
          70%  { transform: scale(2.2); opacity: 0;   }
          100% { transform: scale(2.2); opacity: 0;   }
        }
      `}</style>
    </div>
  )
}
