import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import db from '../lib/db.js'
import { sendVerificationEmail, sendPasswordResetEmail, isEmailConfigured } from '../lib/mailer.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'alphora_dev_secret_change_in_production'

// ── Helpers ───────────────────────────────────────────────────────────────────
function genToken() { return crypto.randomBytes(32).toString('hex') }

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' })
  try { req.user = jwt.verify(auth.slice(7), JWT_SECRET); next() }
  catch { res.status(401).json({ error: 'Invalid token' }) }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin only' })
    next()
  })
}

function validatePassword(password) {
  const errors = []
  if (!password || password.length < 8)  errors.push('minimum 8 characters')
  if (!/[A-Z]/.test(password))            errors.push('at least one uppercase letter')
  if (!/[a-z]/.test(password))            errors.push('at least one lowercase letter')
  if (!/[\d\W_]/.test(password))          errors.push('at least one number or special character')
  return errors
}

function validateUsername(username) {
  if (!username || username.trim().length < 3) return 'Username must be at least 3 characters'
  if (username.length > 30)                     return 'Username must be under 30 characters'
  if (!/^[a-zA-Z0-9_֐-׿]+$/.test(username))
    return 'Username can contain letters, numbers and underscores only'
  return null
}

function validateEmail(email) {
  if (!email || !email.trim()) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Invalid email address'
  return null
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, password, email } = req.body

  const usernameErr = validateUsername(username)
  if (usernameErr) return res.status(400).json({ error: usernameErr })

  const emailErr = validateEmail(email)
  if (emailErr) return res.status(400).json({ error: emailErr })

  const pwErrors = validatePassword(password)
  if (pwErrors.length > 0) return res.status(400).json({ error: pwErrors.join(', ') })

  try {
    const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username.trim()])
    if (existingUser) return res.status(409).json({ error: 'Username already taken' })

    const existingEmail = await db.get('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()])
    if (existingEmail) return res.status(409).json({ error: 'Email already registered' })

    const hash     = await bcrypt.hash(password, 12)
    const countRow = await db.get('SELECT COUNT(*) AS c FROM users', [])
    const count    = parseInt(countRow?.c ?? 0, 10)
    const isAdmin  = count === 0 ? 1 : 0
    const verToken = genToken()

    const result = await db.run(
      'INSERT INTO users (username, password_hash, email, email_verified, verification_token, is_admin) VALUES (?, ?, ?, 0, ?, ?)',
      [username.trim(), hash, email.trim().toLowerCase(), verToken, isAdmin]
    )

    let emailSent = false
    if (isEmailConfigured()) {
      try {
        await sendVerificationEmail(email.trim().toLowerCase(), username.trim(), verToken)
        emailSent = true
      } catch (err) {
        console.warn('Email send failed:', err.message)
      }
    }

    const token = jwt.sign(
      { id: result.lastInsertRowid, username: username.trim(), is_admin: isAdmin },
      JWT_SECRET, { expiresIn: '30d' }
    )
    res.status(201).json({ token, username: username.trim(), is_admin: isAdmin, emailSent })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' })

  try {
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username.trim()])
    if (!user) return res.status(401).json({ error: 'Invalid username or password' })

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ error: 'Invalid username or password' })

    const token = jwt.sign(
      { id: user.id, username: user.username, is_admin: user.is_admin },
      JWT_SECRET, { expiresIn: '30d' }
    )
    res.json({ token, username: user.username, is_admin: user.is_admin })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── GET /api/auth/verify ─────────────────────────────────────────────────────
router.get('/verify', (req, res) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' })
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET)
    res.json({ username: payload.username, is_admin: payload.is_admin })
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})

// ── GET /api/auth/verify-email/:token ────────────────────────────────────────
router.get('/verify-email/:token', async (req, res) => {
  const { token } = req.params
  if (!token) return res.status(400).json({ error: 'Invalid token' })

  try {
    const user = await db.get('SELECT id, username FROM users WHERE verification_token = ?', [token])
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification link' })

    await db.run('UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?', [user.id])
    res.json({ ok: true, username: user.username })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email required' })

  try {
    const user = await db.get('SELECT id, username, email FROM users WHERE email = ?', [email.trim().toLowerCase()])
    if (!user) return res.json({ ok: true })   // don't reveal if email exists

    const resetToken   = genToken()
    const resetExpires = Math.floor(Date.now() / 1000) + 3600

    await db.run(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, resetExpires, user.id]
    )

    if (isEmailConfigured()) {
      try {
        await sendPasswordResetEmail(user.email, user.username, resetToken)
      } catch (err) {
        console.warn('Reset email send failed:', err.message)
      }
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── POST /api/auth/reset-password ────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'Missing fields' })

  const pwErrors = validatePassword(password)
  if (pwErrors.length > 0) return res.status(400).json({ error: pwErrors.join(', ') })

  try {
    const now  = Math.floor(Date.now() / 1000)
    const user = await db.get(
      'SELECT id, username FROM users WHERE reset_token = ? AND reset_token_expires > ?',
      [token, now]
    )
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' })

    const hash = await bcrypt.hash(password, 12)
    await db.run(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hash, user.id]
    )

    res.json({ ok: true, username: user.username })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── GET /api/auth/admin/users ─────────────────────────────────────────────────
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await db.all(
      'SELECT id, username, email, email_verified, is_admin, created_at FROM users ORDER BY created_at DESC',
      []
    )
    res.json({ total: users.length, users })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ── DELETE /api/auth/admin/users/:id ─────────────────────────────────────────
router.delete('/admin/users/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' })
  try {
    await db.run('DELETE FROM users WHERE id = ?', [id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
