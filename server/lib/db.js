/**
 * db.js — Dual-mode database adapter
 *
 * Local development  → SQLite  (better-sqlite3, synchronous, zero config)
 * Production/Render  → PostgreSQL (pg, async, set DATABASE_URL env var)
 *
 * API (always async):
 *   db.get(sql, params)  → single row | null
 *   db.all(sql, params)  → array of rows
 *   db.run(sql, params)  → { lastInsertRowid, changes }
 */

import { createRequire } from 'module'
import { fileURLToPath }  from 'url'
import path               from 'path'
import fs                 from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IS_PROD   = !!process.env.DATABASE_URL

// ── Helper: convert SQLite ? placeholders → PostgreSQL $1 $2 … ──────────────
function toPg(sql) {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

// ════════════════════════════════════════════════════════════════════════════
// PostgreSQL  (production)
// ════════════════════════════════════════════════════════════════════════════
async function buildPostgresAdapter() {
  const { default: pg } = await import('pg')

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  // Create schema (idempotent)
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS citext;

    CREATE TABLE IF NOT EXISTS users (
      id                   SERIAL PRIMARY KEY,
      username             CITEXT  NOT NULL UNIQUE,
      password_hash        TEXT    NOT NULL,
      email                CITEXT  UNIQUE,
      email_verified       INTEGER NOT NULL DEFAULT 0,
      verification_token   TEXT,
      reset_token          TEXT,
      reset_token_expires  BIGINT,
      is_admin             INTEGER NOT NULL DEFAULT 0,
      created_at           BIGINT  NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );
  `)

  // First registered user is always admin
  const { rows } = await pool.query(
    'SELECT id, is_admin FROM users ORDER BY id LIMIT 1'
  )
  if (rows[0] && !rows[0].is_admin) {
    await pool.query('UPDATE users SET is_admin = 1 WHERE id = $1', [rows[0].id])
  }

  return {
    async get(sql, params = []) {
      const r = await pool.query(toPg(sql), params)
      return r.rows[0] ?? null
    },
    async all(sql, params = []) {
      const r = await pool.query(toPg(sql), params)
      return r.rows
    },
    async run(sql, params = []) {
      let pgSql = toPg(sql)
      // For INSERT, append RETURNING id so we can return lastInsertRowid
      if (/^\s*INSERT/i.test(sql)) {
        pgSql += ' RETURNING id'
        const r = await pool.query(pgSql, params)
        return { lastInsertRowid: r.rows[0]?.id ?? null, changes: r.rowCount }
      }
      const r = await pool.query(pgSql, params)
      return { lastInsertRowid: null, changes: r.rowCount }
    },
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SQLite  (local development — identical to old behaviour)
// ════════════════════════════════════════════════════════════════════════════
function buildSqliteAdapter() {
  const Database = createRequire(import.meta.url)('better-sqlite3')
  const DB_DIR   = path.join(__dirname, '../db')
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })

  const sqlite = new Database(path.join(DB_DIR, 'alphora.db'))
  sqlite.pragma('journal_mode = WAL')

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      username             TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash        TEXT    NOT NULL,
      email                TEXT    UNIQUE COLLATE NOCASE,
      email_verified       INTEGER NOT NULL DEFAULT 0,
      verification_token   TEXT,
      reset_token          TEXT,
      reset_token_expires  INTEGER,
      is_admin             INTEGER NOT NULL DEFAULT 0,
      created_at           INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `)

  // Safe column migrations
  const addCol = (col, def) => {
    try { sqlite.exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`) } catch {}
  }
  addCol('email',               'TEXT COLLATE NOCASE')
  addCol('email_verified',      'INTEGER NOT NULL DEFAULT 0')
  addCol('verification_token',  'TEXT')
  addCol('reset_token',         'TEXT')
  addCol('reset_token_expires', 'INTEGER')
  addCol('is_admin',            'INTEGER NOT NULL DEFAULT 0')
  try { sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)') } catch {}

  const first = sqlite.prepare('SELECT id, is_admin FROM users ORDER BY id LIMIT 1').get()
  if (first && !first.is_admin) {
    sqlite.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(first.id)
  }

  return {
    async get(sql, params = []) {
      return sqlite.prepare(sql).get(...params) ?? null
    },
    async all(sql, params = []) {
      return sqlite.prepare(sql).all(...params)
    },
    async run(sql, params = []) {
      const r = sqlite.prepare(sql).run(...params)
      return { lastInsertRowid: r.lastInsertRowid, changes: r.changes }
    },
  }
}

// ── Export the right adapter ─────────────────────────────────────────────────
const db = IS_PROD ? await buildPostgresAdapter() : buildSqliteAdapter()
export default db
