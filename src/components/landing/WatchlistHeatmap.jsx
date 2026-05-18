import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactApexChart from 'react-apexcharts'
import { useQuery } from '@tanstack/react-query'
import client from '../../api/client'

const POSITIONS_KEY = 'alphora_portfolio_v2'
const WATCHLIST_KEY = 'alphora_watchlist_v1'

function loadSymbols() {
  const symbols = new Set()
  try {
    const wl = JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || []
    wl.forEach(w => w.symbol && symbols.add(w.symbol))
  } catch {}
  try {
    const pf = JSON.parse(localStorage.getItem(POSITIONS_KEY)) || { positions: [] }
    pf.positions.filter(p => p.sellPrice == null).forEach(p => p.symbol && symbols.add(p.symbol))
  } catch {}
  return [...symbols]
}

// Map a % change to green→red color gradient
function pctColor(pct) {
  if (pct >= 3)   return '#15803d'
  if (pct >= 1.5) return '#22c55e'
  if (pct >= 0.3) return '#86efac'
  if (pct >= -0.3) return '#64748b'
  if (pct >= -1.5) return '#f87171'
  if (pct >= -3)   return '#ef4444'
  return '#b91c1c'
}

export default function WatchlistHeatmap({ isDark, isHe }) {
  const navigate = useNavigate()
  const symbols  = useMemo(() => loadSymbols(), [])

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['heatmap-quotes', symbols.join(',')],
    queryFn:  () => symbols.length ? client.get(`/quotes?symbols=${symbols.join(',')}`) : [],
    staleTime: 30000,
    refetchInterval: 60000,
    enabled:   symbols.length > 0,
  })

  if (!symbols.length) return null

  const C = {
    card:   isDark ? '#161b22' : '#ffffff',
    border: isDark ? '#30363d' : '#d0d7de',
    text:   isDark ? '#e6edf3' : '#1c2128',
    muted:  isDark ? '#8b949e' : '#57606a',
  }

  if (isLoading) {
    return (
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'12px', padding:'20px 24px' }}>
        <div style={{ fontSize:'13px', color:C.muted, fontFamily:'Inter,sans-serif', textAlign:'center' }}>
          {isHe ? '🔥 טוען רשימת מעקב...' : '🔥 Loading watchlist...'}
        </div>
      </div>
    )
  }

  if (!quotes.length) return null

  // Build treemap data
  const data = quotes.map(q => ({
    x: q.symbol,
    y: 1,   // equal size boxes
    pct: q.regularMarketChangePercent ?? 0,
    price: q.regularMarketPrice ?? 0,
    change: q.regularMarketChange ?? 0,
  }))

  const series = [{
    data: data.map(d => ({
      x: d.x,
      y: d.y,
      fillColor: pctColor(d.pct),
    }))
  }]

  const options = {
    chart: {
      type: 'treemap',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false },
      events: {
        dataPointSelection: (_ev, _ctx, cfg) => {
          const sym = data[cfg.dataPointIndex]?.x
          if (sym) navigate(`/stock/${sym}`)
        },
      },
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    dataLabels: {
      enabled: true,
      style: { fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: '700', colors: ['#fff'] },
      formatter: (_val, opts) => {
        const d = data[opts.dataPointIndex]
        const sign = d.pct >= 0 ? '+' : ''
        return [d.x, `${sign}${d.pct.toFixed(2)}%`]
      },
    },
    plotOptions: { treemap: { distributed: true, enableShades: false } },
    legend: { show: false },
    tooltip: {
      custom: ({ dataPointIndex }) => {
        const d = data[dataPointIndex]
        const sign = d.pct >= 0 ? '+' : ''
        const bg   = isDark ? '#161b22' : '#fff'
        const tx   = isDark ? '#e6edf3' : '#1c2128'
        return `<div style="padding:8px 12px;font-family:Inter,sans-serif;background:${bg};color:${tx};border-radius:6px;font-size:12px;line-height:1.6">
          <b style="font-size:14px">${d.x}</b><br/>
          $${d.price.toFixed(2)}<br/>
          <span style="color:${pctColor(d.pct)};font-weight:700">${sign}${d.pct.toFixed(2)}%</span>
        </div>`
      },
    },
  }

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'12px', padding:'16px 20px', width:'100%', maxWidth:'640px' }}>
      <div style={{ fontSize:'12px', fontWeight:700, color:C.muted, fontFamily:'Inter,sans-serif', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>
        🔥 {isHe ? 'רשימת המעקב שלי' : 'My Watchlist'}
      </div>
      <ReactApexChart type="treemap" series={series} options={options} height={Math.min(60 + symbols.length * 28, 240)} />
      <p style={{ margin:'8px 0 0', fontSize:'10px', color:C.muted, fontFamily:'Inter,sans-serif', textAlign:'center' }}>
        {isHe ? 'לחץ על מניה לפתיחת הגרף' : 'Click a tile to open the chart'}
      </p>
    </div>
  )
}
