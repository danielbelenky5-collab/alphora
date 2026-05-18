import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useApp } from '../../contexts/AppContext'

const IMPACT_STYLE = {
  high:   { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', border: 'rgba(239,68,68,0.3)'  },
  medium: { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  low:    { bg: 'rgba(100,116,139,0.12)',color: '#94a3b8',  border: 'rgba(100,116,139,0.3)'},
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA') // "YYYY-MM-DD"
}

function formatDateHeader(dateStr, lang) {
  const d = new Date(dateStr + 'T12:00:00')
  const today = todayStr()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA')

  const dayFmt = d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  if (dateStr === today)        return (lang === 'he' ? 'היום — ' : 'Today — ') + dayFmt
  if (dateStr === tomorrowStr)  return (lang === 'he' ? 'מחר — '  : 'Tomorrow — ') + dayFmt
  return dayFmt
}

function formatDateRange(lang) {
  const start = new Date()
  const end   = new Date()
  end.setDate(end.getDate() + 6)
  const opts = { day: 'numeric', month: 'short' }
  const loc  = lang === 'he' ? 'he-IL' : 'en-US'
  return `${start.toLocaleDateString(loc, opts)} – ${end.toLocaleDateString(loc, { ...opts, year: 'numeric' })}`
}

function groupByDate(events) {
  return events.reduce((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = []
    acc[ev.date].push(ev)
    return acc
  }, {})
}

export default function NewsCalendar() {
  const { lang, theme } = useApp()
  const isDark = theme === 'dark'
  const isHe   = lang === 'he'

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['econ-calendar', todayStr()],  // key changes daily → auto-refetches on new day
    queryFn:  () => axios.get('/api/econ-calendar').then(r => r.data),
    staleTime: 60 * 60 * 1000,   // consider fresh for 1 hour
    retry: 2,
  })

  const C = {
    card:    isDark ? '#0d1117'  : '#f6f8fa',
    border:  isDark ? '#30363d'  : '#d0d7de',
    header:  isDark ? '#161b22'  : '#f0f2f5',
    text:    isDark ? '#e6edf3'  : '#1c2128',
    muted:   isDark ? '#8b949e'  : '#57606a',
    today:   isDark ? '#0e1726'  : '#edf2ff',
    todayBorder: isDark ? '#2d5eb5' : '#93c5fd',
  }

  const impactLabel = {
    high:   isHe ? 'גבוה'   : 'High',
    medium: isHe ? 'בינוני' : 'Medium',
    low:    isHe ? 'נמוך'   : 'Low',
  }

  const today = todayStr()

  return (
    <div className="flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-tx-primary font-heebo">
            {isHe ? 'לוח אירועים כלכליים' : 'Economic Calendar'}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: C.muted, fontFamily: 'Inter, sans-serif' }}>
            {formatDateRange(lang)}
          </span>
          <button
            onClick={() => refetch()}
            title={isHe ? 'רענן' : 'Refresh'}
            style={{
              background: 'none', border: `1px solid ${C.border}`, borderRadius: 6,
              padding: '3px 8px', cursor: 'pointer', color: C.muted, fontSize: 12,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            ↻
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span style={{ fontSize: 13, color: C.muted, fontFamily: 'Heebo, sans-serif' }}>
            {isHe ? 'טוען אירועים...' : 'Loading events...'}
          </span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div style={{
          background: isDark ? '#1c0a0a' : '#fff5f5',
          border: `1px solid ${isDark ? '#7f1d1d' : '#fca5a5'}`,
          borderRadius: 10, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#fca5a5' : '#991b1b', fontFamily: 'Heebo, sans-serif', margin: 0 }}>
              {isHe ? 'לא ניתן לטעון את לוח האירועים' : 'Could not load calendar'}
            </p>
            <p style={{ fontSize: 12, color: C.muted, fontFamily: 'Heebo, sans-serif', margin: '3px 0 0' }}>
              {isHe ? 'בדוק את חיבור האינטרנט ונסה שוב' : 'Check your connection and try again'}
            </p>
          </div>
          <button onClick={() => refetch()} style={{
            marginLeft: 'auto', background: isDark ? '#7f1d1d33' : '#fee2e2',
            border: `1px solid ${isDark ? '#991b1b' : '#fca5a5'}`,
            borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
            fontSize: 12, color: isDark ? '#fca5a5' : '#991b1b',
            fontFamily: 'Heebo, sans-serif', fontWeight: 600,
          }}>
            {isHe ? 'נסה שוב' : 'Retry'}
          </button>
        </div>
      )}

      {/* Events */}
      {data && data.length === 0 && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '32px', textAlign: 'center',
        }}>
          <span style={{ fontSize: 36, display: 'block', marginBottom: 12 }}>📭</span>
          <p style={{ fontSize: 14, color: C.muted, fontFamily: 'Heebo, sans-serif', margin: 0 }}>
            {isHe ? 'אין אירועים כלכליים מתוכננים ל-7 הימים הקרובים' : 'No economic events scheduled in the next 7 days'}
          </p>
        </div>
      )}

      {data && data.length > 0 && (() => {
        const grouped = groupByDate(data)
        return Object.entries(grouped).map(([date, events]) => {
          const isToday = date === today
          return (
            <div key={date} style={{
              background: isToday ? C.today : C.card,
              border: `1px solid ${isToday ? C.todayBorder : C.border}`,
              borderRadius: 10, overflow: 'hidden',
            }}>
              {/* Date header */}
              <div style={{
                padding: '8px 14px',
                borderBottom: `1px solid ${isToday ? C.todayBorder : C.border}`,
                background: isToday ? (isDark ? '#0e172699' : '#dbeafe55') : C.header,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {isToday && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                    background: '#3b6ff5', color: '#fff',
                    borderRadius: 4, padding: '1px 6px', textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {isHe ? 'היום' : 'TODAY'}
                  </span>
                )}
                <span style={{ fontSize: 12, fontWeight: 600, color: isToday ? '#3b82f6' : C.muted, fontFamily: 'Heebo, sans-serif' }}>
                  {formatDateHeader(date, lang)}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: C.muted, fontFamily: 'Inter, sans-serif' }}>
                  {events.length} {isHe ? (events.length === 1 ? 'אירוע' : 'אירועים') : (events.length === 1 ? 'event' : 'events')}
                </span>
              </div>

              {/* Event rows */}
              {events.map((ev, i) => {
                const style = IMPACT_STYLE[ev.impact] || IMPACT_STYLE.low
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    borderBottom: i < events.length - 1 ? `1px solid ${C.border}40` : 'none',
                  }}>
                    {/* Time */}
                    <span style={{
                      fontSize: 12, color: C.muted, fontFamily: 'Inter, sans-serif',
                      fontWeight: 600, minWidth: 40, flexShrink: 0, tabularNums: true,
                    }}>
                      {ev.time}
                    </span>

                    {/* Flag */}
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{ev.country}</span>

                    {/* Event name */}
                    <span style={{
                      fontSize: 13, color: C.text, fontFamily: 'Heebo, sans-serif',
                      flex: 1, minWidth: 0,
                    }}>
                      {isHe && ev.eventHe ? ev.eventHe : ev.event}
                    </span>

                    {/* Forecast / Previous */}
                    {(ev.forecast || ev.previous || ev.actual) && (
                      <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                        {ev.actual && (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: C.muted, fontFamily: 'Inter, sans-serif', marginBottom: 1 }}>
                              {isHe ? 'בפועל' : 'Actual'}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', fontFamily: 'Inter, sans-serif' }}>
                              {ev.actual}
                            </div>
                          </div>
                        )}
                        {ev.forecast && (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: C.muted, fontFamily: 'Inter, sans-serif', marginBottom: 1 }}>
                              {isHe ? 'תחזית' : 'Forecast'}
                            </div>
                            <div style={{ fontSize: 12, color: C.text, fontFamily: 'Inter, sans-serif' }}>
                              {ev.forecast}
                            </div>
                          </div>
                        )}
                        {ev.previous && (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: C.muted, fontFamily: 'Inter, sans-serif', marginBottom: 1 }}>
                              {isHe ? 'קודם' : 'Previous'}
                            </div>
                            <div style={{ fontSize: 12, color: C.muted, fontFamily: 'Inter, sans-serif' }}>
                              {ev.previous}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Impact badge */}
                    <span style={{
                      fontSize: 11, fontWeight: 600, fontFamily: 'Heebo, sans-serif',
                      padding: '2px 9px', borderRadius: 20, flexShrink: 0,
                      background: style.bg, color: style.color,
                      border: `1px solid ${style.border}`,
                    }}>
                      {impactLabel[ev.impact]}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })
      })()}
    </div>
  )
}
