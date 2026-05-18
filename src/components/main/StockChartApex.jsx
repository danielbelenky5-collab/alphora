import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import ReactApexChart from 'react-apexcharts'
import ApexCharts from 'apexcharts'
import { useQuery } from '@tanstack/react-query'
import { useApp } from '../../contexts/AppContext'
import { useHistory } from '../../hooks/useHistory'
import IndicatorPanel from './IndicatorPanel'
import client from '../../api/client'

const CMP_COLORS = ['#f59e0b', '#8b5cf6', '#06b6d4']

// ── Mock data generators ──────────────────────────────────────────────────────
function generateCandles(days, startPrice = 185, volatility = 0.018) {
  const candles = []
  let price = startPrice
  const now = Date.now()
  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 86400000)
    if (date.getDay() === 0 || date.getDay() === 6) continue
    const change = price * volatility * (Math.random() - 0.48)
    const open   = price
    const close  = +(price + change).toFixed(2)
    const high   = +(Math.max(open, close) + price * volatility * Math.random() * 0.6).toFixed(2)
    const low    = +(Math.min(open, close) - price * volatility * Math.random() * 0.6).toFixed(2)
    const volume = Math.floor(20_000_000 + Math.random() * 60_000_000)
    candles.push({ x: date.getTime(), open, high, low, close, volume })
    price = close
  }
  return candles
}

function generateWeekly(weeks, startPrice = 185) {
  const candles = []
  let price = startPrice
  const now = Date.now()
  for (let i = weeks; i >= 0; i--) {
    const ts     = now - i * 7 * 86400000
    const v      = price * 0.035 * (Math.random() - 0.47)
    const open   = price
    const close  = +(price + v).toFixed(2)
    const high   = +(Math.max(open, close) + price * 0.02 * Math.random()).toFixed(2)
    const low    = +(Math.min(open, close) - price * 0.02 * Math.random()).toFixed(2)
    const volume = Math.floor(100_000_000 + Math.random() * 300_000_000)
    candles.push({ x: ts, open, high, low, close, volume })
    price = close
  }
  return candles
}

function generateMonthly(months, startPrice = 185) {
  const candles = []
  let price = startPrice
  const now = Date.now()
  for (let i = months; i >= 0; i--) {
    const ts     = now - i * 30 * 86400000
    const v      = price * 0.06 * (Math.random() - 0.46)
    const open   = price
    const close  = +(price + v).toFixed(2)
    const high   = +(Math.max(open, close) + price * 0.03 * Math.random()).toFixed(2)
    const low    = +(Math.min(open, close) - price * 0.03 * Math.random()).toFixed(2)
    const volume = Math.floor(500_000_000 + Math.random() * 1_500_000_000)
    candles.push({ x: ts, open, high, low, close, volume })
    price = close
  }
  return candles
}

function generateHourly(hours, startPrice = 185) {
  const candles = []
  let price = startPrice
  const now = Date.now()
  for (let i = hours; i >= 0; i--) {
    const ts     = now - i * 3600000
    const v      = price * 0.004 * (Math.random() - 0.47)
    const open   = price
    const close  = +(price + v).toFixed(2)
    const high   = +(Math.max(open, close) + price * 0.002 * Math.random()).toFixed(2)
    const low    = +(Math.min(open, close) - price * 0.002 * Math.random()).toFixed(2)
    const volume = Math.floor(500_000 + Math.random() * 2_000_000)
    candles.push({ x: ts, open, high, low, close, volume })
    price = close
  }
  return candles
}

function generateYTD(startPrice = 185) {
  const now = new Date()
  const days = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 86400000)
  return generateCandles(days, startPrice)
}

// ── Period definitions ────────────────────────────────────────────────────────
const PERIODS = [
  { id: '1H',  apiPeriod: 'Hour'  },
  { id: '1D',  apiPeriod: 'Day'   },
  { id: '1W',  apiPeriod: 'Week'  },
  { id: '1M',  apiPeriod: 'Month' },
  { id: 'YTD', apiPeriod: 'YTD'   },
]

const MOCK_CANDLES = {
  '1H':  () => generateHourly(24 * 30, 185),  // 30 days hourly
  '1D':  () => generateCandles(500, 185),       // ~2 years daily
  '1W':  () => generateWeekly(260, 185),        // 5 years weekly
  '1M':  () => generateMonthly(120, 185),       // 10 years monthly
  'YTD': () => generateYTD(185),
}

// How many candles to show in the default (non-zoomed) view
const DEFAULT_VISIBLE = { '1H': 48, '1D': 90, '1W': 52, '1M': 24, 'YTD': 9999 }

