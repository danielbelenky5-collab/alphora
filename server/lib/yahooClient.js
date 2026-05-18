/**
 * Yahoo Finance API client using only endpoints that work without authentication.
 * - Quotes: v8/finance/chart (meta field) — no auth required
 * - History: v8/finance/chart — no auth required
 * - Search:  v1/finance/search — no auth required
 * - Fundamentals: v11/finance/quoteSummary — no auth required (most modules)
 */
import axios from 'axios'
import NodeCache from 'node-cache'
import https from 'https'
import { execFile } from 'child_process'
import os from 'os'
import path from 'path'

const cache = new NodeCache({ stdTTL: 15 })

const CURL_EXE = process.platform === 'win32'
  ? 'C:\\Windows\\System32\\curl.exe'
  : 'curl'

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
}

// ── Crumb / session management ────────────────────────────────────────────────
let _crumb   = null
let _cookies = ''
let _crumbTs = 0
const CRUMB_TTL  = 2 * 60 * 60 * 1000  // 2 hours — crumbs are valid for a long time
const COOKIE_SRC     = 'https://fc.yahoo.com'
const CRUMB_PAGE_URL = 'https://finance.yahoo.com/quote/AAPL/'  // crumb scraped from page HTML

let _sessionPending  = null
let _nextRetryAfter  = 0   // don't reattempt before this timestamp
const SESSION_BACKOFF = 60_000  // wait 60s between failed attempts

export async function warmSession() { return getSession() }

async function getSession() {
  if (_crumb && Date.now() - _crumbTs < CRUMB_TTL) return { crumb: _crumb, cookies: _cookies }
  if (Date.now() < _nextRetryAfter) return { crumb: _crumb, cookies: _cookies }  // still in backoff
  // Deduplicate concurrent session refreshes
  if (_sessionPending) return _sessionPending
  _sessionPending = _doGetSession().finally(() => { _sessionPending = null })
  return _sessionPending
}

// Yahoo uses TLS fingerprinting (JA3/JA4) — Node's OpenSSL gets flagged with 429
// while system curl (Schannel on Windows) passes through. Use curl as the
// crumb-fetching subprocess only; everything else still uses axios.
function curlGet(url, { cookieJar, saveCookies = false, ua = YF_HEADERS['User-Agent'] } = {}) {
  return new Promise((resolve, reject) => {
    const args = ['-sS', '--max-time', '15', '-A', ua, '-L']
    if (cookieJar)   args.push('-b', cookieJar)
    if (saveCookies) args.push('-c', cookieJar)
    args.push(url)
    execFile(CURL_EXE, args, { timeout: 20000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`curl: ${err.message} | ${stderr?.slice(0,80)}`))
      resolve(stdout || '')
    })
  })
}

async function _fetchCrumbInline() {
  // Use a per-process cookie jar in the OS temp dir
  const cookieJar = path.join(os.tmpdir(), `yf-cookies-${process.pid}.txt`)

  // Step 1: hit fc.yahoo.com to populate cookie jar (returns 404, but sets cookies)
  await curlGet('https://fc.yahoo.com', { cookieJar, saveCookies: true })

  // Step 2: fetch crumb using cookies — try query2 first then query1
  for (const host of ['query2', 'query1']) {
    try {
      const out = await curlGet(`https://${host}.finance.yahoo.com/v1/test/getcrumb`, { cookieJar })
      const crumb = String(out || '').trim()
      if (crumb && crumb.length > 4 && crumb.length < 32 && !crumb.includes('<')) {
        // Read the cookie jar so we can pass cookies to subsequent axios calls
        const fs = await import('fs/promises')
        let cookies = ''
        try {
          const jar = await fs.readFile(cookieJar, 'utf8')
          // Netscape cookie format: domain  flag  path  secure  expiry  name  value
          cookies = jar.split('\n')
            .filter(l => l && !l.startsWith('#'))
            .map(l => l.split('\t'))
            .filter(p => p.length >= 7)
            .map(p => `${p[5]}=${p[6]}`)
            .join('; ')
        } catch {}
        return { crumb, cookies }
      }
    } catch (err) {
      console.warn(`getcrumb ${host} failed:`, err.message.slice(0, 100))
    }
  }
  throw new Error('crumb not found')
}

