import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import client from '../../api/client'
import { useApp } from '../../contexts/AppContext'

// ── Color helpers ──────────────────────────────────────────────────────────────
const mkC = (isDark) => ({
  bg:     isDark ? '#0d1117' : '#ffffff',
  card:   isDark ? '#161b22' : '#f6f8fa',
  border: isDark ? '#30363d' : '#d0d7de',
  text:   isDark ? '#e6edf3' : '#1c2128',
  muted:  isDark ? '#8b949e' : '#57606a',
  up:     '#26a65b',
  down:   '#e53935',
  accent: '#3b6ff5',
})

// ── Reusable mini-list ─────────────────────────────────────────────────────────
function MoverList({ title, emoji, rows, color, C, isHe, isLoading }) {
  return (
    <div style={{
      background:    C.card,
      border:        `1px solid ${C.border}`,
      borderRadius:  '12px',
      padding:       '14px',
      flex:          '1 1 220px',
      minWidth:      '220px',
      display:       'flex',
      flexDirection: 'column',
      gap:           '6px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '6px',
      }}>
        <span style={{
          fontSize: '12px', fontWeight: 800, color,
          fontFamily: 'Inter, sans-serif',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <span style={{ marginRight: 6 }}>{emoji}</span>{title}
        </span>
      </div>

      {isLoading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: C.muted, fontSize: 12 }}>
          {isHe ? 'טוען...' : 'Loading...'}
        </div>
      ) : rows?.length ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map((r) => (
            <Link
              key={r.symbol}
              to={`/stock/${r.symbol}`}
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            '8px',
                padding:        '5px 4px',
                borderRadius:   '5px',
                textDecoration: 'none',
                transition:     'background 0.12s',
              }}
              onMouseOver={e => e.currentTarget.style.background = C.border + '40'}
              onMouseOut={e  => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                fontSize: 12, fontWeight: 700, color: C.text,
                fontFamily: 'Inter, sans-serif',
                minWidth: 60, flexShrink: 0,
              }}>
                {r.symbol}
              </span>
              <span style={{
                fontSize: 11, color: C.muted,
                fontFamily: 'Inter, sans-serif',
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                ${r.price != null ? r.price.toFixed(2) : '—'}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: r.changePct >= 0 ? C.up : C.down,
                fontFamily: 'Inter, sans-serif',
                minWidth: 56, textAlign: 'right',
              }}>
                {r.changePct != null
                  ? `${r.changePct >= 0 ? '+' : ''}${r.changePct.toFixed(2)}%`
                  : '—'}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: C.muted, fontSize: 12 }}>
          {isHe ? 'אין נתונים' : 'No data'}
        </div>
      )}
    </div>
  )
}

// ── Main exported component ────────────────────────────────────────────────────
export default function TopMoversCard() {
  const { theme, lang } = useApp()
  const isDark = theme === 'dark'
  const isHe   = lang  === 'he'
  const C      = mkC(isDark)

  const gainers = useQuery({
    queryKey:  ['movers', 'day_gainers'],
    queryFn:   () => client.get('/screener?type=day_gainers&count=6'),
    staleTime: 60_000,
    retry:     1,
  })
  const losers = useQuery({
    queryKey:  ['movers', 'day_losers'],
    queryFn:   () => client.get('/screener?type=day_losers&count=6'),
    staleTime: 60_000,
    retry:     1,
  })
  const actives = useQuery({
    queryKey:  ['movers', 'most_actives'],
    queryFn:   () => client.get('/screener?type=most_actives&count=6'),
    staleTime: 60_000,
    retry:     1,
  })

  return (
    <div style={{
      width:        '100%',
      maxWidth:     '960px',
      padding:      '0 16px',
    }} dir={isHe ? 'rtl' : 'ltr'}>
      <div style={{
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <span style={{
          fontSize: 13, fontWeight: 800, color: C.muted,
          fontFamily: 'Inter, sans-serif',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {isHe ? '🔥 מובילי השוק היום' : '🔥 Top Movers Today'}
        </span>
        <Link
          to="/screener"
          style={{
            fontSize: 11, fontWeight: 700, color: C.accent,
            fontFamily: 'Inter, sans-serif',
            textDecoration: 'none',
          }}
        >
          {isHe ? 'לסנן המלא ←' : 'Full Screener →'}
        </Link>
      </div>

      <div style={{
        display:  'flex',
        flexWrap: 'wrap',
        gap:      '12px',
      }}>
        <MoverList
          title={isHe ? 'עולים' : 'Gainers'}
          emoji="📈"
          rows={gainers.data}
          color={C.up}
          C={C}
          isHe={isHe}
          isLoading={gainers.isLoading}
        />
        <MoverList
          title={isHe ? 'יורדים' : 'Losers'}
          emoji="📉"
          rows={losers.data}
          color={C.down}
          C={C}
          isHe={isHe}
          isLoading={losers.isLoading}
        />
        <MoverList
          title={isHe ? 'הכי פעילים' : 'Most Active'}
          emoji="⚡"
          rows={actives.data}
          color={C.accent}
          C={C}
          isHe={isHe}
          isLoading={actives.isLoading}
        />
      </div>
    </div>
  )
}
