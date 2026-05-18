import { useMemo } from 'react'
import ReactApexChart from 'react-apexcharts'
import { useQuery } from '@tanstack/react-query'
import client from '../../api/client'

function calcPnl(pos) {
  if (pos.sellPrice == null || !pos.buyPrice || !pos.quantity) return null
  return pos.direction === 'long'
    ? (pos.sellPrice - pos.buyPrice) * pos.quantity
    : (pos.buyPrice  - pos.sellPrice) * pos.quantity
}

/**
 * Compares the user's realized cumulative P&L (as % of total cost basis)
 * against SPY's % return for the selected year.
 */
export default function PortfolioVsSpyChart({ positions, year, isDark, isHe }) {
  const C = {
    bg:    isDark?'#0d1117':'#f6f8fa',
    card:  isDark?'#161b22':'#ffffff',
    border:isDark?'#30363d':'#d0d7de',
    text:  isDark?'#e6edf3':'#1c2128',
    muted: isDark?'#8b949e':'#57606a',
  }

  // Fetch SPY history
  const { data: spy } = useQuery({
    queryKey: ['portfolio-vs-spy', year],
    queryFn:  () => client.get('/history/SPY?period=Day'),
    staleTime: 600000,
  })

  // Build chart data
  const { portfolioSeries, spySeries, totalAlpha, hasData } = useMemo(() => {
    const yearStart = new Date(`${year}-01-01`).getTime()
    const yearEnd   = new Date(`${year+1}-01-01`).getTime()

    // Filter positions closed in this year
    const closed = positions
      .filter(p => p.sellPrice != null && p.sellDate)
      .filter(p => {
        const t = new Date(p.sellDate).getTime()
        return t >= yearStart && t < yearEnd
      })
      .sort((a,b) => a.sellDate.localeCompare(b.sellDate))

    // Total cost basis used as the denominator for portfolio % return
    const yearOpened = positions.filter(p => {
      const t = new Date(p.buyDate).getTime()
      return t >= yearStart && t < yearEnd
    })
    const totalCost = yearOpened.reduce((s,p) => s + (p.buyPrice * p.quantity), 0)

    // Build cumulative P&L points
    let cumulativePnl = 0
    const portfolioPoints = []
    if (totalCost > 0) {
      portfolioPoints.push({ x: yearStart, y: 0 })
      for (const p of closed) {
        const pnl = calcPnl(p)
        if (pnl == null) continue
        cumulativePnl += pnl
        const pct = (cumulativePnl / totalCost) * 100
        portfolioPoints.push({ x: new Date(p.sellDate).getTime(), y: +pct.toFixed(2) })
      }
    }

    // Build SPY % series
    const spyData = spy?.data || []
    const yearStartSec = Math.floor(yearStart / 1000)
    const yearEndSec   = Math.floor(yearEnd   / 1000)
    const spyInYear = spyData.filter(d => d.time >= yearStartSec && d.time < yearEndSec)
    const spyBaseline = spyInYear[0]?.close
    const spyPoints = spyBaseline
      ? spyInYear.map(d => ({ x: d.time * 1000, y: +(((d.close - spyBaseline) / spyBaseline) * 100).toFixed(2) }))
      : []

    const lastPortfolio = portfolioPoints.length ? portfolioPoints[portfolioPoints.length-1].y : 0
    const lastSpy       = spyPoints.length       ? spyPoints[spyPoints.length-1].y : 0
    const alpha = lastPortfolio - lastSpy

    return {
      portfolioSeries: portfolioPoints,
      spySeries:       spyPoints,
      totalAlpha:      alpha,
      hasData:         portfolioPoints.length > 1 && spyPoints.length > 1,
    }
  }, [positions, year, spy])

  if (!hasData) return null

  const options = {
    chart: { type:'line', background:'transparent', toolbar:{show:false}, animations:{enabled:false}, zoom:{enabled:false} },
    theme: { mode: isDark?'dark':'light' },
    stroke:{ curve:'straight', width:[2.5, 2] },
    colors:['#3b6ff5', '#8b949e'],
    dataLabels:{ enabled:false },
    legend: { show:true, position:'top', horizontalAlign:'right', labels:{ colors:C.muted }, fontFamily:'Inter,sans-serif', fontSize:'12px' },
    xaxis:  { type:'datetime', labels:{ style:{colors:C.muted, fontSize:'10px', fontFamily:'Inter,sans-serif'} }, axisBorder:{color:C.border}, axisTicks:{color:C.border} },
    yaxis:  { labels:{ formatter:v => (v>=0?'+':'')+v.toFixed(1)+'%', style:{colors:C.muted, fontSize:'10px', fontFamily:'Inter,sans-serif'} } },
    grid:   { borderColor:C.border, strokeDashArray:3 },
    tooltip:{ x:{format:'dd MMM yyyy'}, y:{formatter:v => (v>=0?'+':'')+v.toFixed(2)+'%'} },
    markers:{ size:[4, 0], strokeWidth:0 },
  }

  const series = [
    { name: isHe?'התיק שלי':'My Portfolio', data: portfolioSeries },
    { name: 'S&P 500 (SPY)',                data: spySeries       },
  ]

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px', marginBottom:'8px' }}>
        <div style={{ fontSize:'11px', fontWeight:700, color:C.muted, fontFamily:'Inter,sans-serif', textTransform:'uppercase', letterSpacing:'0.05em' }}>
          {isHe?'📈 תיק מול S&P 500':'📈 Portfolio vs S&P 500'}
        </div>
        <div style={{ fontSize:'13px', fontWeight:700, fontFamily:'Inter,sans-serif',
            color: totalAlpha >= 0 ? '#26a65b' : '#DC2626' }}>
          {totalAlpha >= 0 ? '▲ +' : '▼ '}{totalAlpha.toFixed(2)}%
          <span style={{ fontSize:'11px', fontWeight:500, color:C.muted, marginLeft:'6px' }}>
            {isHe ? (totalAlpha>=0?'מעל':'מתחת ל') + '-S&P' : (totalAlpha>=0?'above':'below')+' S&P'}
          </span>
        </div>
      </div>
      <ReactApexChart type="line" series={series} options={options} height={260} />
    </div>
  )
}