async function _doGetSession() {
  const delays = [0, 5000, 15000]
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) await new Promise(r => setTimeout(r, delays[attempt]))
    try {
      const { crumb, cookies } = await _fetchCrumbInline()
      _crumb   = crumb
      _cookies = cookies
      _crumbTs = Date.now()
      console.log('✓ YF session ready, crumb:', _crumb)
      return { crumb: _crumb, cookies: _cookies }
    } catch (e) {
      console.warn(`getSession attempt ${attempt + 1} failed:`, e.message.slice(0, 80))
    }
  }
  _nextRetryAfter = Date.now() + SESSION_BACKOFF
  console.warn(`getSession: all attempts exhausted, backing off ${SESSION_BACKOFF / 1000}s`)
  _crumb = null
  return { crumb: null, cookies: _cookies }
}

async function chartGet(symbol, params) {
  // Use curl — Node's TLS fingerprint gets 429 from Yahoo
  const qs  = new URLSearchParams(params).toString()
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${qs}`
  const cookieJar = path.join(os.tmpdir(), `yf-cookies-${process.pid}.txt`)
  const out  = await curlGet(url, { cookieJar })
  const json = JSON.parse(out)
  return json?.chart?.result?.[0]
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Derive marketState from the meta's currentTradingPeriod timestamps.
 * Yahoo's chart API often returns marketState=null even during trading hours,
 * so we compute it ourselves from the known session windows.
 */
function deriveMarketState(meta) {
  const now = Math.floor(Date.now() / 1000)
  const ctp = meta?.currentTradingPeriod
  if (!ctp) return 'CLOSED'

  const pre  = ctp.pre  || {}
  const reg  = ctp.regular || {}
  const post = ctp.post || {}

  if (reg.start && reg.end && now >= reg.start && now < reg.end)   return 'REGULAR'
  if (pre.start  && pre.end  && now >= pre.start  && now < pre.end)  return 'PRE'
  if (post.start && post.end && now >= post.start && now < post.end) return 'POST'
  return 'CLOSED'
}

export async function getQuotes(symbols) {
  // Cache PER-SYMBOL so results are shared across different callers
  const QUOTE_TTL = 5   // seconds — short TTL = near real-time during market hours

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      const cacheKey = `quote:${symbol}`
      const cached = cache.get(cacheKey)
      if (cached) return cached

      try {
        // includePrePost=true → get the very latest tick (pre/post market included)
        const result = await chartGet(symbol, { interval: '1m', range: '1d', includePrePost: 'true' })
        const meta = result?.meta || {}

        const price = meta.regularMarketPrice
        const prev  = meta.previousClose ?? meta.chartPreviousClose

        // Compute change from official previous close (same method as Yahoo Finance website)
        const change    = (price != null && prev != null) ? price - prev : null
        const changePct = (price != null && prev != null) ? ((price - prev) / prev) * 100 : null

        // Derive accurate market state from trading period windows
        const marketState = deriveMarketState(meta)

        const quote = {
          symbol,
          regularMarketPrice:         price,
          regularMarketChange:        change,
          regularMarketChangePercent: changePct,
          regularMarketPreviousClose: prev,
          regularMarketDayHigh:       meta.regularMarketDayHigh,
          regularMarketDayLow:        meta.regularMarketDayLow,
          regularMarketVolume:        meta.regularMarketVolume,
          regularMarketTime:          meta.regularMarketTime,
          shortName:  meta.shortName  || symbol,
          longName:   meta.longName   || meta.shortName || symbol,
          currency:   meta.currency,
          marketState,
          tradeable:  meta.tradeable !== false,
        }

        cache.set(cacheKey, quote, QUOTE_TTL)
        return quote
      } catch (err) {
        console.warn(`Quote error for ${symbol}:`, err.message)
        return { symbol, regularMarketPrice: null, marketState: 'CLOSED' }
      }
    })
  )

  return results
}

export async function getHistory(symbol, { interval, range, includePrePost = false }) {
  const key = `history:${symbol}:${interval}:${range}:${includePrePost}`
  // Use shorter TTL for intraday data so sparklines stay fresh
  const ttl = interval === '5m' ? 10 : undefined
  const cached = cache.get(key)
  if (cached) return cached

  const result = await chartGet(symbol, { interval, range, includePrePost: includePrePost ? 'true' : 'false' })
  const timestamps = result?.timestamp || []
  const ohlcv = result?.indicators?.quote?.[0] || {}

  const quotes = timestamps.map((t, i) => ({
    date:   new Date(t * 1000).toISOString(),
    open:   ohlcv.open?.[i],
    high:   ohlcv.high?.[i],
    low:    ohlcv.low?.[i],
    close:  ohlcv.close?.[i],
    volume: ohlcv.volume?.[i],
  })).filter(q => q.close != null)

  const chartResult = { quotes }
  cache.set(key, chartResult, ttl ?? 60)
  return chartResult
}

export async function searchSymbol(query) {
  const key = `search:${query}`
  const cached = cache.get(key)
  if (cached) return cached

  const cookieJar = path.join(os.tmpdir(), `yf-cookies-${process.pid}.txt`)
  const qs  = new URLSearchParams({ q: query, quotesCount: '8', newsCount: '0', listsCount: '0' }).toString()
  const url = `https://query2.finance.yahoo.com/v1/finance/search?${qs}`
  const out  = await curlGet(url, { cookieJar })
  let json
  try { json = JSON.parse(out) } catch { json = {} }

  const results = json?.quotes || []
  const filtered = results
    .filter(item => ['EQUITY', 'ETF', 'CRYPTOCURRENCY', 'INDEX'].includes(item.quoteType))
    .map(item => ({
      symbol:    item.symbol,
      name:      item.shortname || item.longname || item.symbol,
      exchange:  item.exchDisp || item.exchange || '',
      quoteType: item.quoteType,
    }))

  cache.set(key, filtered, 300)
  return filtered
}

