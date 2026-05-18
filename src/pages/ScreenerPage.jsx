import { useState } from 'react'
import { useQuery }  from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import TopBar   from '../components/layout/TopBar'
import { useApp } from '../contexts/AppContext'
import client   from '../api/client'

// ── Colour palette ────────────────────────────────────────────────────────────
function mkC(isDark) {
  return {
    bg:       isDark ? '#0d1117' : '#f0f2f5',
    card:     isDark ? '#161b22' : '#ffffff',
    border:   isDark ? '#30363d' : '#d0d7de',
    text:     isDark ? '#8b949e' : '#57606a',
    textMain: isDark ? '#e6edf3' : '#1c2128',
    rowHover: isDark ? '#1c2128' : '#f6f8fa',
    up:   '#26a65b',
    down: '#e53935',
  }
}

// ── Screener presets ──────────────────────────────────────────────────────────
const PRESETS = [
  { group: 'movers',   id: 'day_gainers',             he: '📈 עולים',    en: '📈 Gainers'    },
  { group: 'movers',   id: 'day_losers',              he: '📉 יורדים',   en: '📉 Losers'     },
  { group: 'movers',   id: 'most_actives',            he: '🔥 פעילים',   en: '🔥 Most Active' },
  { group: 'sector',   id: 'ms_technology',           he: '💻 טכנולוגיה', en: '💻 Technology'  },
  { group: 'sector',   id: 'ms_healthcare',           he: '🏥 בריאות',   en: '🏥 Healthcare'  },
  { group: 'sector',   id: 'ms_financial_services',   he: '🏦 פיננסים',  en: '🏦 Financials'  },
  { group: 'sector',   id: 'ms_energy',               he: '⛽ אנרגיה',   en: '⛽ Energy'      },
  { group: 'sector',   id: 'ms_consumer_cyclical',    he: '🛍 צריכה',    en: '🛍 Consumer'    },
  { group: 'sector',   id: 'ms_industrials',          he: '🏭 תעשייה',   en: '🏭 Industrials' },
  { group: 'sector',   id: 'ms_real_estate',          he: '🏠 נדל"ן',    en: '🏠 Real Estate' },
  { group: 'strategy', id: 'growth_technology_stocks',he: '🚀 צמיחה טכ', en: '🚀 Tech Growth' },
  { group: 'strategy', id: 'undervalued_large_caps',  he: '💎 מוערך נמוך', en: '💎 Undervalued' },
  { group: 'strategy', id: 'aggressive_small_caps',   he: '🎯 Small Cap', en: '🎯 Small Cap'   },
]

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtMCap(v) {
  if (!v) return '—'
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T'
  if (v >= 1e9)  return '$' + (v / 1e9).toFixed(2)  + 'B'
  if (v >= 1e6)  return '$' + (v / 1e6).toFixed(2)  + 'M'
  return '$' + v.toLocaleString()
}

function fmtVol(v) {
  if (!v) return '—'
  if (v >= 1e9)  return (v / 1e9).toFixed(2)  + 'B'
  if (v >= 1e6)  return (v / 1e6).toFixed(2)  + 'M'
  if (v >= 1e3)  return (v / 1e3).toFixed(0)  + 'K'
  return v.toLocaleString()
}

