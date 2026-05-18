import { Router }                   from 'express'
import { getQuotes, getMarketCaps } from '../lib/yahooClient.js'
import NodeCache                    from 'node-cache'

const router = Router()
const cache  = new NodeCache({ stdTTL: 60 })  // 60s for movers, 5min for sectors

// ── Ticker universes ──────────────────────────────────────────────────────────

// ~60 large-caps used for movers (gainers / losers / actives)
const MOVERS_UNIVERSE = [
  'AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','BRK-B','LLY','UNH',
  'XOM','JPM','V','AVGO','PG','MA','HD','MRK','ABBV','COST',
  'BAC','PFE','KO','CVX','TMO','WMT','CSCO','MCD','ABT','ACN',
  'ADBE','NKE','CRM','AMD','TXN','QCOM','PM','INTU','HON','LOW',
  'MS','GS','BLK','AXP','SCHW','CI','DE','BKNG','ISRG','LMT',
  'AMGN','MDT','GILD','VRTX','SYK','ZTS','REGN','BMY','WFC','C',
]

// Sector-specific curated lists (~20 per sector)
const SECTOR_TICKERS = {
  ms_technology: [
    'AAPL','MSFT','NVDA','AVGO','AMD','INTC','QCOM','TXN','ADBE','CRM',
    'CSCO','ORCL','NOW','INTU','ADI','KLAC','LRCX','AMAT','MU','PANW',
  ],
  ms_healthcare: [
    'UNH','JNJ','LLY','ABBV','MRK','ABT','TMO','DHR','AMGN','BMY',
    'GILD','VRTX','ISRG','MDT','SYK','ZTS','REGN','CI','ELV','CVS',
  ],
  ms_financial_services: [
    'JPM','BAC','WFC','MS','GS','BLK','SCHW','AXP','SPGI','CB',
    'PNC','USB','C','TRV','ICE','CME','AON','AFL','MET','PRU',
  ],
  ms_energy: [
    'XOM','CVX','COP','EOG','SLB','MPC','VLO','PSX','OXY','DVN',
    'HAL','BKR','HES','KMI','WMB','OKE','PXD','FANG','LNG','MRO',
  ],
  ms_consumer_cyclical: [
    'AMZN','TSLA','HD','MCD','NKE','LOW','BKNG','TGT','TJX','F',
    'GM','ROST','SBUX','ORLY','AZO','CMG','MAR','HLT','ABNB','UBER',
  ],
  ms_industrials: [
    'HON','UNP','RTX','LMT','DE','CAT','GE','EMR','ETN','ITW',
    'BA','FDX','UPS','NSC','CSX','PH','CMI','NOC','GD','MMM',
  ],
  ms_real_estate: [
    'PLD','AMT','EQIX','CCI','PSA','DLR','O','SPG','VICI','EXR',
    'WELL','EQR','AVB','WY','ARE','VTR','KIM','MAA','ESS','UDR',
  ],
  growth_technology_stocks: [
    'NVDA','META','TSLA','CRM','ADBE','INTC','AMD','QCOM','AVGO','NOW',
    'PANW','SNOW','PLTR','DDOG','ZS','CRWD','MDB','NET','TEAM','HUBS',
  ],
  undervalued_large_caps: [
    'BRK-B','JPM','BAC','WFC','C','XOM','CVX','VZ','T','INTC',
    'BMY','PFE','MRK','KO','PM','MO','USB','PNC','WBA','GM',
  ],
  aggressive_small_caps: [
    'SMCI','IONQ','RIVN','LCID','SOFI','HOOD','UPST','AFRM','OPEN','HIMS',
    'JOBY','LILM','ACHR','RKLB','AST','LUNR','ASTS','SOUN','FTRE','CAVA',
  ],
}

// ── Build screener results from getQuotes ─────────────────────────────────────
async function buildScreener(symbols, type, count) {
  const quotes = await getQuotes(symbols)
  const valid  = quotes.filter(q => q.regularMarketPrice != null)

  let sorted
  switch (type) {
    case 'day_gainers':
      sorted = valid.sort((a, b) =>
        (b.regularMarketChangePercent ?? -Infinity) - (a.regularMarketChangePercent ?? -Infinity))
      break
    case 'day_losers':
      sorted = valid.sort((a, b) =>
        (a.regularMarketChangePercent ?? Infinity) - (b.regularMarketChangePercent ?? Infinity))
      break
    case 'most_actives':
      sorted = valid.sort((a, b) =>
        (b.regularMarketVolume ?? 0) - (a.regularMarketVolume ?? 0))
      break
    default:
      // Sector / strategy screens — sort by % change desc
      sorted = valid.sort((a, b) =>
        (b.regularMarketChangePercent ?? -Infinity) - (a.regularMarketChangePercent ?? -Infinity))
  }

  return sorted.slice(0, count).map(q => ({
    symbol:    q.symbol,
    name:      q.shortName || q.longName || q.symbol,
    price:     q.regularMarketPrice         ?? null,
    change:    q.regularMarketChange        ?? null,
    changePct: q.regularMarketChangePercent ?? null,
    volume:    q.regularMarketVolume        ?? null,
    high:      q.regularMarketDayHigh       ?? null,
    low:       q.regularMarketDayLow        ?? null,
    marketCap: null,   // enriched below
  }))
}

// ── Route ─────────────────────────────────────────────────────────────────────
// GET /api/screener?type=day_gainers&count=20
router.get('/', async (req, res) => {
  try {
    const { type = 'day_gainers', count = '20' } = req.query
    const n = Math.min(parseInt(count) || 20, 25)

    const cacheKey = `screener:${type}`
    const cached   = cache.get(cacheKey)
    if (cached) return res.json(cached.slice(0, n))

    const symbols = SECTOR_TICKERS[type] || MOVERS_UNIVERSE
    const results = await buildScreener(symbols, type, symbols.length)  // sort all, slice later

    // Enrich top-N results with market caps (single batch call)
    const topN    = results.slice(0, n)
    const mcapMap = await getMarketCaps(topN.map(r => r.symbol)).catch(() => ({}))
    topN.forEach(r => { r.marketCap = mcapMap[r.symbol] ?? null })

    // Longer TTL for sectors (5min), shorter for movers (1min)
    const ttl = ['day_gainers','day_losers','most_actives'].includes(type) ? 60 : 300
    cache.set(cacheKey, results, ttl)

    res.json(topN)
  } catch (err) {
    console.error('screener error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
