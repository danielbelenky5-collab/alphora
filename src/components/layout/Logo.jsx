import { Link } from 'react-router-dom'

// ── ALPHORA Logo ──────────────────────────────────────────────────────────────
// Uses the original brand image as-is (no SVG recreation, no edits).
// File served from /public/alphora-logo.png by Vite at /alphora-logo.png

const LOGO_SRC = '/alphora-logo.png'

// Native image aspect ratio is 3468 × 906 ≈ 3.83:1
// Heights below are display sizes; width auto-scales by aspect ratio.
const SIZES = {
  sm: 32,   // top bar on inner pages — small
  md: 48,   // mid
  lg: 150,  // landing page — large, exactly as the image
}

export default function Logo({ size = 'md', linkTo = '/' }) {
  const height = SIZES[size] || SIZES.md

  const img = (
    <img
      src={LOGO_SRC}
      alt="ALPHORA"
      style={{
        height: `${height}px`,
        width:  'auto',
        display: 'block',
        userSelect: 'none',
      }}
      draggable={false}
    />
  )

  if (!linkTo) return img
  return (
    <Link to={linkTo} style={{ display: 'inline-flex', textDecoration: 'none' }}>
      {img}
    </Link>
  )
}