// ── Main component ────────────────────────────────────────────────────────────
export default function StockChartApex({ symbol = 'AAPL' }) {
  const { theme, lang } = useApp()
  const [activePeriod, setActivePeriod] = useState('1D')
  const isDark = theme === 'dark'
  const isHe   = lang === 'he'

  const currentPeriodDef = PERIODS.find(p => p.id === activePeriod)
  const { data: liveResult, isLoading } = useHistory(symbol, currentPeriodDef.apiPeriod)

  // ── Comparison state ──────────────────────────────────────────────────────
  const [cmpSymbols, setCmpSymbols] = useState([])
  const [cmpInput,   setCmpInput]   = useState('')
  const [cmpOpen,    setCmpOpen]    = useState(false)
  const [cmpColors,  setCmpColors]  = useState({})   // { sym: '#hex' }
  const [cmpWidths,  setCmpWidths]  = useState({})   // { sym: number }

  const { data: cmpData1 } = useQuery({
    queryKey: ['history', cmpSymbols[0], currentPeriodDef.apiPeriod],
    queryFn:  () => client.get(`/history/${cmpSymbols[0]}?period=${currentPeriodDef.apiPeriod}`),
    staleTime: 60000,
    enabled:  !!cmpSymbols[0],
  })
  const { data: cmpData2 } = useQuery({
    queryKey: ['history', cmpSymbols[1], currentPeriodDef.apiPeriod],
    queryFn:  () => client.get(`/history/${cmpSymbols[1]}?period=${currentPeriodDef.apiPeriod}`),
    staleTime: 60000,
    enabled:  !!cmpSymbols[1],
  })

  function addCmp() {
    const s = cmpInput.trim().toUpperCase()
    if (!s || cmpSymbols.includes(s) || s === symbol.toUpperCase()) return
    if (cmpSymbols.length >= 2) return
    setCmpSymbols(prev => [...prev, s])
    setCmpInput('')
  }
  function removeCmp(s) {
    setCmpSymbols(prev => prev.filter(x => x !== s))
    setCmpColors(prev => { const n = { ...prev }; delete n[s]; return n })
    setCmpWidths(prev => { const n = { ...prev }; delete n[s]; return n })
  }
  function getCmpColor(sym, idx) { return cmpColors[sym] || CMP_COLORS[idx] || CMP_COLORS[0] }
  function getCmpWidth(sym)      { return cmpWidths[sym]  || 2 }

  const chartWrapRef  = useRef(null)
  const zoomRef       = useRef({ min: 0, max: 0, dataMin: 0, dataMax: 0 })
  const [overlayData, setOverlayData] = useState({ series: [], annotations: { yaxis: [] } })
  const handleOverlayChange = useCallback((data) => setOverlayData(data), [])

  // ── SR visibility (auto-detected pivots) ────────────────────────────────────
  const [srVisible, setSrVisible] = useState(true)

  // ── Drawing state ─────────────────────────────────────────────────────────
  // drawMode: null | 'support' | 'resistance' | 'trend'
  // hLines items: { id, price, srType: 'support' | 'resistance' }
  const [drawMode,    setDrawMode]    = useState(null)
  const [hLines,      setHLines]      = useState([])
  const [trendLines,  setTrendLines]  = useState([])
  const [trendAnchor, setTrendAnchor] = useState(null)

  // Load drawings from localStorage when symbol changes
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`alphora_drawings_${symbol}`) || '{}')
      setHLines(saved.hLines || [])
      setTrendLines(saved.trendLines || [])
    } catch { setHLines([]); setTrendLines([]) }
    setDrawMode(null)
    setTrendAnchor(null)
  }, [symbol])

  // Persist drawings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`alphora_drawings_${symbol}`, JSON.stringify({ hLines, trendLines }))
    } catch {}
  }, [symbol, hLines, trendLines])

  // Build candles from live data or mock
  const candles = useMemo(() => {
    const raw = liveResult?.data
    if (raw && raw.length > 2) {
      const data = raw
        .map(d => ({
          x:      d.time * 1000,
          open:   d.open  ?? d.close,
          high:   d.high  ?? d.close,
          low:    d.low   ?? d.close,
          close:  d.close,
          volume: d.volume ?? 0,
        }))
        .filter(d => d.open != null && d.close != null)
      if (data.length > 1) return data
    }
    return MOCK_CANDLES[activePeriod]()
  }, [liveResult, activePeriod, symbol])

  // ── Comparison series (normalize to % change from first candle) ──────────
  const hasCmp = cmpSymbols.length > 0

  function buildCmpSeries(rawData, sym, color) {
    if (!rawData?.data?.length || !sym) return null
    const pts = rawData.data
      .filter(d => d.close != null)
      .map(d => ({ x: d.time * 1000, close: d.close }))
    if (!pts.length) return null
    const base = pts[0].close
    return {
      name:  sym,
      type:  'line',
      color,
      data:  pts.map(p => ({ x: p.x, y: parseFloat(((p.close - base) / base * 100).toFixed(2)) })),
    }
  }

  const cmpSeries = useMemo(() => {
    const s1 = buildCmpSeries(cmpData1, cmpSymbols[0], getCmpColor(cmpSymbols[0], 0))
    const s2 = buildCmpSeries(cmpData2, cmpSymbols[1], getCmpColor(cmpSymbols[1], 1))
    return [s1, s2].filter(Boolean)
  }, [cmpData1, cmpData2, cmpSymbols, cmpColors]) // eslint-disable-line

  // When comparing: main symbol normalized to %
  const mainPctData = useMemo(() => {
    if (!hasCmp || !candles.length) return []
    const base = candles[0].close
    return candles.map(d => ({ x: d.x, y: parseFloat(((d.close - base) / base * 100).toFixed(2)) }))
  }, [hasCmp, candles])

  // Compute default visible window (last N candles)
  const initZoom = useMemo(() => {
    if (!candles.length) return null
    const n = Math.min(DEFAULT_VISIBLE[activePeriod], candles.length)
    return {
      min:     candles[candles.length - n].x,
      max:     candles[candles.length - 1].x,
      dataMin: candles[0].x,
      dataMax: candles[candles.length - 1].x,
    }
  }, [candles, activePeriod])

  // Keep zoomRef in sync with current window
  useEffect(() => {
    if (initZoom) zoomRef.current = initZoom
  }, [initZoom])

  // Apply initial zoom after chart renders / data updates
  useEffect(() => {
    if (!initZoom) return
    const t = setTimeout(() => {
      ApexCharts.exec(`candle-${symbol}`, 'zoomX', initZoom.min, initZoom.max)
      ApexCharts.exec(`vol-${symbol}`,    'zoomX', initZoom.min, initZoom.max)
    }, 80)
    return () => clearTimeout(t)
  }, [candles, symbol, initZoom])

  // Mouse-wheel zoom
  useEffect(() => {
    const el = chartWrapRef.current
    if (!el || !candles.length) return

    const candleSpan = candles.length > 1 ? candles[1].x - candles[0].x : 3_600_000
    const minSpan    = candleSpan * 4

    const onWheel = (e) => {
      e.preventDefault()
      const { min, max, dataMin, dataMax } = zoomRef.current
      if (!max) return

      const factor = e.deltaY > 0 ? 1.25 : 0.8   // down = zoom out, up = zoom in
      const center = (min + max) / 2
      const half   = ((max - min) / 2) * factor

      const newMin = Math.max(dataMin, Math.round(center - half))
      const newMax = Math.min(dataMax, Math.round(center + half))
      if (newMax - newMin < minSpan) return

      zoomRef.current = { ...zoomRef.current, min: newMin, max: newMax }
      ApexCharts.exec(`candle-${symbol}`, 'zoomX', newMin, newMax)
      ApexCharts.exec(`vol-${symbol}`,    'zoomX', newMin, newMax)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [symbol, candles])

  // ── Drawing click handler ─────────────────────────────────────────────────
  // Uses ApexCharts internal globals for pixel-perfect coordinate conversion
  const handleChartClick = useCallback((e) => {
    if (!drawMode) return

    // Get exact plot-area dimensions from ApexCharts internals
    const chartInst = ApexCharts.getChartByID(`candle-${symbol}`)
    if (!chartInst) return
    const g   = chartInst.w.globals
    const minY = g.minY, maxY = g.maxY
    const minX = g.minX, maxX = g.maxX
    if (!maxX || maxX === minX || maxY === minY) return

    const rect   = e.currentTarget.getBoundingClientRect()
    const relX   = e.clientX - rect.left
    const relY   = e.clientY - rect.top

    // translateX/Y are the offsets to the actual plot area inside the SVG
    const plotX  = g.translateX  || 0
    const plotY  = g.translateY  || 0
    const plotW  = g.gridWidth   || (rect.width  - plotX - 10)
    const plotH  = g.gridHeight  || (rect.height - plotY - 34)

    // Clamp click within plot area
    const px = Math.max(0, Math.min(plotW, relX - plotX))
    const py = Math.max(0, Math.min(plotH, relY - plotY))

    const ts    = minX + (px / plotW) * (maxX - minX)
    const price = maxY - (py / plotH) * (maxY - minY)

    if (drawMode === 'support' || drawMode === 'resistance') {
      setHLines(prev => [...prev, { id: Date.now(), price: +price.toFixed(2), srType: drawMode }])
    } else if (drawMode === 'trend') {
      if (!trendAnchor) {
        setTrendAnchor({ x: Math.round(ts), y: +price.toFixed(2) })
      } else {
        setTrendLines(prev => [...prev, {
          id: Date.now(),
          p1: trendAnchor,
          p2: { x: Math.round(ts), y: +price.toFixed(2) },
        }])
        setTrendAnchor(null)
      }
    }
  }, [drawMode, trendAnchor, symbol])

  function clearDrawings() {
    setHLines([])
    setTrendLines([])
    setTrendAnchor(null)
    setDrawMode(null)
  }

  // ── Theme colors ─────────────────────────────────────────────────────────
  const C = {
    bg:       isDark ? '#161b22' : '#ffffff',
    bgCard:   isDark ? '#0d1117' : '#f0f2f5',
    grid:     isDark ? '#1e2630' : '#e8eaed',
    text:     isDark ? '#8b949e' : '#57606a',
    textMain: isDark ? '#e6edf3' : '#1c2128',
    border:   isDark ? '#30363d' : '#d0d7de',
    up:       '#26a65b',
    down:     '#e53935',
    tooltip:  isDark ? '#1c2128' : '#ffffff',
  }

  const volColors = candles.map(d => d.close >= d.open ? '#26a65b' : '#e53935')

  // ── Last bar stats ────────────────────────────────────────────────────────
  const last = candles[candles.length - 1]
  const prev = candles[candles.length - 2]
  const chg  = last && prev ? last.close - prev.close : 0
  const chgP = last && prev ? (chg / prev.close) * 100 : 0
  const isUp = chg >= 0

  // ── Shared x-axis ─────────────────────────────────────────────────────────
  const sharedXAxis = {
    type: 'datetime',
    labels: {
      datetimeUTC: false,
      style: { colors: C.text, fontSize: '10px', fontFamily: 'Inter, sans-serif' },
    },
    axisBorder: { color: C.border },
    axisTicks:  { color: C.border },
  }

  // Trendlines rendered as overlay line series
  const trendSeries = trendLines.map((t, i) => ({
    name:  `trend-${i}`,
    type:  'line',
    color: '#f59e0b',
    data:  [{ x: t.p1.x, y: t.p1.y }, { x: t.p2.x, y: t.p2.y }],
  }))

  // Manual S/R line annotations — colored by type
  const hLineAnnotations = hLines.map(h => {
    const isSupport = h.srType === 'support'
    const clr = isSupport ? '#26a65b' : '#e53935'
    const lbl = isSupport ? `S $${h.price}` : `R $${h.price}`
    return {
      y:               h.price,
      strokeDashArray: 5,
      borderColor:     clr,
      borderWidth:     1.5,
      label: {
        text:     lbl,
        position: 'right',
        style: {
          background: isDark ? '#1c2128' : '#ffffff',
          color:      clr,
          fontSize:   '10px',
          padding:    { top: 2, right: 6, bottom: 2, left: 6 },
        },
      },
    }
  })
  const allAnnotations = {
    yaxis:  [...(overlayData.annotations?.yaxis  || []), ...hLineAnnotations],
    points: overlayData.annotations?.points || [],
  }
  const hasSR = allAnnotations.yaxis.length > 0 || allAnnotations.points.length > 0

  // ── Candlestick options ───────────────────────────────────────────────────
  const candleOptions = {
    chart: {
      type:       hasCmp ? 'line' : 'candlestick',
      id:         `candle-${symbol}`,
      background: C.bg,
      toolbar:    { show: false, autoSelected: 'pan' },
      zoom:       { enabled: true, type: 'x', autoScaleYaxis: true },
      animations: { enabled: false },
      selection:  { enabled: false },
      events:     {},
    },
    theme:  { mode: isDark ? 'dark' : 'light' },
    stroke: hasCmp ? {
      width: [
        getCmpWidth(symbol),
        ...cmpSymbols.map(s => getCmpWidth(s)),
      ],
      curve: 'smooth',
    } : {
      width: [1, ...overlayData.series.map(() => 1.5), ...trendSeries.map(() => 2)],
      curve: 'smooth',
    },
    annotations: hasSR ? allAnnotations : undefined,
    plotOptions: {
      candlestick: {
        colors: { upward: C.up, downward: C.down },
        wick:   { useFillColor: true },
      },
    },
    xaxis: { ...sharedXAxis },
    yaxis: hasCmp ? [
      // right axis: % change for main + comparison lines
      {
        opposite: true,
        labels: {
          style:     { colors: C.text, fontSize: '11px', fontFamily: 'Inter, sans-serif' },
          formatter: v => (v > 0 ? '+' : '') + v?.toFixed(1) + '%',
        },
        tooltip: { enabled: true },
      },
    ] : {
      opposite: true,
      tooltip:  { enabled: true },
      labels: {
        style:     { colors: C.text, fontSize: '11px', fontFamily: 'Inter, sans-serif' },
        formatter: v => v?.toFixed(2),
      },
    },
    grid: {
      borderColor:     C.grid,
      strokeDashArray: 2,
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      enabled: true,
      theme:   isDark ? 'dark' : 'light',
      custom: hasCmp ? undefined : ({ dataPointIndex, w }) => {
        const d = w.globals.initialSeries[0]?.data?.[dataPointIndex]
        if (!d || !Array.isArray(d.y)) return ''
        const [o, h, l, c] = d.y
        const up    = c >= o
        const clr   = up ? C.up : C.down
        const arrow = up ? '▲' : '▼'
        const chgV  = (c - o).toFixed(2)
        const chgPV = (((c - o) / o) * 100).toFixed(2)
        const dt    = new Date(d.x).toLocaleString(
          lang === 'he' ? 'he-IL' : 'en-US',
          { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        )
        return `<div style="background:${C.tooltip};border:1px solid ${C.border};border-radius:8px;
                  padding:10px 14px;font-family:Inter,sans-serif;min-width:160px">
                  <div style="font-size:10px;color:${C.text};margin-bottom:6px">${dt}</div>
                  <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:12px">
                    <span style="color:${C.text}">O</span><span style="color:${C.textMain};font-weight:600">${o?.toFixed(2)}</span>
                    <span style="color:${C.text}">H</span><span style="color:${C.up};font-weight:600">${h?.toFixed(2)}</span>
                    <span style="color:${C.text}">L</span><span style="color:${C.down};font-weight:600">${l?.toFixed(2)}</span>
                    <span style="color:${C.text}">C</span><span style="color:${clr};font-weight:700">${c?.toFixed(2)}</span>
                  </div>
                  <div style="margin-top:6px;font-size:12px;color:${clr};font-weight:700">${arrow} ${chgV} (${chgPV}%)</div>
                </div>`
      },
    },
    dataLabels: { enabled: false },
    legend:     { show: false },
  }

  // ── Volume options ────────────────────────────────────────────────────────
  const volumeOptions = {
    chart: {
      type:       'bar',
      id:         `vol-${symbol}`,
      background: C.bg,
      toolbar:    { show: false },
      zoom:       { enabled: false },
      animations: { enabled: false },
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: volColors,
    plotOptions: {
      bar: { distributed: true, columnWidth: '80%' },
    },
    xaxis: {
      ...sharedXAxis,
      labels:    { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      opposite: true,
      labels: {
        style:     { colors: C.text, fontSize: '9px', fontFamily: 'Inter, sans-serif' },
        formatter: v => {
          if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
          if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K'
          return v
        },
      },
    },
    grid:       { borderColor: C.grid, strokeDashArray: 2 },
    dataLabels: { enabled: false },
    legend:     { show: false },
    tooltip: {
      enabled: true,
      theme:   isDark ? 'dark' : 'light',
      y: {
        formatter: v => {
          if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'
          if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K'
          return String(v)
        },
      },
    },
  }

  return (
    <div className="card overflow-hidden flex flex-col" style={{ background: C.bg }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-4 flex-wrap"
           style={{ borderBottom: `1px solid ${C.border}` }}>

        <div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl font-bold font-inter" style={{ color: C.textMain }}>
              {symbol}
            </span>
            {isLoading && (
              <span className="text-sm font-heebo" style={{ color: C.text }}>
                {lang === 'he' ? 'טוען...' : 'Loading...'}
              </span>
            )}
            {last && (
              <>
                <span className="text-3xl font-bold font-inter tabular-nums" style={{ color: C.textMain }}>
                  {last.close.toFixed(2)}
                </span>
                <span className="text-base font-semibold font-inter tabular-nums flex items-center gap-1"
                      style={{ color: isUp ? C.up : C.down }}>
                  {isUp ? '▲' : '▼'} {Math.abs(chg).toFixed(2)} ({Math.abs(chgP).toFixed(2)}%)
                </span>
              </>
            )}
          </div>
          {last && (
            <div className="flex items-center gap-4 mt-1 text-xs font-inter flex-wrap"
                 style={{ color: C.text }}>
              <span>O: <b style={{ color: C.textMain }}>{last.open.toFixed(2)}</b></span>
              <span>H: <b style={{ color: C.up }}>{last.high.toFixed(2)}</b></span>
              <span>L: <b style={{ color: C.down }}>{last.low.toFixed(2)}</b></span>
              <span>C: <b style={{ color: isUp ? C.up : C.down }}>{last.close.toFixed(2)}</b></span>
              <span>Vol: <b style={{ color: C.textMain }}>
                {last.volume >= 1e6
                  ? (last.volume / 1e6).toFixed(2) + 'M'
                  : (last.volume / 1e3).toFixed(0) + 'K'}
              </b></span>
            </div>
          )}
        </div>

        {/* Period buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-lg"
               style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePeriod(p.id)}
                style={{
                  padding:      '4px 12px',
                  borderRadius: '6px',
                  fontSize:     '12px',
                  fontWeight:   700,
                  fontFamily:   'Inter, sans-serif',
                  cursor:       'pointer',
                  border:       'none',
                  transition:   'all .15s',
                  background:   activePeriod === p.id ? '#3b6ff5' : 'transparent',
                  color:        activePeriod === p.id ? '#ffffff' : C.text,
                }}
              >
                {p.id}
              </button>
            ))}
          </div>

          {/* Compare button */}
          <button
            onClick={() => setCmpOpen(v => !v)}
            style={{
              padding: '5px 12px', borderRadius: '6px', border: `1px solid ${cmpOpen || hasCmp ? '#3b6ff5' : C.border}`,
              background: cmpOpen || hasCmp ? '#3b6ff522' : 'transparent',
              color: cmpOpen || hasCmp ? '#3b6ff5' : C.text,
              cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
            }}
          >
            {isHe ? '⇄ השווה' : '⇄ Compare'}
          </button>

          {/* ── SR visibility toggle ──────────────────────────────────────── */}
          <button
            onClick={() => setSrVisible(v => !v)}
            title={isHe ? 'הצג/הסתר תמיכה והתנגדות אוטומטית' : 'Show/hide auto S/R levels'}
            style={{
              padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
              fontFamily: 'Inter, sans-serif', cursor: 'pointer',
              border:     `1px solid ${srVisible ? '#26a65b' : C.border}`,
              background: srVisible ? '#26a65b18' : 'transparent',
              color:      srVisible ? '#26a65b'   : C.text,
            }}
          >
            {srVisible ? '✓ ' : ''}{isHe ? 'S/R אוטו' : 'Auto S/R'}
          </button>

          {/* ── Drawing tools ─────────────────────────────────────────────── */}
          {[
            { mode: 'support',    icon: '─', clr: '#26a65b', he: 'תמיכה',    en: 'Support'    },
            { mode: 'resistance', icon: '─', clr: '#e53935', he: 'התנגדות',  en: 'Resistance' },
            { mode: 'trend',      icon: '↗', clr: '#3b6ff5', he: 'טרנד',     en: 'Trend'      },
          ].map(({ mode, icon, clr, he, en }) => (
            <button
              key={mode}
              onClick={() => { setDrawMode(prev => prev === mode ? null : mode); setTrendAnchor(null) }}
              title={isHe ? he : en}
              style={{
                padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                border:     `1px solid ${drawMode === mode ? clr : C.border}`,
                background: drawMode === mode ? clr + '22' : 'transparent',
                color:      drawMode === mode ? clr : C.text,
                display: 'flex', alignItems: 'center', gap: '3px',
              }}
            >
              {drawMode === mode && <span style={{ fontSize: '10px' }}>✓</span>}
              <span>{icon} {isHe ? he : en}</span>
            </button>
          ))}

          {(hLines.length > 0 || trendLines.length > 0) && (
            <button
              onClick={clearDrawings}
              title={isHe ? 'נקה ציורים ידניים' : 'Clear manual drawings'}
              style={{
                padding: '5px 8px', borderRadius: '6px', fontSize: '12px',
                border: `1px solid ${C.border}`, background: 'transparent',
                color: C.text, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >🗑️</button>
          )}
        </div>
      </div>

      {/* ── Drawing status hint ──────────────────────────────────────────────── */}
      {drawMode && (() => {
        const hints = {
          support:    { clr: '#26a65b', msg: isHe ? '─ לחץ על הגרף להוספת קו תמיכה ירוק' : '─ Click chart to place a support line' },
          resistance: { clr: '#e53935', msg: isHe ? '─ לחץ על הגרף להוספת קו התנגדות אדום' : '─ Click chart to place a resistance line' },
          trend:      { clr: '#3b6ff5', msg: trendAnchor
            ? (isHe ? '↗ לחץ על הנקודה השניה לסיום הקו' : '↗ Click the second point to finish the line')
            : (isHe ? '↗ לחץ על נקודת ההתחלה של קו המגמה' : '↗ Click the starting point of the trend line') },
        }
        const h = hints[drawMode]
        return (
          <div style={{ padding: '5px 20px', background: h.clr + '11', borderBottom: `1px solid ${h.clr}33`, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: h.clr, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{h.msg}</span>
            {trendAnchor && (
              <span style={{ fontSize: '10px', color: C.text, fontFamily: 'Inter, sans-serif' }}>
                {isHe ? `נקודה 1: $${trendAnchor.y}` : `Pt 1: $${trendAnchor.y}`}
              </span>
            )}
          </div>
        )
      })()}

      {/* ── Compare bar ─────────────────────────────────────────────────────── */}
      {cmpOpen && (
        <div style={{ padding: '8px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', background: C.bg }}>
          <span style={{ fontSize: '12px', color: C.text, fontFamily: 'Inter, sans-serif' }}>
            {isHe ? 'הוסף סימבול:' : 'Add symbol:'}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              value={cmpInput}
              onChange={e => setCmpInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && addCmp()}
              placeholder={isHe ? 'MSFT, ^GSPC…' : 'MSFT, ^GSPC…'}
              style={{
                padding: '4px 10px', borderRadius: '6px', border: `1px solid ${C.border}`,
                background: C.bgCard, color: C.textMain, fontSize: '12px', fontFamily: 'Inter, sans-serif',
                width: '110px', outline: 'none',
              }}
            />
            <button onClick={addCmp}
              disabled={cmpSymbols.length >= 2}
              style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: '#3b6ff5', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'Inter, sans-serif', opacity: cmpSymbols.length >= 2 ? 0.4 : 1 }}>
              +
            </button>
          </div>

          {/* Quick index presets */}
          {['^GSPC', '^NDX', 'QQQ', 'SPY'].filter(s => s !== symbol.toUpperCase()).slice(0, 3).map(s => (
            <button key={s} onClick={() => { if (!cmpSymbols.includes(s) && cmpSymbols.length < 2) setCmpSymbols(p => [...p, s]) }}
              disabled={cmpSymbols.includes(s) || cmpSymbols.length >= 2}
              style={{ padding: '3px 10px', borderRadius: '20px', border: `1px solid ${C.border}`, background: 'transparent', color: C.text, cursor: 'pointer', fontSize: '11px', fontFamily: 'Inter, sans-serif', opacity: cmpSymbols.includes(s) || cmpSymbols.length >= 2 ? 0.4 : 1 }}>
              {s}
            </button>
          ))}

          {/* Main symbol chip (color + width when in compare mode) */}
          {(() => {
            const mc = cmpColors[symbol] || '#3b6ff5'
            const mw = cmpWidths[symbol] || 2
            return (
              <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 8px', borderRadius:'20px', background: mc+'22', border:`1px solid ${mc}55`, fontSize:'12px', fontWeight:700, fontFamily:'Inter,sans-serif', color:mc }}>
                {symbol}
                <input type="color" value={mc}
                  onChange={e => setCmpColors(p => ({ ...p, [symbol]: e.target.value }))}
                  style={{ width:'18px', height:'18px', border:'none', padding:0, background:'none', cursor:'pointer', borderRadius:'3px', flexShrink:0 }}
                  title={isHe ? 'שנה צבע' : 'Change color'}
                />
                {[1,2,3].map(w => (
                  <button key={w} onClick={() => setCmpWidths(p => ({ ...p, [symbol]: w }))}
                    style={{ width:'18px', height:'16px', borderRadius:'3px', border:`1px solid ${mc}88`, background: mw===w ? mc : 'transparent', color: mw===w ? '#fff' : mc, cursor:'pointer', fontSize:'9px', fontWeight:700, fontFamily:'Inter,sans-serif', padding:0, lineHeight:1 }}>
                    {w}
                  </button>
                ))}
              </span>
            )
          })()}

          {/* Active comparison chips */}
          {cmpSymbols.map((s, i) => {
            const clr = getCmpColor(s, i)
            const wid = getCmpWidth(s)
            return (
              <span key={s} style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 8px', borderRadius:'20px', background: clr+'22', color: clr, border:`1px solid ${clr}55`, fontSize:'12px', fontWeight:700, fontFamily:'Inter,sans-serif' }}>
                {s}
                <input type="color" value={clr}
                  onChange={e => setCmpColors(p => ({ ...p, [s]: e.target.value }))}
                  style={{ width:'18px', height:'18px', border:'none', padding:0, background:'none', cursor:'pointer', borderRadius:'3px', flexShrink:0 }}
                  title={isHe ? 'שנה צבע' : 'Change color'}
                />
                {[1,2,3].map(w => (
                  <button key={w} onClick={() => setCmpWidths(p => ({ ...p, [s]: w }))}
                    style={{ width:'18px', height:'16px', borderRadius:'3px', border:`1px solid ${clr}88`, background: wid===w ? clr : 'transparent', color: wid===w ? '#fff' : clr, cursor:'pointer', fontSize:'9px', fontWeight:700, fontFamily:'Inter,sans-serif', padding:0, lineHeight:1 }}>
                    {w}
                  </button>
                ))}
                <button onClick={() => removeCmp(s)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:clr, fontSize:'14px', lineHeight:1, padding:0, marginLeft:'1px' }}>×</button>
              </span>
            )
          })}
        </div>
      )}

      {/* ── Candlestick (+ overlays + comparison) ───────────────────────── */}
      <div ref={chartWrapRef} style={{ background: C.bg, position: 'relative' }}>
        <ReactApexChart
          key={`candle-${symbol}-${activePeriod}-${theme}-${hasCmp}-${cmpSymbols.join(',')}`}
          type={hasCmp ? 'line' : 'candlestick'}
          series={
            hasCmp
              ? [
                  { name: symbol, type: 'line', color: cmpColors[symbol] || '#3b6ff5', data: mainPctData },
                  ...cmpSeries,
                ]
              : [
                  // Price is always candlestick — overlays stack on top without changing it
                  { name: 'Price', type: 'candlestick', data: candles.map(d => ({ x: d.x, y: [d.open, d.high, d.low, d.close] })) },
                  ...overlayData.series.map(s => ({ name: s.name, type: 'line', data: s.data, color: s.color })),
                  ...trendSeries,
                ]
          }
          options={candleOptions}
          height={340}
        />
        {/* Transparent drawing overlay — captures clicks when a draw mode is active */}
        {drawMode && (
          <div
            onClick={handleChartClick}
            style={{
              position: 'absolute', inset: 0,
              cursor: 'crosshair', zIndex: 5,
              background: trendAnchor ? '#f59e0b08' : 'transparent',
            }}
          />
        )}
      </div>

      {/* ── Comparison legend ───────────────────────────────────────────────── */}
      {hasCmp && (
        <div style={{ padding: '4px 20px 8px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(() => { const mc = cmpColors[symbol] || '#3b6ff5'; return (
            <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', fontSize:'11px', fontFamily:'Inter,sans-serif', color:mc, fontWeight:700 }}>
              <span style={{ width:`${getCmpWidth(symbol)*8}px`, height:`${getCmpWidth(symbol)}px`, background:mc, display:'inline-block', borderRadius:'2px' }} />
              {symbol}
            </span>
          )})()}
          {cmpSeries.map((s, i) => {
            const clr = getCmpColor(s.name, i)
            const w   = getCmpWidth(s.name)
            return (
              <span key={s.name} style={{ display:'inline-flex', alignItems:'center', gap:'5px', fontSize:'11px', fontFamily:'Inter,sans-serif', color:clr, fontWeight:700 }}>
                <span style={{ width:`${w*8}px`, height:`${w}px`, background:clr, display:'inline-block', borderRadius:'2px' }} />
                {s.name}
              </span>
            )
          })}
          <span style={{ fontSize: '10px', color: C.text, fontFamily: 'Inter, sans-serif', marginLeft: 'auto' }}>
            {isHe ? '% שינוי מתחילת תקופה' : '% change from period start'}
          </span>
        </div>
      )}

      <div style={{ height: '1px', background: C.border, margin: '0 16px' }} />

      {/* ── Volume ───────────────────────────────────────────────────────── */}
      <div style={{ background: C.bg }}>
        <ReactApexChart
          key={`vol-${symbol}-${activePeriod}-${theme}`}
          type="bar"
          series={[{
            name: lang === 'he' ? 'ווליום' : 'Volume',
            data: candles.map((d, i) => ({
              x:         d.x,
              y:         d.volume,
              fillColor: volColors[i],
            })),
          }]}
          options={volumeOptions}
          height={110}
        />
      </div>

      {/* ── Indicator panel (MA/BB overlays + RSI/MACD/ATR sub-charts) ──── */}
      <IndicatorPanel
        candles={candles}
        symbol={symbol}
        isDark={isDark}
        onOverlayChange={handleOverlayChange}
        srVisible={srVisible}
      />
    </div>
  )
}
