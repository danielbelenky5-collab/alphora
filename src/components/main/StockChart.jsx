import { useEffect, useRef } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
} from 'lightweight-charts'
import { useApp } from '../../contexts/AppContext'

const UP_COLOR   = '#26a65b'
const DOWN_COLOR = '#e53935'

export default function StockChart({ data, loading, symbol, period }) {
  const { theme, lang, t } = useApp()
  const containerRef = useRef(null)
  const chartRef     = useRef(null)
  const candleRef    = useRef(null)
  const volumeRef    = useRef(null)

  const isDark = theme === 'dark'

  function getColors() {
    return {
      bg:       isDark ? '#161b22' : '#ffffff',
      grid:     isDark ? '#21262d' : '#e8eaed',
      text:     isDark ? '#8b949e' : '#57606a',
      border:   isDark ? '#21262d' : '#d0d7de',
      crosshair:isDark ? '#555e68' : '#aab1ba',
    }
  }

  // Create chart once on mount
  useEffect(() => {
    if (!containerRef.current) return
    const C = getColors()

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: C.bg },
        textColor:  C.text,
        fontFamily: 'Inter, sans-serif',
        fontSize:   11,
      },
      grid: {
        vertLines: { color: C.grid },
        horzLines: { color: C.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: C.crosshair, width: 1, style: 1, labelBackgroundColor: '#3b6ff5' },
        horzLine: { color: C.crosshair, width: 1, style: 1, labelBackgroundColor: '#3b6ff5' },
      },
      rightPriceScale: {
        borderColor:   C.border,
        scaleMargins:  { top: 0.05, bottom: 0.22 },
      },
      timeScale: {
        borderColor:    C.border,
        timeVisible:    true,
        secondsVisible: false,
        barSpacing:     8,
        minBarSpacing:  3,
      },
      width:  containerRef.current.clientWidth,
      height: 460,
    })

    // ── Candlestick series (v5 API) ──────────────────────────────────────────
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:          UP_COLOR,
      downColor:        DOWN_COLOR,
      borderUpColor:    UP_COLOR,
      borderDownColor:  DOWN_COLOR,
      wickUpColor:      UP_COLOR,
      wickDownColor:    DOWN_COLOR,
      priceLineVisible: true,
      priceLineColor:   '#3b6ff5',
      priceLineWidth:   1,
      lastValueVisible: true,
    })

    // ── Volume series (v5 API) ───────────────────────────────────────────────
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat:  { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    })

    chartRef.current  = chart
    candleRef.current = candleSeries
    volumeRef.current = volumeSeries

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update theme colors
  useEffect(() => {
    if (!chartRef.current) return
    const C = getColors()
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: C.bg },
        textColor:  C.text,
      },
      grid: {
        vertLines: { color: C.grid },
        horzLines: { color: C.grid },
      },
      rightPriceScale: { borderColor: C.border },
      timeScale:       { borderColor: C.border },
      crosshair: {
        vertLine: { color: C.crosshair },
        horzLine: { color: C.crosshair },
      },
    })
  }, [theme]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update data
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current || !data || data.length === 0) return

    let chartData = [...data]
    if (period === 'Hour') {
      const cutoff = Math.floor(Date.now() / 1000) - 3600
      chartData = chartData.filter(d => d.time >= cutoff)
    }

    const candles = chartData.map(d => ({
      time:  d.time,
      open:  d.open  ?? d.close,
      high:  d.high  ?? d.close,
      low:   d.low   ?? d.close,
      close: d.close,
    }))

    const volumes = chartData.map(d => ({
      time:  d.time,
      value: d.volume ?? 0,
      color: (d.close >= (d.open ?? d.close))
        ? 'rgba(38,166,91,0.55)'
        : 'rgba(229,57,53,0.55)',
    }))

    candleRef.current.setData(candles)
    volumeRef.current.setData(volumes)
    chartRef.current?.timeScale().fitContent()
  }, [data, period])

  if (loading) {
    return (
      <div className="w-full h-[460px] card flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-heebo" style={{ color: 'var(--tx-muted)' }}>
            {t('loadingChart')}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-surface-border">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold font-inter" style={{ color: 'var(--tx-primary)' }}>
            {symbol}
          </span>
          <span className="text-sm font-heebo" style={{ color: 'var(--tx-muted)' }}>
            {t('priceChart')}
          </span>
        </div>
        {/* Candle legend */}
        <div className="flex items-center gap-4 text-xs font-inter" style={{ color: 'var(--tx-muted)' }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: UP_COLOR }} />
            {lang === 'he' ? 'עלייה' : 'Bullish'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: DOWN_COLOR }} />
            {lang === 'he' ? 'ירידה' : 'Bearish'}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="w-full" />
    </div>
  )
}