// ── Batch market-cap lookup via quoteSummary price module ─────────────────────
// Returns a map { symbol → marketCap } for a list of symbols.
// Reuses the same crumb + cookieJar used by getFundamentals.
export async function getMarketCaps(symbols) {
  if (!symbols.length) return {}

  // Check individual caches first
  const result = {}
  const missing = []
  for (const sym of symbols) {
    const v = cache.get(`mcap:${sym}`)
    if (v !== undefined) result[sym] = v
    else missing.push(sym)
  }
  if (!missing.length) return result

  let crumb = null
  try { crumb = (await getSession()).crumb } catch {}
  if (!crumb) return result

  const cookieJar = path.join(os.tmpdir(), `yf-cookies-${process.pid}.txt`)

  // Parallel lightweight quoteSummary calls (price module only)
  await Promise.all(missing.map(async sym => {
    try {
      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=price&crumb=${encodeURIComponent(crumb)}`
      const out  = await curlGet(url, { cookieJar })
      const json = JSON.parse(out)
      const mc   = json?.quoteSummary?.result?.[0]?.price?.marketCap?.raw ?? null
      cache.set(`mcap:${sym}`, mc, 300)
      result[sym] = mc
    } catch {
      result[sym] = null
    }
  }))

  return result
}

// ── Predefined screener ───────────────────────────────────────────────────────
export async function getScreener(scrId = 'day_gainers', count = 25) {
  const cacheKey = `screener:${scrId}:${count}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const cookieJar = path.join(os.tmpdir(), `yf-cookies-${process.pid}.txt`)

  // Try to get crumb for authenticated request
  let crumb = null
  try {
    const session = await getSession()
    crumb = session.crumb
  } catch {}

  const qs = new URLSearchParams({
    formatted: 'true',
    lang:      'en-US',
    region:    'US',
    scrIds:    scrId,
    count:     String(count),
    ...(crumb ? { crumb } : {}),
  }).toString()

  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?${qs}`
  const out = await curlGet(url, { cookieJar })

  let json
  try { json = JSON.parse(out) } catch { json = {} }

  const raw = json?.finance?.result?.[0]?.quotes || []
  const results = raw.map(q => ({
    symbol:    q.symbol,
    name:      q.shortName || q.longName || q.symbol,
    price:     q.regularMarketPrice?.raw   ?? q.regularMarketPrice   ?? null,
    change:    q.regularMarketChange?.raw  ?? q.regularMarketChange  ?? null,
    changePct: q.regularMarketChangePercent?.raw ?? q.regularMarketChangePercent ?? null,
    volume:    q.regularMarketVolume?.raw  ?? q.regularMarketVolume  ?? null,
    marketCap: q.marketCap?.raw            ?? q.marketCap            ?? null,
    pe:        q.trailingPE?.raw           ?? q.trailingPE           ?? null,
    sector:    q.sector || null,
  }))

  cache.set(cacheKey, results, 300)  // 5 min cache
  return results
}

// ── Timeseries (no auth required) ────────────────────────────────────────────
// Maps: [YF timeseries type suffix, field name used in reshaped result]
const TS_MAP = [
  ['TotalRevenue',                       'totalRevenue'],
  ['CostOfRevenue',                      'costOfRevenue'],
  ['GrossProfit',                        'grossProfit'],
  ['OperatingExpense',                   'totalOperatingExpenses'],
  ['OperatingIncome',                    'operatingIncome'],
  ['NetNonOperatingInterestIncomeExpense','netNonOperatingInterestIncomeExpense'],
  ['OtherIncomeExpense',                 'totalOtherIncomeExpenseNet'],
  ['PretaxIncome',                       'incomeBeforeTax'],
  ['TaxProvision',                       'incomeTaxExpense'],
  ['NetIncomeCommonStockholders',        'netIncomeApplicableToCommonShares'],
  ['BasicEPS',                           'basicEPS'],
  ['DilutedEPS',                         'dilutedEPS'],
  ['BasicAverageShares',                 'basicAverageShares'],
  ['DilutedAverageShares',               'dilutedAverageShares'],
  ['TotalOperatingIncomeAsReported',     'totalOperatingIncomeAsReported'],
  ['RentExpenseSupplemental',            'rentExpenseSupplemental'],
  ['TotalExpenses',                      'totalExpenses'],
  ['NormalizedIncome',                   'normalizedIncome'],
  ['InterestIncome',                     'interestIncome'],
  ['InterestExpense',                    'interestExpense'],
  ['NetInterestIncome',                  'netInterestIncome'],
  ['EBIT',                               'ebit'],
  ['EBITDA',                             'ebitda'],
  ['ReconciledCostOfRevenue',            'reconciledCostOfRevenue'],
  ['ReconciledDepreciation',             'reconciledDepreciation'],
  ['NetIncomeFromContinuingOperations',  'netIncomeFromContinuingOps'],
  ['TotalUnusualItemsExcludingGoodwill', 'totalUnusualItemsExcludingGoodwill'],
  ['TotalUnusualItems',                  'totalUnusualItems'],
  ['NormalizedEBITDA',                   'normalizedEBITDA'],
  ['TaxRateForCalcs',                    'taxRateForCalcs'],
  ['TaxEffectOfUnusualItems',            'taxEffectOfUnusualItems'],
  ['NetIncomeContinuousOperations',               'netIncomeContinuousOperations'],
  ['NetIncome',                                   'netIncome'],
  ['DilutedNIAvailableToCommonShareholders',      'dilutedNIAvailableToCommonShareholders'],
]

// Balance sheet timeseries fields
const TS_MAP_BALANCE = [
  ['TotalDebt',                           'totalDebt'],
  ['TotalAssets',                         'totalAssets'],
  ['CommonStockEquity',                   'commonStockEquity'],
  ['TotalLiabilitiesNetMinorityInterest', 'totalLiabilities'],
  ['CurrentAssets',                       'currentAssets'],
  ['CurrentLiabilities',                  'currentLiabilities'],
]

// Cash flow timeseries fields
const TS_MAP_CASHFLOW = [
  ['FreeCashFlow',       'freeCashFlow'],
  ['OperatingCashFlow',  'operatingCashFlow'],
  ['CapitalExpenditure', 'capitalExpenditure'],
]

async function fetchTimeseries(symbol) {
  const allMaps = [...TS_MAP, ...TS_MAP_BALANCE, ...TS_MAP_CASHFLOW]
  const types = allMaps.flatMap(([t]) => [`annual${t}`, `quarterly${t}`]).join(',')
  const period1 = Math.floor(Date.now() / 1000) - 10 * 365 * 24 * 3600  // 10 years back
  const period2 = Math.floor(Date.now() / 1000)
  const url = `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?type=${types}&period1=${period1}&period2=${period2}`
  try {
    const out  = await curlGet(url, {})
    const json = JSON.parse(out)
    return json?.timeseries?.result || []
  } catch (e) {
    console.warn('timeseries fetch failed:', e.message.slice(0, 80))
    return []
  }
}

// Generic reshaper — works for any field map
function reshapeTimeseriesCustom(results, prefix, map) {
  const byDate = {}
  for (const [typeSuffix, key] of map) {
    const tsType = `${prefix}${typeSuffix}`
    const item = results.find(r => Array.isArray(r[tsType]))
    if (!item) continue
    for (const v of item[tsType]) {
      if (!v?.asOfDate) continue
      if (!byDate[v.asOfDate]) byDate[v.asOfDate] = { _asOfDate: v.asOfDate }
      byDate[v.asOfDate][key] = { raw: v.reportedValue?.raw ?? null }
    }
  }
  return Object.values(byDate)
    .sort((a, b) => b._asOfDate.localeCompare(a._asOfDate))
    .map(item => {
      const ts = Math.floor(new Date(item._asOfDate).getTime() / 1000)
      return { endDate: { raw: ts, fmt: item._asOfDate }, ...item }
    })
}

function reshapeTimeseries(results, prefix) {
  // timeseries result structure: [{ meta: { type: ['annualTotalRevenue'] }, annualTotalRevenue: [...], ... }]
  // The type name IS the key on the result object itself.
  const byDate = {}
  for (const [typeSuffix, key] of TS_MAP) {
    const tsType = `${prefix}${typeSuffix}`
    const item = results.find(r => Array.isArray(r[tsType]))  // find item that HAS this key
    if (!item) continue
    for (const v of item[tsType]) {
      if (!v || !v.asOfDate) continue
      const date = v.asOfDate
      if (!byDate[date]) byDate[date] = { _asOfDate: date }
      byDate[date][key] = { raw: v.reportedValue?.raw ?? null }
    }
  }
  return Object.values(byDate)
    .sort((a, b) => b._asOfDate.localeCompare(a._asOfDate))
    .map(item => {
      const ts = Math.floor(new Date(item._asOfDate).getTime() / 1000)
      return { endDate: { raw: ts, fmt: item._asOfDate }, ...item }
    })
}

export async function getFundamentals(symbol) {
  const key = `fundamentals:${symbol}`
  const cached = cache.get(key)
  if (cached && !cached._partial) return cached  // only use full-data cache

  const MODULES = 'assetProfile,summaryDetail,defaultKeyStatistics,financialData,price,incomeStatementHistory,earningsHistory,calendarEvents,recommendationTrend,upgradeDowngradeHistory,balanceSheetHistory,balanceSheetHistoryQuarterly'

  // Fetch quoteSummary (main data) + timeseries (income statement annual+quarterly extended)
  // in parallel for speed. Timeseries needs no auth; quoteSummary needs curl+crumb.
  const [mainResult, tsResults] = await Promise.all([
    (async () => {
      for (const host of ['query1', 'query2']) {
        try {
          const { crumb } = await getSession()
          if (!crumb) break
          const cookieJar = path.join(os.tmpdir(), `yf-cookies-${process.pid}.txt`)
          const url = `https://${host}.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${MODULES}&crumb=${encodeURIComponent(crumb)}`
          const out  = await curlGet(url, { cookieJar })
          const json = JSON.parse(out)
          const errCode = json?.quoteSummary?.error?.code
          if (errCode === 'Unauthorized' || errCode === 'Invalid Crumb') { _crumb = null; continue }
          const result = json?.quoteSummary?.result?.[0]
          if (result && Object.keys(result).length > 2) return result
        } catch (err) {
          console.warn(`Fundamentals ${host} error for ${symbol}:`, err.message.slice(0, 80))
        }
      }
      return null
    })(),
    fetchTimeseries(symbol),
  ])

  if (mainResult && Object.keys(mainResult).length > 2) {
    if (tsResults.length > 0) {
      // Annual income statement — all fields from timeseries, sorted newest first
      const annualStmts = reshapeTimeseries(tsResults, 'annual')
      if (annualStmts.length > 0) {
        mainResult.incomeStatementHistoryAnnual = { incomeStatementHistory: annualStmts }
      }
      // Quarterly income statement — use timeseries directly (proper Q1/Q2/Q3/Q4 dates)
      // Yahoo's incomeStatementHistory module may return only annual Q4 data for some
      // companies (e.g. AAPL). Timeseries quarterly is always correct.
      const qStmts = reshapeTimeseries(tsResults, 'quarterly')
      if (qStmts.length > 0) {
        mainResult.quarterlyTimeseries = { incomeStatementHistory: qStmts }
      }

      // Balance sheet (annual + quarterly) — merge timeseries + quoteSummary modules
      const bsAnnualTs    = reshapeTimeseriesCustom(tsResults, 'annual',    TS_MAP_BALANCE)
      const bsQuarterlyTs = reshapeTimeseriesCustom(tsResults, 'quarterly', TS_MAP_BALANCE)

      // Also pull from balanceSheetHistory module (4 years, different field names)
      const bsHistStatements = mainResult.balanceSheetHistory?.balanceSheetStatements || []
      const bsHistMapped = bsHistStatements.map(s => {
        const totalDebt = (s.longTermDebt?.raw ?? 0) + (s.shortLongTermDebt?.raw ?? 0)
        return {
          endDate: s.endDate,
          totalAssets:       { raw: s.totalAssets?.raw ?? null },
          totalDebt:         { raw: totalDebt || (s.longTermDebt?.raw ?? null) },
          commonStockEquity: { raw: s.totalStockholderEquity?.raw ?? null },
          totalLiabilities:  { raw: s.totalLiab?.raw ?? null },
          currentAssets:     { raw: s.totalCurrentAssets?.raw ?? null },
          currentLiabilities:{ raw: s.totalCurrentLiabilities?.raw ?? null },
        }
      }).filter(s => s.endDate?.raw)

      // Merge: timeseries takes priority for overlapping years; history fills gaps
      const tsDateSet = new Set(bsAnnualTs.map(s => s.endDate?.fmt?.slice(0, 4)))
      const histExtra = bsHistMapped.filter(s => {
        const yr = s.endDate?.fmt?.slice(0, 4) || String(new Date(s.endDate.raw * 1000).getFullYear())
        return !tsDateSet.has(yr)
      })
      const bsAnnual = [...bsAnnualTs, ...histExtra]
        .sort((a, b) => (b.endDate?.raw ?? 0) - (a.endDate?.raw ?? 0))

      // Quarterly: merge similarly
      const bsQHistStatements = mainResult.balanceSheetHistoryQuarterly?.balanceSheetStatements || []
      const bsQHistMapped = bsQHistStatements.map(s => {
        const totalDebt = (s.longTermDebt?.raw ?? 0) + (s.shortLongTermDebt?.raw ?? 0)
        return {
          endDate: s.endDate,
          totalAssets:       { raw: s.totalAssets?.raw ?? null },
          totalDebt:         { raw: totalDebt || (s.longTermDebt?.raw ?? null) },
          commonStockEquity: { raw: s.totalStockholderEquity?.raw ?? null },
          totalLiabilities:  { raw: s.totalLiab?.raw ?? null },
          currentAssets:     { raw: s.totalCurrentAssets?.raw ?? null },
          currentLiabilities:{ raw: s.totalCurrentLiabilities?.raw ?? null },
        }
      }).filter(s => s.endDate?.raw)
      const qTsDateSet = new Set(bsQuarterlyTs.map(s => s.endDate?.fmt?.slice(0, 7)))
      const qHistExtra = bsQHistMapped.filter(s => {
        const mo = s.endDate?.fmt?.slice(0, 7) || ''
        return !qTsDateSet.has(mo)
      })
      const bsQuarterly = [...bsQuarterlyTs, ...qHistExtra]
        .sort((a, b) => (b.endDate?.raw ?? 0) - (a.endDate?.raw ?? 0))

      if (bsAnnual.length > 0)    mainResult.balanceSheetAnnual    = bsAnnual
      if (bsQuarterly.length > 0) mainResult.balanceSheetQuarterly = bsQuarterly

      // Cash flow (annual + quarterly)
      const cfAnnual = reshapeTimeseriesCustom(tsResults, 'annual', TS_MAP_CASHFLOW)
      const cfQuarterly = reshapeTimeseriesCustom(tsResults, 'quarterly', TS_MAP_CASHFLOW)
      if (cfAnnual.length > 0)    mainResult.cashflowAnnual    = cfAnnual
      if (cfQuarterly.length > 0) mainResult.cashflowQuarterly = cfQuarterly
    }
    cache.set(key, mainResult, 300)
    return mainResult
  }

  // Fallback: build basic data from chart meta (always works)
  try {
    const result = await chartGet(symbol, { interval: '1d', range: '5d' })
    const meta   = result?.meta || {}
    const fallback = {
      _partial: true,
      price: {
        regularMarketPrice:   { raw: meta.regularMarketPrice },
        regularMarketDayHigh: { raw: meta.regularMarketDayHigh },
        regularMarketDayLow:  { raw: meta.regularMarketDayLow },
        regularMarketVolume:  { raw: meta.regularMarketVolume },
        shortName: meta.shortName || symbol,
        longName:  meta.longName  || symbol,
        currency:  meta.currency,
        symbol,
      },
      summaryDetail: {
        fiftyTwoWeekHigh:    { raw: meta.fiftyTwoWeekHigh },
        fiftyTwoWeekLow:     { raw: meta.fiftyTwoWeekLow  },
        regularMarketVolume: { raw: meta.regularMarketVolume },
        currency:            meta.currency,
      },
    }
    cache.set(key, fallback, 30)
    return fallback
  } catch {
    return { _partial: true, price: { shortName: symbol, longName: symbol } }
  }
}
