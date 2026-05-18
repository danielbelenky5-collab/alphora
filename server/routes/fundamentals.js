import { Router } from 'express'
import { getFundamentals } from '../lib/yahooClient.js'

const router = Router()
const SYMBOL_RE = /^[A-Z0-9.\-\^=]{1,20}$/i

router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params
    if (!SYMBOL_RE.test(symbol)) return res.status(400).json({ error: 'Invalid symbol' })
    const data = await getFundamentals(symbol)
    res.json(data)
  } catch (err) {
    console.error('fundamentals error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
