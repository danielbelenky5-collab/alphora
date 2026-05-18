import { Router } from 'express'
import { getQuotes } from '../lib/yahooClient.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { symbols } = req.query
    if (!symbols) return res.status(400).json({ error: 'symbols param required' })

    const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean)
    const data = await getQuotes(symbolList)
    const result = Array.isArray(data) ? data : [data]
    res.json(result)
  } catch (err) {
    console.error('quotes error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
