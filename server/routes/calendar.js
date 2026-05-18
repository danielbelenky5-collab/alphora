import { Router } from 'express'
import { getCalendar } from '../lib/calendarData.js'

const router = Router()

router.get('/:exchange', (req, res) => {
  const { exchange } = req.params
  if (!['US', 'TASE'].includes(exchange.toUpperCase())) {
    return res.status(400).json({ error: 'exchange must be US or TASE' })
  }
  res.json(getCalendar(exchange.toUpperCase()))
})

export default router
