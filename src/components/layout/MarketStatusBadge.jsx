import { useMarketStatus } from '../../hooks/useMarketStatus'
import { useApp } from '../../contexts/AppContext'

const CONFIG = {
  open:       { color: '#22c55e', bg: '#22c55e18', border: '#22c55e44', pulse: true  },
  premarket:  { color: '#f59e0b', bg: '#f59e0b18', border: '#f59e0b44', pulse: false },
  afterhours: { color: '#f59e0b', bg: '#f59e0b18', border: '#f59e0b44', pulse: false },
  closed:     { color: '#ef4444', bg: '#ef444418', border: '#ef444444', pulse: false },
}

const LABELS = {
  open:       { he: 'שוק פתוח',   en: 'Market Open'   },
  premarket:  { he: 'פרה-מרקט',   en: 'Pre-Market'    },
  afterhours: { he: 'אחרי-שוק',   en: 'After-Hours'   },
  closed:     { he: 'שוק סגור',   en: 'Market Closed' },
}

export default function MarketStatusBadge() {
  const status = useMarketStatus()
  const { lang } = useApp()
  const isHe = lang === 'he'
  const cfg   = CONFIG[status]
  const label = LABELS[status][isHe ? 'he' : 'en']

  return (
    <div
      title={isHe
        ? 'בורסה אמריקאית (NYSE/NASDAQ) · שעון מזרחי'
        : 'US Market (NYSE/NASDAQ) · Eastern Time'}
      style={{
        display:       'flex',
        alignItems:    'center',
        gap:           '6px',
        padding:       '3px 10px 3px 7px',
        borderRadius:  '20px',
        border:        `1px solid ${cfg.border}`,
        background:    cfg.bg,
        cursor:        'default',
        userSelect:    'none',
        whiteSpace:    'nowrap',
      }}
    >
      {/* Dot */}
      <span style={{ position: 'relative', display: 'inline-flex', width: '8px', height: '8px' }}>
        {cfg.pulse && (
          <span style={{
            position:  'absolute',
            inset:     0,
            borderRadius: '50%',
            background: cfg.color,
            opacity:   0.6,
            animation: 'mkt-ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
          }} />
        )}
        <span style={{
          position:     'relative',
          display:      'inline-block',
          width:        '8px',
          height:       '8px',
          borderRadius: '50%',
          background:   cfg.color,
        }} />
      </span>

      {/* Label */}
      <span style={{
        fontSize:   '11px',
        fontWeight: 700,
        fontFamily: 'Inter, sans-serif',
        color:      cfg.color,
        letterSpacing: '0.02em',
      }}>
        {label}
      </span>

      <style>{`
        @keyframes mkt-ping {
          0%   { transform: scale(1);   opacity: 0.6; }
          70%  { transform: scale(2.2); opacity: 0;   }
          100% { transform: scale(2.2); opacity: 0;   }
        }
      `}</style>
    </div>
  )
}
