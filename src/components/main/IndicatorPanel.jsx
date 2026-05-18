import { useState, useEffect, useMemo, useCallback } from 'react'
import ReactApexChart from 'react-apexcharts'
import ApexCharts from 'apexcharts'
import {
  calcSMA,
  calcEMA,
  calcRSI,
  calcMACD,
  calcATR,
  calcBB,
  calcPivots,
} from './indicators/calculations'

// ─── Theme helpers ─────────────────────────────────────────────────────────────
const T = (isDark) => ({
  bg:     isDark ? '#161b22' : '#ffffff',
  card:   isDark ? '#0d1117' : '#f6f8fa',
  border: isDark ? '#30363d' : '#d0d7de',
  text:   isDark ? '#e6edf3' : '#1c2128',
  muted:  isDark ? '#8b949e' : '#57606a',
})

const ACCENT   = '#3b6ff5'
const UP       = '#26a65b'
const DOWN     = '#e53935'
const BB_COLOR = '#64748b'

const DEFAULT_MAS = [
  { key: 'ma20',  label: 'MA20',  period: 20,  color: '#f59e0b', enabled: true  },
  { key: 'ma50',  label: 'MA50',  period: 50,  color: '#8b5cf6', enabled: false },
  { key: 'ma200', label: 'MA200', period: 200, color: '#06b6d4', enabled: false },
]

