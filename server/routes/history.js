import { Router } from 'express'
import { getHistory } from '../lib/yahooClient.js'

const router = Router()

const PERIOD_MAP = {
  Intraday: { interval: '5m',  range: '1d'  },  // 5-min candles, today only (sparklines)
  Hour:  { interval: '60m', range: '1mo' },  // 1 candle per hour, ~1 month scrollable
  Day:   { interval: '1d',  range: '2y'  },  // 1 candle per day, 2 years scrollable
  Week:  { interval: '1wk', range: '5y'  },  // 1 candle per week, 5 years
  Month: { interval: '1mo', range: 'max' },  // 1 candle per month, all history
  YTD:   { interval: '1d',  range: 'ytd' },  // 1 candle per day since Jan 1
}

const SYMBOL_RE = /^[A-Z0-9.\-\^=]{1,20}$/i

router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params
    if (!SYMBOL_RE.test(symbol)) return res.status(400).json({ error: 'Invalid symbol' })
    const period = req.query.period || 'Day'
    const opts = PERIOD_MAP[period] || PERIOD_MAP.Day

    const data = await getHistory(symbol, {
      interval:       opts.interval,
      range:          opts.range,
      includePrePost: period === 'Intraday',
    })

    const quotes = data?.quotes || []
    const formatted = quotes
      .filter(q => q.open != null)
      .map(q => ({
        time:   Math.floor(new Date(q.date).getTime() / 1000),
        open:   q.open,
        high:   q.high,
        low:    q.low,
        close:  q.close,
        volume: q.volume,
      }))

    res.json({ symbol, period, data: formatted })
  } catch (err) {
    console.error('history error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
