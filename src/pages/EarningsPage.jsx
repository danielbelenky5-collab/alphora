import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import TopBar from '../components/layout/TopBar'
import { useApp } from '../contexts/AppContext'

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayET() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

// Mon–Fri for the week containing dateStr
function getWeekStart(dateStr) {
  const d   = new Date(dateStr + 'T12:00:00Z')
  const dow = d.getUTCDay()
  const off = dow === 0 ? -6 : 1 - dow
  const m   = new Date(d)
  m.setUTCDate(d.getUTCDate() + off)
  return m.toISOString().slice(0, 10)
}

// Step +1 or -1 business day (skip weekends)
function addBusinessDay(dateStr, step) {
  const d = new Date(dateStr + 'T12:00:00Z')
  do {
    d.setUTCDate(d.getUTCDate() + step)
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6)
  return d.toISOString().slice(0, 10)
}

// Format date header
function fmtDayHeader(dateStr, lang) {
  const today    = todayET()
  const tomorrow = addBusinessDay(today, 1)
  const d   = new Date(dateStr + 'T12:00:00Z')
  const loc = lang === 'he' ? 'he-IL' : 'en-US'
  const label = d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  if (dateStr === today)    return (lang === 'he' ? 'היום — '  : 'Today — ')    + label
  if (dateStr === tomorrow) return (lang === 'he' ? 'מחר — '   : 'Tomorrow — ') + label
  return label
}

// ── Beat/Miss chip ────────────────────────────────────────────────────────────

