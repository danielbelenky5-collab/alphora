/**
 * Lightweight SVG sparkline — no external deps.
 * Renders a mini price line chart like Finviz market tiles.
 */
export default function SparklineChart({ prices = [], isPositive, width = 120, height = 40 }) {
  if (!prices || prices.length < 2) {
    return <div style={{ width, height }} className="opacity-20 bg-surface-border rounded" />
  }

  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1

  const pad = 2
  const w = width  - pad * 2
  const h = height - pad * 2

  const points = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * w
    const y = pad + h - ((p - min) / range) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  // Area fill polygon
  const firstX = pad
  const lastX  = pad + w
  const baseY  = pad + h
  const areaPoints = `${firstX},${baseY} ${points} ${lastX},${baseY}`

  const color = isPositive ? '#34d399' : '#f87171' // emerald-400 / red-400

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      className="overflow-visible"
    >
      {/* Area fill */}
      <polygon
        points={areaPoints}
        fill={color}
        opacity="0.12"
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
