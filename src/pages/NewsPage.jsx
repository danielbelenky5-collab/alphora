import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import TopBar from '../components/layout/TopBar'
import { useApp } from '../contexts/AppContext'
import client from '../api/client'

const SOURCE_META = {
  yahoo:       { label: 'Yahoo Finance', color: '#7C3AED' },
  cnbc:        { label: 'CNBC',          color: '#DC2626' },
  marketwatch: { label: 'MarketWatch',  color: '#059669' },
  reuters:     { label: 'Reuters',       color: '#2563EB' },
}

// Sector ETF quick-filters
const SECTOR_FILTERS = [
  { labelHe: 'טק',         labelEn: 'Tech',       symbol: 'XLK',  color: '#3b6ff5' },
  { labelHe: 'פיננסים',   labelEn: 'Finance',    symbol: 'XLF',  color: '#f59e0b' },
  { labelHe: 'בריאות',    labelEn: 'Health',     symbol: 'XLV',  color: '#10b981' },
  { labelHe: 'אנרגיה',    labelEn: 'Energy',     symbol: 'XLE',  color: '#DC2626' },
  { labelHe: 'צריכה',     labelEn: 'Consumer',   symbol: 'XLY',  color: '#8b5cf6' },
  { labelHe: 'תעשייה',    labelEn: 'Industry',   symbol: 'XLI',  color: '#06b6d4' },
  { labelHe: 'נדל"ן',     labelEn: 'Real Est.',  symbol: 'XLRE', color: '#f97316' },
]