function BeatMissCell({ epsDiff, surprisePct, reported }) {
  if (!reported) return (
    <span style={{ color: '#8b949e', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>—</span>
  )
  if (epsDiff === null || epsDiff === undefined) return (
    <span style={{ color: '#8b949e', fontSize: 12, fontFamily: 'Heebo, sans-serif' }}>ממתין</span>
  )
  const beat = epsDiff >= 0
  const sign = beat ? '+' : ''
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif',
      background: beat ? 'rgba(34,197,94,0.15)'  : 'rgba(239,68,68,0.15)',
      color:      beat ? '#4ade80'                : '#f87171',
      border: `1px solid ${beat ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
      whiteSpace: 'nowrap',
    }}>
      {beat ? '✓' : '✗'} {sign}{epsDiff.toFixed(2)}
      {surprisePct != null && (
        <span style={{ opacity: 0.7, marginLeft: 4, fontSize: 11 }}>
          ({sign}{surprisePct.toFixed(1)}%)
        </span>
      )}
    </span>
  )
}

// ── Single row ────────────────────────────────────────────────────────────────

function EarningsRow({ entry, C, isLast, navigate }) {
  const fmtEps = v => (v === null || v === undefined) ? '—' : v.toFixed(2)

  return (
    <tr
      onClick={() => navigate(`/stock/${entry.symbol}`)}
      style={{ cursor: 'pointer', borderBottom: isLast ? 'none' : `1px solid ${C.rowBorder}` }}
      onMouseEnter={e => e.currentTarget.style.background = C.rowHover}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Symbol — right-most in RTL */}
      <td style={{ padding: '10px 14px', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13, color: '#3b82f6', whiteSpace: 'nowrap', textAlign: 'right' }}>
        {entry.symbol}
      </td>
      {/* Company name — LTR content inside RTL table cell */}
      <td style={{ padding: '10px 14px', maxWidth: 220, textAlign: 'right' }}>
        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.text, direction: 'ltr', textAlign: 'left' }}>
          {entry.name}
        </span>
      </td>
      {/* Quarter */}
      <td style={{ padding: '10px 14px', fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, whiteSpace: 'nowrap', textAlign: 'center' }}>
        {entry.quarter || '—'}
      </td>
      {/* Estimate */}
      <td style={{ padding: '10px 14px', fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.muted, textAlign: 'center', whiteSpace: 'nowrap' }}>
        {fmtEps(entry.epsEstimate)}
      </td>
      {/* Actual */}
      <td style={{ padding: '10px 14px', fontFamily: 'Inter, sans-serif', fontSize: 13, color: entry.epsActual != null ? C.text : C.muted, textAlign: 'center', fontWeight: entry.epsActual != null ? 600 : 400, whiteSpace: 'nowrap' }}>
        {entry.reported ? fmtEps(entry.epsActual) : '—'}
      </td>
      {/* Beat/Miss — left-most in RTL */}
      <td style={{ padding: '10px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>
        <BeatMissCell epsDiff={entry.epsDiff} surprisePct={entry.surprisePct} reported={entry.reported} />
      </td>
    </tr>
  )
}

// ── Timing group (BMO / AMC / TNS) ───────────────────────────────────────────

function TimingGroup({ entries, label, icon, isHe, C, navigate }) {
  if (!entries || entries.length === 0) return null
  return (
    <div>
      {/* Sub-header — RTL */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 14px',
        background: C.timingBg,
        borderBottom: `1px solid ${C.border}`,
        borderTop: `1px solid ${C.border}`,
        direction: 'rtl',
      }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, fontFamily: 'Heebo, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        <span style={{ marginRight: 'auto', fontSize: 11, color: C.muted, fontFamily: 'Inter, sans-serif' }}>
          {entries.length} {isHe ? (entries.length === 1 ? 'חברה' : 'חברות') : (entries.length === 1 ? 'company' : 'companies')}
        </span>
      </div>

      {/* Table — RTL: Symbol on right, Beat/Miss on left */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {[
                { label: isHe ? 'סימול'       : 'Symbol',    align: 'right'  },
                { label: isHe ? 'חברה'        : 'Company',   align: 'right'  },
                { label: isHe ? 'רבעון'       : 'Quarter',   align: 'center' },
                { label: isHe ? 'תחזית EPS'   : 'Est. EPS',  align: 'center' },
                { label: isHe ? 'בפועל EPS'   : 'Actual',    align: 'center' },
                { label: isHe ? 'פגע / פספסה' : 'Beat/Miss', align: 'left'   },
              ].map((col, i) => (
                <th key={i} style={{
                  padding: '7px 14px',
                  fontSize: 11, fontWeight: 600,
                  color: C.muted,
                  fontFamily: 'Heebo, sans-serif',
                  textAlign: col.align,
                  background: C.header,
                  whiteSpace: 'nowrap',
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <EarningsRow
                key={entry.symbol}
                entry={entry}
                C={C}
                isLast={i === entries.length - 1}
                navigate={navigate}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EarningsPage() {
  const { lang, theme } = useApp()
  const navigate = useNavigate()
  const isHe   = lang === 'he'
  const isDark = theme === 'dark'

  // Navigate day by day — start on nearest business day (never a weekend)
  const [currentDay, setCurrentDay] = useState(() => {
    const t   = todayET()
    const dow = new Date(t + 'T12:00:00Z').getUTCDay()
    if (dow === 0) return addBusinessDay(t, -2) // Sun → Fri
    if (dow === 6) return addBusinessDay(t, -1) // Sat → Fri
    return t
  })
  const weekStart = getWeekStart(currentDay)
  const today     = todayET()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey:  ['earnings-reports', weekStart],
    queryFn:   () => axios.get(`/api/earnings-reports?week=${weekStart}`).then(r => r.data),
    staleTime: 30 * 60 * 1000,
    retry: 2,
  })

  // Extract just today's data from the weekly result
  const dayData = data?.days?.find(d => d.date === currentDay) ?? null
  const total   = dayData ? dayData.BMO.length + dayData.AMC.length + dayData.TNS.length : 0

  const C = {
    card:       isDark ? '#0d1117'        : '#f6f8fa',
    border:     isDark ? '#30363d'        : '#d0d7de',
    header:     isDark ? '#161b22'        : '#f0f2f5',
    timingBg:   isDark ? '#0d1117cc'      : '#f8f9facc',
    text:       isDark ? '#e6edf3'        : '#1c2128',
    muted:      isDark ? '#8b949e'        : '#57606a',
    rowBorder:  isDark ? '#21262d'        : '#eaeef2',
    rowHover:   isDark ? '#161b2260'      : '#f6f8fa80',
    todayBorder: '#2d5eb5',
  }

  const isToday       = currentDay === today
  const cardBorderColor = isToday ? C.todayBorder : C.border
  const cardBg          = isToday ? (isDark ? '#0e1726' : '#edf2ff') : C.card

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />

      <main className="flex-1 max-w-screen-xl w-full mx-auto px-6 py-5 flex flex-col gap-5">

        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-tx-primary font-heebo">
              {isHe ? 'דיווחים' : 'Earnings Reports'}
            </h1>
            <p className="text-sm text-tx-muted font-heebo mt-0.5">
              {isHe ? 'תוצאות רבעוניות — תחזית מול דיווח בפועל' : 'Quarterly results — estimate vs actual'}
            </p>
          </div>

          {/* Day navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setCurrentDay(d => addBusinessDay(d, -1))} style={navBtnStyle(C)}>‹</button>

            <span style={{ fontSize: 13, color: C.text, fontFamily: isHe ? 'Heebo, sans-serif' : 'Inter, sans-serif', minWidth: 200, textAlign: 'center' }}>
              {fmtDayHeader(currentDay, lang)}
            </span>

            <button onClick={() => setCurrentDay(d => addBusinessDay(d, 1))} style={navBtnStyle(C)}>›</button>

            {!isToday && (
              <button onClick={() => setCurrentDay(today)} style={{ ...navBtnStyle(C), color: '#3b82f6', fontSize: 12, fontFamily: 'Heebo, sans-serif' }}>
                {isHe ? 'היום' : 'Today'}
              </button>
            )}

            <button onClick={() => refetch()} title={isHe ? 'רענן' : 'Refresh'} style={navBtnStyle(C)}>↻</button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span style={{ fontSize: 14, color: C.muted, fontFamily: 'Heebo, sans-serif' }}>
              {isHe ? 'טוען דיווחים...' : 'Loading reports...'}
            </span>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div style={{ background: isDark ? '#1c0a0a' : '#fff5f5', border: `1px solid ${isDark ? '#7f1d1d' : '#fca5a5'}`, borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#fca5a5' : '#991b1b', fontFamily: 'Heebo, sans-serif', margin: 0 }}>
                {isHe ? 'לא ניתן לטעון את הדיווחים' : 'Could not load earnings reports'}
              </p>
              <p style={{ fontSize: 12, color: C.muted, fontFamily: 'Heebo, sans-serif', margin: '3px 0 0' }}>
                {isHe ? 'בדוק את חיבור האינטרנט ונסה שוב' : 'Check your connection and try again'}
              </p>
            </div>
            <button onClick={() => refetch()} style={{ marginLeft: 'auto', background: isDark ? '#7f1d1d33' : '#fee2e2', border: `1px solid ${isDark ? '#991b1b' : '#fca5a5'}`, borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontSize: 12, color: isDark ? '#fca5a5' : '#991b1b', fontFamily: 'Heebo, sans-serif', fontWeight: 600 }}>
              {isHe ? 'נסה שוב' : 'Retry'}
            </button>
          </div>
        )}

        {/* No data for this day */}
        {!isLoading && !isError && data && !dayData && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 40, textAlign: 'center' }}>
            <span style={{ fontSize: 40, display: 'block', marginBottom: 14 }}>📭</span>
            <p style={{ fontSize: 14, color: C.muted, fontFamily: 'Heebo, sans-serif', margin: 0 }}>
              {isHe ? 'אין דיווחי תוצאות ליום זה' : 'No earnings reports for this day'}
            </p>
          </div>
        )}

        {/* Day card */}
        {dayData && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorderColor}`, borderRadius: 10, overflow: 'hidden' }}>

            {/* Day header */}
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${cardBorderColor}`, background: isToday ? (isDark ? '#0e172699' : '#dbeafe55') : C.header, display: 'flex', alignItems: 'center', gap: 10 }}>
              {isToday && (
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Inter, sans-serif', background: '#3b6ff5', color: '#fff', borderRadius: 4, padding: '1px 7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isHe ? 'היום' : 'TODAY'}
                </span>
              )}
              <span style={{ fontSize: 14, fontWeight: 700, color: isToday ? '#3b82f6' : C.text, fontFamily: 'Heebo, sans-serif' }}>
                {fmtDayHeader(currentDay, lang)}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: C.muted, fontFamily: 'Inter, sans-serif' }}>
                {total} {isHe ? (total === 1 ? 'דיווח' : 'דיווחים') : (total === 1 ? 'report' : 'reports')}
              </span>
            </div>

            <TimingGroup entries={dayData.BMO} label={isHe ? 'לפני פתיחת מסחר (BMO)' : 'Before Market Open (BMO)'} icon="🌅" isHe={isHe} C={C} navigate={navigate} />
            <TimingGroup entries={dayData.AMC} label={isHe ? 'לאחר סגירת מסחר (AMC)' : 'After Market Close (AMC)'} icon="🌙" isHe={isHe} C={C} navigate={navigate} />
            <TimingGroup entries={dayData.TNS} label={isHe ? 'זמן לא ידוע'            : 'Time Not Supplied'}        icon="🕐" isHe={isHe} C={C} navigate={navigate} />
          </div>
        )}

        {/* Legend */}
        {dayData && total > 0 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '4px 2px' }}>
            {[
              { color: '#4ade80', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.25)',  label: isHe ? '✓ פגע בתחזית' : '✓ Beat' },
              { color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  label: isHe ? '✗ פספס תחזית' : '✗ Miss' },
            ].map(item => (
              <span key={item.label} style={{ fontSize: 11, fontFamily: 'Heebo, sans-serif', color: item.color, background: item.bg, border: `1px solid ${item.border}`, borderRadius: 20, padding: '2px 10px' }}>
                {item.label}
              </span>
            ))}
            <span style={{ fontSize: 11, color: C.muted, fontFamily: 'Heebo, sans-serif', alignSelf: 'center' }}>
              {isHe ? '* לחץ על שורה לניתוח המניה' : '* Click any row to view the stock'}
            </span>
          </div>
        )}
      </main>
    </div>
  )
}

function navBtnStyle(C) {
  return {
    background: 'none',
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: '5px 10px',
    cursor: 'pointer',
    color: C.muted,
    fontSize: 13,
    fontFamily: 'Inter, sans-serif',
  }
}
