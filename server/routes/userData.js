/**
 * userData.js — Server-side persistence for watchlist, portfolio, journal
 * All routes require a valid JWT (Bearer token).
 */
import { Router } from 'express'
import db from '../lib/db.js'
import { requireAuth } from './auth.js'

const router = Router()
router.use(requireAuth)   // every route in this file requires login

// ══════════════════════════════════════════════════════════════════════════════
// WATCHLIST
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/user/watchlist
// Returns { lists: [{ listIndex, listName, symbols: [...] }] }
router.get('/watchlist', async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT list_index, list_name, symbol, position FROM watchlist_items WHERE user_id = ? ORDER BY list_index, position',
      [req.user.id]
    )
    // Group by list
    const map = new Map()
    for (const r of rows) {
      const key = r.list_index
      if (!map.has(key)) map.set(key, { listIndex: r.list_index, listName: r.list_name, symbols: [] })
      map.get(key).symbols.push(r.symbol)
    }
    // Ensure at least one list
    if (map.size === 0) map.set(0, { listIndex: 0, listName: 'רשימה 1', symbols: [] })
    res.json({ lists: [...map.values()].sort((a, b) => a.listIndex - b.listIndex) })
  } catch (err) {
    console.error('watchlist GET error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/user/watchlist/symbol
// Body: { listIndex, listName, symbol }
router.post('/watchlist/symbol', async (req, res) => {
  const { listIndex = 0, listName = 'רשימה 1', symbol } = req.body
  if (!symbol) return res.status(400).json({ error: 'symbol required' })
  try {
    const count = await db.get(
      'SELECT COUNT(*) as c FROM watchlist_items WHERE user_id = ? AND list_index = ?',
      [req.user.id, listIndex]
    )
    const position = (count?.c ?? 0)
    await db.run(
      'INSERT OR IGNORE INTO watchlist_items (user_id, list_index, list_name, symbol, position) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, listIndex, listName, symbol.toUpperCase(), position]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('watchlist POST error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/user/watchlist/symbol/:symbol?listIndex=0
router.delete('/watchlist/symbol/:symbol', async (req, res) => {
  const symbol     = req.params.symbol?.toUpperCase()
  const listIndex  = parseInt(req.query.listIndex ?? '0', 10)
  try {
    await db.run(
      'DELETE FROM watchlist_items WHERE user_id = ? AND list_index = ? AND symbol = ?',
      [req.user.id, listIndex, symbol]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/user/watchlist/list  — create a new list
// Body: { listName }
router.post('/watchlist/list', async (req, res) => {
  const { listName = 'רשימה חדשה' } = req.body
  try {
    const row = await db.get(
      'SELECT MAX(list_index) as m FROM watchlist_items WHERE user_id = ?',
      [req.user.id]
    )
    const newIndex = (row?.m ?? -1) + 1
    // Insert a placeholder row so the list exists even if empty
    await db.run(
      'INSERT INTO watchlist_items (user_id, list_index, list_name, symbol, position) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, newIndex, listName, '__PLACEHOLDER__', 0]
    )
    res.json({ ok: true, listIndex: newIndex })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/user/watchlist/list/:listIndex
router.delete('/watchlist/list/:listIndex', async (req, res) => {
  const listIndex = parseInt(req.params.listIndex, 10)
  try {
    await db.run(
      'DELETE FROM watchlist_items WHERE user_id = ? AND list_index = ?',
      [req.user.id, listIndex]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/user/watchlist/list/:listIndex/name
// Body: { listName }
router.put('/watchlist/list/:listIndex/name', async (req, res) => {
  const listIndex = parseInt(req.params.listIndex, 10)
  const { listName } = req.body
  if (!listName) return res.status(400).json({ error: 'listName required' })
  try {
    await db.run(
      'UPDATE watchlist_items SET list_name = ? WHERE user_id = ? AND list_index = ?',
      [listName, req.user.id, listIndex]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/user/portfolio
// Returns { portfolios: [{ id, name, positions: [...] }], active }
router.get('/portfolio', async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT id, portfolio_id, portfolio_name, data FROM portfolio_positions WHERE user_id = ? ORDER BY created_at',
      [req.user.id]
    )
    // Group by portfolio_id
    const map = new Map()
    for (const r of rows) {
      if (!map.has(r.portfolio_id))
        map.set(r.portfolio_id, { id: r.portfolio_id, name: r.portfolio_name, positions: [] })
      try {
        const pos = JSON.parse(r.data)
        pos._dbId = r.id          // attach DB row id so frontend can update/delete
        map.get(r.portfolio_id).positions.push(pos)
      } catch {}
    }
    if (map.size === 0) map.set('main', { id: 'main', name: 'ראשי', positions: [] })
    res.json({ portfolios: [...map.values()], active: map.keys().next().value })
  } catch (err) {
    console.error('portfolio GET error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/user/portfolio/position
// Body: { portfolioId, portfolioName, position: {...} }
router.post('/portfolio/position', async (req, res) => {
  const { portfolioId = 'main', portfolioName = 'ראשי', position } = req.body
  if (!position) return res.status(400).json({ error: 'position required' })
  try {
    const result = await db.run(
      'INSERT INTO portfolio_positions (user_id, portfolio_id, portfolio_name, data) VALUES (?, ?, ?, ?)',
      [req.user.id, portfolioId, portfolioName, JSON.stringify(position)]
    )
    res.json({ ok: true, id: result.lastInsertRowid })
  } catch (err) {
    console.error('portfolio POST error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/user/portfolio/position/:id
// Body: { position: {...} }
router.put('/portfolio/position/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  const { position } = req.body
  if (!position) return res.status(400).json({ error: 'position required' })
  try {
    const now = Math.floor(Date.now() / 1000)
    await db.run(
      'UPDATE portfolio_positions SET data = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      [JSON.stringify(position), now, id, req.user.id]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/user/portfolio/position/:id
router.delete('/portfolio/position/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  try {
    await db.run(
      'DELETE FROM portfolio_positions WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/user/portfolio/list  — create new portfolio
// Body: { portfolioId, portfolioName }
router.post('/portfolio/list', async (req, res) => {
  const { portfolioId, portfolioName = 'תיק חדש' } = req.body
  if (!portfolioId) return res.status(400).json({ error: 'portfolioId required' })
  res.json({ ok: true, portfolioId, portfolioName })
})

// PUT /api/user/portfolio/list/:portfolioId/name
router.put('/portfolio/list/:portfolioId/name', async (req, res) => {
  const { portfolioId } = req.params
  const { portfolioName } = req.body
  if (!portfolioName) return res.status(400).json({ error: 'portfolioName required' })
  try {
    await db.run(
      'UPDATE portfolio_positions SET portfolio_name = ? WHERE user_id = ? AND portfolio_id = ?',
      [portfolioName, req.user.id, portfolioId]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/user/portfolio/list/:portfolioId
router.delete('/portfolio/list/:portfolioId', async (req, res) => {
  const { portfolioId } = req.params
  try {
    await db.run(
      'DELETE FROM portfolio_positions WHERE user_id = ? AND portfolio_id = ?',
      [req.user.id, portfolioId]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// JOURNAL
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/user/journal
router.get('/journal', async (req, res) => {
  try {
    const events = await db.all(
      'SELECT id, date, note FROM journal_events WHERE user_id = ? ORDER BY date',
      [req.user.id]
    )
    res.json({ events })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/user/journal
// Body: { date, note }
router.post('/journal', async (req, res) => {
  const { date, note } = req.body
  if (!date || !note?.trim()) return res.status(400).json({ error: 'date and note required' })
  try {
    const result = await db.run(
      'INSERT INTO journal_events (user_id, date, note) VALUES (?, ?, ?)',
      [req.user.id, date, note.trim()]
    )
    res.json({ ok: true, id: result.lastInsertRowid })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/user/journal/:id
router.delete('/journal/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  try {
    await db.run(
      'DELETE FROM journal_events WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