function timeAgo(isoDate, isHe) {
  const diff = (Date.now() - new Date(isoDate)) / 1000
  if (diff < 60)   return isHe ? 'הרגע' : 'just now'
  if (diff < 3600) return isHe ? `לפני ${Math.floor(diff/60)}ד` : `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return isHe ? `לפני ${Math.floor(diff/3600)}ש` : `${Math.floor(diff/3600)}h ago`
  return isHe ? `לפני ${Math.floor(diff/86400)}י` : `${Math.floor(diff/86400)}d ago`
}

function ImpactBadge({ impact }) {
  const colors = { High: '#DC2626', Medium: '#D97706', Low: '#6B7280' }
  const color  = colors[impact] || '#6B7280'
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
      background: color + '22', color, border: `1px solid ${color}44`,
      fontFamily: 'Inter, sans-serif',
    }}>
      {impact?.toUpperCase()}
    </span>
  )
}

function SkeletonCard({ C }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[80, 60, 40].map(w => (
        <div key={w} style={{ height: '12px', width: `${w}%`, background: C.border, borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  )
}

export default function NewsPage() {
  const { theme, lang } = useApp()
  const isDark = theme === 'dark'
  const isHe   = lang === 'he'

  const [activeSources, setActiveSources] = useState(['yahoo', 'cnbc', 'marketwatch', 'reuters'])
  const [symbolFilter,  setSymbolFilter]  = useState('')
  const [activeSector,  setActiveSector]  = useState(null)
  const [xOpen,         setXOpen]         = useState(false)

  const handleSectorClick = (sector) => {
    if (activeSector === sector.symbol) {
      setActiveSector(null)
      setSymbolFilter('')
    } else {
      setActiveSector(sector.symbol)
      setSymbolFilter(sector.symbol)
    }
  }

  const C = {
    bg:     isDark ? '#0d1117' : '#f6f8fa',
    card:   isDark ? '#161b22' : '#ffffff',
    border: isDark ? '#30363d' : '#d0d7de',
    text:   isDark ? '#e6edf3' : '#1c2128',
    muted:  isDark ? '#8b949e' : '#57606a',
    accent: '#3b6ff5',
  }

  const toggleSource = (src) => setActiveSources(prev =>
    prev.includes(src) ? (prev.length > 1 ? prev.filter(s => s !== src) : prev) : [...prev, src]
  )

  const { data: news = [], isLoading: newsLoading, refetch } = useQuery({
    queryKey: ['news', activeSources.join(','), symbolFilter],
    queryFn:  () => client.get(`/news?sources=${activeSources.join(',')}&symbol=${symbolFilter.toUpperCase()}`),
    staleTime: 120000,
    refetchInterval: 300000,
  })

  const { data: calendar = [], isLoading: calLoading } = useQuery({
    queryKey: ['eco-calendar'],
    queryFn:  () => client.get('/news/calendar'),
    staleTime: 3600000,
  })

  // Group calendar by date
  const calByDay = calendar.reduce((acc, ev) => {
    const day = ev.date?.split('T')[0] || ev.date || 'Unknown'
    if (!acc[day]) acc[day] = []
    acc[day].push(ev)
    return acc
  }, {})

  const xSymbol = symbolFilter.trim().toUpperCase() || 'SPY'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.bg }}>
      <TopBar />

      <main style={{ maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: C.text, fontFamily: 'Inter, sans-serif', margin: 0 }}>
            {isHe ? '📰 חדשות שוק' : '📰 Market News'}
          </h1>
          <button
            onClick={() => refetch()}
            style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: `1px solid ${C.border}`, background: C.card, color: C.accent, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
          >
            {isHe ? '⟳ רענן' : '⟳ Refresh'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '20px', alignItems: 'start' }}
          className="news-grid">

          {/* ── Left: News Feed ──────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Source filters + symbol input */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Row 1: sources */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                {Object.entries(SOURCE_META).map(([src, meta]) => (
                  <button
                    key={src}
                    onClick={() => toggleSource(src)}
                    style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      fontFamily: 'Inter, sans-serif', cursor: 'pointer', border: 'none',
                      background: activeSources.includes(src) ? meta.color : 'transparent',
                      color:      activeSources.includes(src) ? '#fff' : C.muted,
                      outline:    activeSources.includes(src) ? `2px solid ${meta.color}` : `1px solid ${C.border}`,
                    }}
                  >
                    {meta.label}
                  </button>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', color: C.muted, fontFamily: 'Inter, sans-serif' }}>{isHe ? 'מניה:' : 'Symbol:'}</span>
                  <input
                    value={symbolFilter}
                    onChange={e => { setSymbolFilter(e.target.value.toUpperCase()); setActiveSector(null) }}
                    placeholder="AAPL"
                    style={{ width: '70px', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontFamily: 'Inter, sans-serif', background: C.bg, color: C.text, border: `1px solid ${C.border}`, outline: 'none' }}
                  />
                </div>
              </div>

              {/* Row 2: sector quick-filters */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'Inter, sans-serif', marginInlineEnd: '4px' }}>
                  {isHe ? 'סקטור:' : 'Sector:'}
                </span>
                {SECTOR_FILTERS.map(s => {
                  const active = activeSector === s.symbol
                  return (
                    <button
                      key={s.symbol}
                      onClick={() => handleSectorClick(s)}
                      style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                        fontFamily: 'Inter, sans-serif', cursor: 'pointer', border: 'none',
                        background: active ? s.color : 'transparent',
                        color:      active ? '#fff'  : C.muted,
                        outline:    active ? `2px solid ${s.color}` : `1px solid ${C.border}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      {isHe ? s.labelHe : s.labelEn}
                    </button>
                  )
                })}
                {activeSector && (
                  <button
                    onClick={() => { setActiveSector(null); setSymbolFilter('') }}
                    style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer', border: 'none', background: 'transparent', color: C.muted, outline: `1px solid ${C.border}` }}
                  >
                    ✕ {isHe ? 'נקה' : 'Clear'}
                  </button>
                )}
              </div>
            </div>

            {/* X/Twitter card */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden' }}>
              <div
                onClick={() => setXOpen(v => !v)}
                style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '16px' }}>𝕏</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif', flex: 1 }}>
                  {isHe ? 'חדשות מ-X (Twitter)' : 'X (Twitter) News'}
                </span>
                <span style={{ fontSize: '12px', color: C.muted }}>{xOpen ? '▲' : '▼'}</span>
              </div>
              {xOpen && (
                <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '12px', color: C.muted, fontFamily: 'Heebo, sans-serif', margin: 0, lineHeight: 1.6 }}>
                    {isHe
                      ? 'גישה לנתוני X בזמן אמת דורשת מנוי API בתשלום. ניתן לחפש ישירות בפלטפורמה:'
                      : 'Real-time X API access requires a paid subscription. Search directly on the platform:'}
                  </p>
                  <a
                    href={`https://x.com/search?q=%24${xSymbol}+finance&src=typed_query&f=live`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, fontFamily: 'Inter, sans-serif', background: '#000', color: '#fff', textDecoration: 'none', width: 'fit-content' }}
                  >
                    𝕏 {isHe ? `חפש $${xSymbol} ב-X` : `Search $${xSymbol} on X`}
                  </a>
                  <a
                    href="https://x.com/i/lists/1493282789124251648"
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif', background: C.bg, color: C.accent, textDecoration: 'none', width: 'fit-content', border: `1px solid ${C.border}` }}
                  >
                    {isHe ? '📋 Finance Twitter List' : '📋 Finance Twitter List'}
                  </a>
                </div>
              )}
            </div>

            {/* News articles */}
            {newsLoading
              ? Array.from({ length: 5 }, (_, i) => <SkeletonCard key={i} C={C} />)
              : news.length === 0
                ? (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '32px', textAlign: 'center', color: C.muted, fontFamily: 'Heebo, sans-serif' }}>
                    {isHe ? 'לא נמצאו חדשות' : 'No news found'}
                  </div>
                )
                : news.map((item, i) => {
                  const src = SOURCE_META[item.source] || { label: item.source, color: '#6B7280' }
                  return (
                    <a
                      key={i}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px', textDecoration: 'none', transition: 'border-color 0.15s' }}
                      onMouseOver={e => e.currentTarget.style.borderColor = C.accent}
                      onMouseOut={e  => e.currentTarget.style.borderColor = C.border}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: src.color + '22', color: src.color, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                          {src.label}
                        </span>
                        <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'Inter, sans-serif', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                          {timeAgo(item.pubDate, isHe)}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p style={{ margin: 0, fontSize: '12px', color: C.muted, fontFamily: isHe ? 'Heebo, sans-serif' : 'Inter, sans-serif', lineHeight: 1.5 }}>
                          {item.description.slice(0, 140)}{item.description.length > 140 ? '…' : ''}
                        </p>
                      )}
                    </a>
                  )
                })
            }
          </div>

          {/* ── Right: Economic Calendar ─────────────────────────────────────── */}
          <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: 'Inter, sans-serif' }}>
              {isHe ? '📅 לוח אירועים כלכליים' : '📅 Economic Calendar'}
            </h2>

            {calLoading
              ? Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} C={C} />)
              : Object.keys(calByDay).length === 0
                ? (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '20px', textAlign: 'center', color: C.muted, fontSize: '13px', fontFamily: 'Heebo, sans-serif' }}>
                    {isHe ? 'אין אירועים השבוע' : 'No events this week'}
                  </div>
                )
                : Object.entries(calByDay).map(([day, events]) => {
                  const d = new Date(day)
                  const dayLabel = isHe
                    ? d.toLocaleDateString('he-IL', { weekday: 'short', month: 'short', day: 'numeric' })
                    : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                  return (
                    <div key={day} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ padding: '8px 12px', background: isDark ? '#21262d' : '#eaeef2', fontSize: '11px', fontWeight: 700, color: C.muted, fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {dayLabel}
                      </div>
                      {events.map((ev, i) => (
                        <div key={i} style={{ padding: '10px 12px', borderTop: i === 0 ? 'none' : `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ImpactBadge impact={ev.impact} />
                            {ev.time && <span style={{ fontSize: '10px', color: C.muted, fontFamily: 'Inter, sans-serif' }}>{ev.time}</span>}
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif' }}>
                            {ev.title}
                          </span>
                          {(ev.forecast || ev.previous || ev.actual) && (
                            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontFamily: 'Inter, sans-serif' }}>
                              {ev.actual   && <span style={{ color: '#26a65b' }}>{isHe ? 'בפועל: ' : 'Actual: '}<b>{ev.actual}</b></span>}
                              {ev.forecast && <span style={{ color: C.accent  }}>{isHe ? 'תחזית: ' : 'Forecast: '}<b>{ev.forecast}</b></span>}
                              {ev.previous && <span style={{ color: C.muted   }}>{isHe ? 'קודם: '  : 'Prev: '}<b>{ev.previous}</b></span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })
            }
          </div>

        </div>
      </main>
      <style>{`
        @media (min-width: 1024px) { .news-grid { grid-template-columns: 1fr 340px !important; } }
      `}</style>
    </div>
  )
}