// ── Sort indicator ────────────────────────────────────────────────────────────
function SortIcon({ dir }) {
  if (!dir) return <span style={{ opacity: 0.3 }}>⇅</span>
  return <span>{dir === 'asc' ? '↑' : '↓'}</span>
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ScreenerPage() {
  const { theme, lang } = useApp()
  const isDark = theme === 'dark'
  const isHe   = lang  === 'he'
  const C      = mkC(isDark)
  const nav    = useNavigate()

  const [activePreset, setActivePreset] = useState('day_gainers')
  const [sortKey,      setSortKey]      = useState('changePct')
  const [sortDir,      setSortDir]      = useState('desc')

  const { data, isLoading, isError, error } = useQuery({
    queryKey:   ['screener', activePreset],
    queryFn:    () => client.get(`/screener?type=${activePreset}&count=25`),
    staleTime:  5 * 60 * 1000,
    retry:      1,
  })

  // ── Sort logic ──────────────────────────────────────────────────────────────
  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const rows = [...(data || [])].sort((a, b) => {
    const av = a[sortKey] ?? -Infinity
    const bv = b[sortKey] ?? -Infinity
    return sortDir === 'asc' ? av - bv : bv - av
  })

  // ── Columns definition ──────────────────────────────────────────────────────
  const COLS = [
    { key: 'symbol',    heLabel: 'סימבול',   enLabel: 'Symbol',    align: 'left',  sortable: false },
    { key: 'name',      heLabel: 'שם',        enLabel: 'Name',      align: 'left',  sortable: false },
    { key: 'price',     heLabel: 'מחיר',      enLabel: 'Price',     align: 'right', sortable: true  },
    { key: 'changePct', heLabel: '% שינוי',   enLabel: 'Change %',  align: 'right', sortable: true  },
    { key: 'change',    heLabel: 'שינוי $',   enLabel: 'Change $',  align: 'right', sortable: true  },
    { key: 'high',      heLabel: 'גבוה',      enLabel: 'High',      align: 'right', sortable: true  },
    { key: 'low',       heLabel: 'נמוך',      enLabel: 'Low',       align: 'right', sortable: true  },
    { key: 'volume',    heLabel: 'ווליום',    enLabel: 'Volume',    align: 'right', sortable: true  },
    { key: 'marketCap', heLabel: 'שווי שוק',  enLabel: 'Mkt Cap',   align: 'right', sortable: true  },
  ]

  const presetLabel = PRESETS.find(p => p.id === activePreset)

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <TopBar />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px' }}>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textMain, fontFamily: 'Inter, sans-serif', margin: 0 }}>
            {isHe ? '🔍 סנן מניות' : '🔍 Stock Screener'}
          </h1>
          <p style={{ fontSize: 13, color: C.text, fontFamily: isHe ? 'Heebo, sans-serif' : 'Inter, sans-serif', marginTop: 4 }}>
            {isHe ? 'חפש מניות לפי מסננים מוכנים — עולים, יורדים, סקטורים ואסטרטגיות' : 'Browse stocks by pre-built filters — movers, sectors, and strategies'}
          </p>
        </div>

        {/* ── Preset buttons ───────────────────────────────────────────────── */}
        {['movers', 'sector', 'strategy'].map(group => {
          const groupPresets = PRESETS.filter(p => p.group === group)
          const groupLabel = {
            movers:   isHe ? 'תנועות שוק' : 'Market Movers',
            sector:   isHe ? 'סקטורים'     : 'Sectors',
            strategy: isHe ? 'אסטרטגיות'  : 'Strategies',
          }[group]

          return (
            <div key={group} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {groupLabel}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {groupPresets.map(p => {
                  const isActive = activePreset === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setActivePreset(p.id); setSortKey('changePct'); setSortDir('desc') }}
                      style={{
                        padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, fontFamily: isHe ? 'Heebo, sans-serif' : 'Inter, sans-serif',
                        border:     `1px solid ${isActive ? '#3b6ff5' : C.border}`,
                        background: isActive ? '#3b6ff522' : C.card,
                        color:      isActive ? '#3b6ff5'   : C.textMain,
                        transition: 'all 0.15s',
                      }}
                    >
                      {isHe ? p.he : p.en}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* ── Results table card ────────────────────────────────────────────── */}
        <div style={{
          marginTop: 20,
          background: C.card,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          overflow: 'hidden',
        }}>

          {/* Table header */}
          <div style={{
            padding: '12px 20px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.textMain, fontFamily: isHe ? 'Heebo, sans-serif' : 'Inter, sans-serif' }}>
              {isHe ? (presetLabel?.he || '') : (presetLabel?.en || '')}
              {rows.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 400, color: C.text, marginInlineStart: 8 }}>
                  ({rows.length} {isHe ? 'תוצאות' : 'results'})
                </span>
              )}
            </span>
            {isLoading && (
              <span style={{ fontSize: 12, color: C.text, fontFamily: 'Inter, sans-serif' }}>
                {isHe ? 'טוען...' : 'Loading...'}
              </span>
            )}
          </div>

          {/* Error state */}
          {isError && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: C.down, fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
              {isHe ? 'שגיאה בטעינת נתונים. נסה שוב.' : 'Failed to load screener data. Please try again.'}<br />
              <span style={{ color: C.text, fontSize: 11 }}>{error?.message}</span>
            </div>
          )}

          {/* Empty state (after load, 0 results) */}
          {!isLoading && !isError && rows.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: C.text, fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
              {isHe ? 'לא נמצאו תוצאות' : 'No results found'}
            </div>
          )}

          {/* Table */}
          {rows.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
                <thead>
                  <tr style={{ background: isDark ? '#0d1117' : '#f6f8fa' }}>
                    {COLS.map(col => (
                      <th
                        key={col.key}
                        onClick={() => col.sortable && handleSort(col.key)}
                        style={{
                          padding: '9px 16px',
                          textAlign: col.align,
                          color: sortKey === col.key ? '#3b6ff5' : C.text,
                          fontWeight: 600, fontSize: 11,
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                          borderBottom: `1px solid ${C.border}`,
                          cursor: col.sortable ? 'pointer' : 'default',
                          whiteSpace: 'nowrap',
                          userSelect: 'none',
                        }}
                      >
                        {isHe ? col.heLabel : col.enLabel}
                        {col.sortable && (
                          <span style={{ marginInlineStart: 4 }}>
                            <SortIcon dir={sortKey === col.key ? sortDir : null} />
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const up = (row.changePct ?? 0) >= 0
                    return (
                      <tr
                        key={row.symbol + i}
                        onClick={() => nav(`/stock/${row.symbol}`)}
                        style={{
                          cursor: 'pointer',
                          borderBottom: `1px solid ${C.border}`,
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e  => e.currentTarget.style.background = C.rowHover}
                        onMouseLeave={e  => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Symbol */}
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#3b6ff5' }}>
                          {row.symbol}
                        </td>

                        {/* Name */}
                        <td style={{ padding: '10px 16px', color: C.textMain, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.name}
                        </td>

                        {/* Price */}
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: C.textMain, fontWeight: 600 }}>
                          {row.price != null ? `$${row.price.toFixed(2)}` : '—'}
                        </td>

                        {/* Change % */}
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          {row.changePct != null ? (
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px', borderRadius: 12,
                              background: up ? '#26a65b22' : '#e5393522',
                              color: up ? C.up : C.down,
                              fontWeight: 700,
                            }}>
                              {up ? '+' : ''}{row.changePct.toFixed(2)}%
                            </span>
                          ) : '—'}
                        </td>

                        {/* Change $ */}
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: up ? C.up : C.down, fontWeight: 600 }}>
                          {row.change != null ? (up ? '+' : '') + row.change.toFixed(2) : '—'}
                        </td>

                        {/* High */}
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: C.up }}>
                          {row.high != null ? `$${row.high.toFixed(2)}` : '—'}
                        </td>

                        {/* Low */}
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: C.down }}>
                          {row.low != null ? `$${row.low.toFixed(2)}` : '—'}
                        </td>

                        {/* Volume */}
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: C.text }}>
                          {fmtVol(row.volume)}
                        </td>

                        {/* Market Cap */}
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: C.textMain }}>
                          {fmtMCap(row.marketCap)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
