/**
 * Export portfolio positions to CSV file.
 * Adds a UTF-8 BOM so Hebrew text opens correctly in Excel.
 */
export function exportPositionsCsv(positions, year = null) {
  const rows = year
    ? positions.filter(p => p.buyDate.startsWith(String(year)))
    : positions

  const headers = [
    'Buy Date', 'Sell Date', 'Symbol', 'Direction', 'Quantity',
    'Buy Price', 'Sell Price', 'Total Cost', 'P&L', 'Holding Days',
    'Stop Loss', 'Target Price', 'Notes',
  ]

  const calcPnl = (p) => {
    if (p.sellPrice == null || !p.buyPrice || !p.quantity) return ''
    const v = p.direction === 'long'
      ? (p.sellPrice - p.buyPrice) * p.quantity
      : (p.buyPrice - p.sellPrice) * p.quantity
    return v.toFixed(2)
  }

  const holdingDays = (p) => {
    if (!p.sellDate) return ''
    const diff = new Date(p.sellDate) - new Date(p.buyDate)
    return Math.max(0, Math.round(diff / 86400000))
  }

  const lines = [
    headers.join(','),
    ...rows.map(p => [
      p.buyDate                            || '',
      p.sellDate                           || '',
      p.symbol                             || '',
      p.direction                          || '',
      p.quantity                           || '',
      p.buyPrice  != null ? p.buyPrice.toFixed(2)  : '',
      p.sellPrice != null ? p.sellPrice.toFixed(2) : '',
      (p.buyPrice && p.quantity) ? (p.buyPrice * p.quantity).toFixed(2) : '',
      calcPnl(p),
      holdingDays(p),
      p.stopLoss    != null ? p.stopLoss.toFixed(2)    : '',
      p.targetPrice != null ? p.targetPrice.toFixed(2) : '',
      // Wrap notes in quotes and escape any internal quotes
      p.notes ? `"${String(p.notes).replace(/"/g, '""')}"` : '',
    ].join(','))
  ]

  // UTF-8 BOM + content
  const bom     = '\uFEFF'
  const content = bom + lines.join('\r\n')
  const blob    = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url     = URL.createObjectURL(blob)
  const anchor  = document.createElement('a')
  const date    = new Date().toISOString().slice(0, 10)
  const suffix  = year ? `-${year}` : ''
  anchor.href     = url
  anchor.download = `alphora-trades${suffix}-${date}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}
