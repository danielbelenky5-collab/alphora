import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'

// ── Prevent server crashes from unhandled errors ──────────────────────────────
process.on('uncaughtException',  err => console.error('[uncaughtException]',  err.message))
process.on('unhandledRejection', err => console.error('[unhandledRejection]', err?.message ?? err))

import quotesRouter      from './routes/quotes.js'
import historyRouter     from './routes/history.js'
import searchRouter      from './routes/search.js'
import fundamentalsRouter from './routes/fundamentals.js'
import calendarRouter    from './routes/calendar.js'
import translateRouter   from './routes/translate.js'
import newsRouter        from './routes/news.js'
import authRouter        from './routes/auth.js'
import econCalendarRouter   from './routes/econCalendar.js'
import earningsRouter       from './routes/earningsReports.js'
import screenerRouter       from './routes/screener.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

// ── FIX 1: Security headers (replaces helmet) ────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:")
  next()
})

// ── FIX 2: CORS — restrict to localhost only ─────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5173',
]
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    cb(new Error(`CORS blocked: ${origin}`))
  },
  credentials: false,
}))

// ── FIX 3: Rate limiter (no external package) ────────────────────────────────
// Tracks: { ip+route -> [timestamps] }
const _rateMap = new Map()
function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, message = 'Too many requests' } = {}) {
  return (req, res, next) => {
    const key  = `${req.ip}:${req.path}`
    const now  = Date.now()
    const hits = (_rateMap.get(key) || []).filter(t => now - t < windowMs)
    hits.push(now)
    _rateMap.set(key, hits)
    if (hits.length > max) {
      return res.status(429).json({ error: message, retryAfter: Math.ceil(windowMs / 1000) })
    }
    next()
  }
}
// Clean up old entries every 5 min to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [k, hits] of _rateMap) {
    if (hits.every(t => now - t > 15 * 60 * 1000)) _rateMap.delete(k)
  }
}, 5 * 60 * 1000)

// Apply strict rate limit on auth endpoints
const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts, try again in 15 minutes' })

app.use(express.json({ limit: '1mb' }))

app.use('/api/quotes',       quotesRouter)
app.use('/api/history',      historyRouter)   // symbol validation inside router
app.use('/api/search',       searchRouter)
app.use('/api/fundamentals', fundamentalsRouter)  // symbol validation inside router
app.use('/api/calendar',     calendarRouter)      // exchange validation inside router
app.use('/api/translate',    translateRouter)
app.use('/api/news',         newsRouter)
app.use('/api/auth',         authRateLimit, authRouter)   // rate limited
app.use('/api/econ-calendar',    econCalendarRouter)
app.use('/api/earnings-reports', earningsRouter)
app.use('/api/screener',         screenerRouter)

app.get('/api/health', (req, res) => res.json({ ok: true }))

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')))
  app.get('*', (req, res) =>
    res.sendFile(path.join(__dirname, '../dist/index.html'))
  )
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
