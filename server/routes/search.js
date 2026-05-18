import { Router } from 'express'
import { searchSymbol } from '../lib/yahooClient.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.length < 1) return res.json([])
    const results = await searchSymbol(q)
    res.json(results)
  } catch (err) {
    console.error('search error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
