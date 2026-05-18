import { Router } from 'express'
import NodeCache from 'node-cache'
import { execFile } from 'child_process'

const router = Router()
const cache  = new NodeCache({ stdTTL: 1800 }) // 30 min

const CURL_EXE = process.platform === 'win32'
  ? 'C:\\Windows\\System32\\curl.exe'
  : 'curl'

function curlGet(url, timeoutSec = 20) {
  return new Promise((resolve, reject) => {
    execFile(
      CURL_EXE,
      [
        '-sS', '--max-time', String(timeoutSec),
        '--retry', '2', '--retry-delay', '1',
        '-L',
        '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        '-H', 'Accept: application/json, text/plain, */*',
        '-H', 'Origin: https://www.nasdaq.com',
        '-H', 'Referer: https://www.nasdaq.com/market-activity/earnings',
        url,
      ],
      { timeout: (timeoutSec + 5) * 1000 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`curl failed: ${err.message.slice(0, 120)}`))
        const text = (stdout || '').trim()
        if (!text) return reject(new Error('empty response from NASDAQ'))
        resolve(text)
      }
    )
  })
}

// Parse "$3.09" / "-$0.50" / "N/A" → number or null
function parseEps(str) {
  if (!str || str === 'N/A' || str === '--' || str === '') return null
  const n = parseFloat(str.replace(/[$, ]/g, ''))
  return isNaN(n) ? null : n
}

// Parse "$621,442,323,935" → number
function parseMktCap(str) {
  if (!str) return 0
  const n = parseFloat(str.replace(/[$,]/g, ''))
  return isNaN(n) ? 0 : n
}

// "time-pre-market" → BMO, "time-after-hours" → AMC, else → TNS
function parseTiming(t) {
  if (!t) return 'TNS'
  if (t.includes('pre'))   return 'BMO'
  if (t.includes('after')) return 'AMC'
  return 'TNS'
}

function todayET() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

function getWeekDays(dateStr) {
  const d   = new Date(dateStr + 'T12:00:00Z')
  const dow = d.getUTCDay()
  const off = dow === 0 ? -6 : 1 - dow
  const mon = new Date(d)
  mon.setUTCDate(d.getUTCDate() + off)
  return Array.from({ length: 5 }, (_, i) => {
    const day = new Date(mon)
    day.setUTCDate(mon.getUTCDate() + i)
    return day.toISOString().slice(0, 10)
  })
}

async function fetchDay(dateStr) {
  const url = `https://api.nasdaq.com/api/calendar/earnings?date=${dateStr}`
  try {
    const text = await curlGet(url)
    const json = JSON.parse(text)
    const rows = json?.data?.rows
    if (!Array.isArray(rows)) return []
    return rows
  } catch (e) {
    console.warn(`[earningsReports] fetchDay(${dateStr}) failed:`, e.message.slice(0, 120))
    return []
  }
}

function buildDayObject(dateStr, rows) {
  const BMO = [], AMC = [], TNS = []

  for (const row of rows) {
    const timing      = parseTiming(row.time)
    const epsEstimate = parseEps(row.epsForecast)
    const epsActual   = parseEps(row.eps)       // only for past dates
    const surprise    = row.surprise != null ? parseFloat(row.surprise) : null
    const reported    = epsActual !== null
    const epsDiff     = (reported && epsEstimate !== null)
      ? parseFloat((epsActual - epsEstimate).toFixed(4))
      : null

    const entry = {
      symbol:      (row.symbol  || '').trim(),
      name:        (row.name    || row.symbol || '').trim(),
      timing,
      reported,
      epsEstimate,
      epsActual,
      epsDiff,
      surprisePct: (surprise !== null && !isNaN(surprise)) ? surprise : null,
      marketCap:   parseMktCap(row.marketCap),
      quarter:     row.fiscalQuarterEnding || null,
    }

    if (timing === 'BMO') BMO.push(entry)
    else if (timing === 'AMC') AMC.push(entry)
    else TNS.push(entry)
  }

  // Sort each group: largest market cap first
  const byMktCap = (a, b) => (b.marketCap || 0) - (a.marketCap || 0)
  BMO.sort(byMktCap); AMC.sort(byMktCap); TNS.sort(byMktCap)

  return { date: dateStr, BMO, AMC, TNS }
}

router.get('/', async (req, res) => {
  try {
    const today    = todayET()
    const weekDays = getWeekDays(req.query.week || today)
    const mon      = weekDays[0]

    const cacheKey = `earnings:${mon}`
    const cached   = cache.get(cacheKey)
    if (cached) return res.json(cached)

    // Fetch all 5 days in parallel — individual failures return []
    const dayResults = await Promise.all(weekDays.map(d => fetchDay(d)))

    const days = weekDays
      .map((dateStr, i) => buildDayObject(dateStr, dayResults[i]))
      .filter(d => d.BMO.length + d.AMC.length + d.TNS.length > 0)

    const result = { weekStart: mon, days }

    // Only cache if we got at least some data
    if (days.length > 0) cache.set(cacheKey, result)

    res.json(result)
  } catch (err) {
    console.error('[earningsReports] route error:', err.message)
    res.status(500).json({ error: 'Failed to load earnings reports. Please try again.' })
  }
})

export default router