// ─── Pill Button ──────────────────────────────────────────────────────────────
function PillBtn({ active, onClick, children, isDark }) {
  const t = T(isDark)
  return (
    <button
      onClick={onClick}
      style={{
        padding:         '4px 12px',
        fontSize:        '12px',
        fontWeight:      700,
        borderRadius:    '6px',
        border:          'none',
        cursor:          'pointer',
        background:      active ? ACCENT : 'transparent',
        color:           active ? '#ffffff' : t.muted,
        transition:      'background 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  )
}

// ─── Sub-chart wrapper ────────────────────────────────────────────────────────
function SubChartWrap({ label, isDark, children }) {
  const t = T(isDark)
  return (
    <div style={{
      borderTop:   `1px solid ${t.border}`,
      background:  t.card,
      paddingTop:  '4px',
    }}>
      <div style={{
        fontSize:   '10px',
        fontWeight: 700,
        color:      t.muted,
        padding:    '0 12px 2px',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

// ─── Shared ApexCharts base options ──────────────────────────────────────────
function baseOptions(isDark, chartId, height) {
  const t = T(isDark)
  return {
    chart: {
      id:        chartId,
      type:      'line',
      height,
      background: t.card,
      foreColor:  t.text,
      toolbar:    { show: false },
      zoom:       { enabled: false },
      animations: { enabled: false },
      sparkline:  { enabled: false },
    },
    grid: {
      borderColor: t.border,
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true  } },
      padding: { left: 8, right: 8, top: 4, bottom: 0 },
    },
    xaxis: {
      type:   'datetime',
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks:  { show: false },
      tooltip:    { enabled: false },
    },
    yaxis: {
      labels: {
        style:   { colors: t.muted, fontSize: '10px' },
        offsetX: -4,
        formatter: (v) => (v == null ? '' : v.toFixed(2)),
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      x:     { format: 'dd MMM yyyy' },
    },
    legend:     { show: false },
    dataLabels: { enabled: false },
    stroke:     { curve: 'smooth', width: 1.5 },
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function IndicatorPanel({ candles, symbol, isDark, onOverlayChange, srVisible: srVisibleProp }) {
  const t = T(isDark)

  // ── Indicator toggles
  const [maOpen,   setMaOpen]   = useState(false)
  const [bbOn,     setBbOn]     = useState(false)
  const [rsiOn,    setRsiOn]    = useState(false)
  const [macdOn,   setMacdOn]   = useState(false)
  const [atrOn,    setAtrOn]    = useState(false)
  const [srOn,     setSrOn]     = useState(true)

  // ── MA sub-settings
  const [mas, setMas] = useState(DEFAULT_MAS)

  const updateMa = useCallback((key, field, value) => {
    setMas((prev) =>
      prev.map((m) => (m.key === key ? { ...m, [field]: value } : m))
    )
  }, [])

  // ── Computed indicator data
  const rsiData  = useMemo(() => (candles?.length ? calcRSI(candles)  : []), [candles])
  const macdData = useMemo(() => (candles?.length ? calcMACD(candles) : []), [candles])
  const atrData  = useMemo(() => (candles?.length ? calcATR(candles)  : []), [candles])
  const bbData   = useMemo(() => (candles?.length ? calcBB(candles)   : []), [candles])
  const srData   = useMemo(() => (candles?.length ? calcPivots(candles) : []), [candles])

  const maData = useMemo(() => {
    if (!candles?.length) return {}
    return Object.fromEntries(
      mas.map((m) => [m.key, calcSMA(candles, m.period)])
    )
  }, [candles, mas])

  // ── Notify parent of overlay changes
  useEffect(() => {
    if (!onOverlayChange) return

    const series = []

    // MA overlays
    if (maOpen) {
      mas.forEach((m) => {
        if (m.enabled && maData[m.key]?.length) {
          series.push({
            name:  m.label,
            type:  'line',
            data:  maData[m.key],
            color: m.color,
          })
        }
      })
    }

    // BB overlays
    if (bbOn && bbData.length) {
      series.push({
        name:  'BB Upper',
        type:  'line',
        data:  bbData.map((d) => ({ x: d.x, y: d.upper })),
        color: BB_COLOR,
        dashArray: 4,
      })
      series.push({
        name:  'BB Mid',
        type:  'line',
        data:  bbData.map((d) => ({ x: d.x, y: d.mid })),
        color: BB_COLOR,
      })
      series.push({
        name:  'BB Lower',
        type:  'line',
        data:  bbData.map((d) => ({ x: d.x, y: d.lower })),
        color: BB_COLOR,
        dashArray: 4,
      })
    }

    // S/R annotations — horizontal lines + touch-point dots
    const yaxis  = []
    const points = []

    // srVisibleProp (from chart header toggle) overrides internal srOn when provided
    const srActive = srVisibleProp !== undefined ? srVisibleProp : srOn
    if (srActive && srData.length) {
      srData.forEach((level) => {
        const isRes = level.type === 'resistance'
        const color = isRes ? DOWN : UP

        // Horizontal dashed line
        yaxis.push({
          y:               level.price,
          borderColor:     color,
          borderWidth:     Math.min(1 + level.strength, 2),
          strokeDashArray: 5,
          label: {
            text:     `${isRes ? 'R' : 'S'} ${level.price}`,
            position: 'right',
            style: {
              color:      '#ffffff',
              background: color,
              fontSize:   '10px',
              padding:    { left: 4, right: 4, top: 2, bottom: 2 },
            },
          },
        })

        // Dot markers at each candle that formed this level
        if (level.touches) {
          level.touches.forEach((touch) => {
            points.push({
              x:            touch.x,
              y:            touch.price,
              marker: {
                size:        5,
                fillColor:   color,
                strokeColor: '#ffffff',
                strokeWidth: 1.5,
                radius:      2,
                shape:       isRes ? 'square' : 'circle',
              },
              label: { text: '' },   // no label on dots
            })
          })
        }
      })
    }

    onOverlayChange({ series, annotations: { yaxis, points } })
  }, [maOpen, mas, maData, bbOn, bbData, srOn, srData, srVisibleProp, onOverlayChange])

  // ─── RSI chart options ────────────────────────────────────────────────────
  const rsiOptions = useMemo(() => ({
    ...baseOptions(isDark, `ind-rsi-${symbol}`, 110),
    yaxis: {
      min:    0,
      max:    100,
      tickAmount: 4,
      labels: {
        style:   { colors: T(isDark).muted, fontSize: '10px' },
        offsetX: -4,
        formatter: (v) => v?.toFixed(0),
      },
    },
    annotations: {
      yaxis: [
        {
          y:           70,
          borderColor: DOWN,
          borderWidth: 1,
          strokeDashArray: 4,
          label: { text: '70', position: 'right', style: { color: DOWN, background: 'transparent', fontSize: '10px' } },
        },
        {
          y:           30,
          borderColor: UP,
          borderWidth: 1,
          strokeDashArray: 4,
          label: { text: '30', position: 'right', style: { color: UP, background: 'transparent', fontSize: '10px' } },
        },
      ],
    },
  }), [isDark, symbol])

  const rsiSeries = useMemo(() => [{
    name: 'RSI',
    data: rsiData,
    color: ACCENT,
  }], [rsiData])

  // ─── MACD chart options ───────────────────────────────────────────────────
  const macdOptions = useMemo(() => ({
    ...baseOptions(isDark, `ind-macd-${symbol}`, 130),
    chart: {
      ...baseOptions(isDark, `ind-macd-${symbol}`, 130).chart,
      type: 'line',
    },
    stroke: { curve: 'smooth', width: [1.5, 1.5, 0] },
    plotOptions: {
      bar: { columnWidth: '80%' },
    },
    yaxis: {
      labels: {
        style:   { colors: T(isDark).muted, fontSize: '10px' },
        offsetX: -4,
        formatter: (v) => v?.toFixed(3),
      },
    },
  }), [isDark, symbol])

  const macdSeries = useMemo(() => {
    if (!macdData.length) return []
    return [
      {
        name: 'MACD',
        type: 'line',
        data: macdData.map((d) => ({ x: d.x, y: d.macd })),
        color: ACCENT,
      },
      {
        name: 'Signal',
        type: 'line',
        data: macdData.map((d) => ({ x: d.x, y: d.signal })),
        color: '#f59e0b',
      },
      {
        name: 'Histogram',
        type: 'bar',
        data: macdData.map((d) => ({ x: d.x, y: d.histogram })),
        color: UP,
      },
    ]
  }, [macdData])

  // ─── ATR chart options ────────────────────────────────────────────────────
  const atrOptions = useMemo(() => ({
    ...baseOptions(isDark, `ind-atr-${symbol}`, 100),
    yaxis: {
      labels: {
        style:   { colors: T(isDark).muted, fontSize: '10px' },
        offsetX: -4,
        formatter: (v) => v?.toFixed(2),
      },
    },
  }), [isDark, symbol])

  const atrSeries = useMemo(() => [{
    name: 'ATR',
    data: atrData,
    color: '#8b5cf6',
  }], [atrData])

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: t.bg, borderTop: `1px solid ${t.border}` }}>

      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div style={{
        display:    'flex',
        alignItems: 'center',
        flexWrap:   'wrap',
        gap:        '4px',
        padding:    '6px 12px',
        background: t.card,
        borderBottom: `1px solid ${t.border}`,
      }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: t.muted, marginRight: '4px', letterSpacing: '0.06em' }}>
          INDICATORS
        </span>

        {/* MA toggle */}
        <PillBtn active={maOpen} onClick={() => setMaOpen((v) => !v)} isDark={isDark}>
          MA
        </PillBtn>

        {/* BB */}
        <PillBtn active={bbOn} onClick={() => setBbOn((v) => !v)} isDark={isDark}>
          BB
        </PillBtn>

        {/* RSI */}
        <PillBtn active={rsiOn} onClick={() => setRsiOn((v) => !v)} isDark={isDark}>
          RSI
        </PillBtn>

        {/* MACD */}
        <PillBtn active={macdOn} onClick={() => setMacdOn((v) => !v)} isDark={isDark}>
          MACD
        </PillBtn>

        {/* ATR */}
        <PillBtn active={atrOn} onClick={() => setAtrOn((v) => !v)} isDark={isDark}>
          ATR
        </PillBtn>

        {/* S/R — hidden when controlled from chart header via srVisibleProp */}
        {srVisibleProp === undefined && (
          <PillBtn active={srOn} onClick={() => setSrOn((v) => !v)} isDark={isDark}>
            S/R
          </PillBtn>
        )}
      </div>

      {/* ── MA sub-controls ───────────────────────────────────────────────── */}
      {maOpen && (
        <div style={{
          display:    'flex',
          alignItems: 'center',
          flexWrap:   'wrap',
          gap:        '12px',
          padding:    '6px 12px',
          background: t.bg,
          borderBottom: `1px solid ${t.border}`,
        }}>
          {mas.map((m) => (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Enabled toggle */}
              <PillBtn active={m.enabled} onClick={() => updateMa(m.key, 'enabled', !m.enabled)} isDark={isDark}>
                {m.label}
              </PillBtn>

              {/* Color picker */}
              <input
                type="color"
                value={m.color}
                onChange={(e) => updateMa(m.key, 'color', e.target.value)}
                title={`${m.label} color`}
                style={{
                  width:       '22px',
                  height:      '22px',
                  border:      `1px solid ${t.border}`,
                  borderRadius: '4px',
                  cursor:      'pointer',
                  padding:     '1px',
                  background:  t.card,
                }}
              />

              {/* Period input */}
              <input
                type="number"
                min={2}
                max={500}
                value={m.period}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val) && val >= 2) updateMa(m.key, 'period', val)
                }}
                style={{
                  width:       '48px',
                  padding:     '2px 4px',
                  fontSize:    '11px',
                  background:  t.card,
                  color:       t.text,
                  border:      `1px solid ${t.border}`,
                  borderRadius: '4px',
                  outline:     'none',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Sub-charts ───────────────────────────────────────────────────── */}

      {rsiOn && rsiData.length > 0 && (
        <SubChartWrap label={`RSI (14)`} isDark={isDark}>
          <ReactApexChart
            key={`rsi-${symbol}-${isDark}`}
            type="line"
            series={rsiSeries}
            options={rsiOptions}
            height={110}
          />
        </SubChartWrap>
      )}

      {macdOn && macdSeries.length > 0 && (
        <SubChartWrap label="MACD (12, 26, 9)" isDark={isDark}>
          <ReactApexChart
            key={`macd-${symbol}-${isDark}`}
            type="line"
            series={macdSeries}
            options={macdOptions}
            height={130}
          />
        </SubChartWrap>
      )}

      {atrOn && atrData.length > 0 && (
        <SubChartWrap label="ATR (14)" isDark={isDark}>
          <ReactApexChart
            key={`atr-${symbol}-${isDark}`}
            type="line"
            series={atrSeries}
            options={atrOptions}
            height={100}
          />
        </SubChartWrap>
      )}
    </div>
  )
}
