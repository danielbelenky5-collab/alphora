import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'

const STORAGE_KEY = 'journal_events'
const TOKEN_KEY   = 'alphora_token'

// ── API helper ────────────────────────────────────────────────────────────────
function apiFetch(path, options = {}) {
  const base  = import.meta.env.VITE_API_URL
    ? `https://${import.meta.env.VITE_API_URL}/api`
    : '/api'
  const token = localStorage.getItem(TOKEN_KEY)
  return fetch(`${base}/user${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  }).then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
}

// ── localStorage fallback ─────────────────────────────────────────────────────
function loadLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveLocal(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
}

export default function JournalEventForm() {
  const { t }        = useApp()
  const { user }     = useAuth()
  const isLoggedIn   = !!user

  const [events, setEvents] = useState([])
  const [date,   setDate]   = useState('')
  const [note,   setNote]   = useState('')
  const [saving, setSaving] = useState(false)

  // ── Load events ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) {
      setEvents(loadLocal())
      return
    }
    apiFetch('/journal')
      .then(data => setEvents((data.events || []).sort((a, b) => a.date.localeCompare(b.date))))
      .catch(() => setEvents(loadLocal()))
  }, [isLoggedIn])

  // ── Add event ───────────────────────────────────────────────────────────────
  const handleAdd = useCallback(async (e) => {
    e.preventDefault()
    if (!date || !note.trim()) return
    setSaving(true)

    if (!isLoggedIn) {
      const next = [...events, { id: Date.now(), date, note: note.trim() }]
        .sort((a, b) => a.date.localeCompare(b.date))
      setEvents(next)
      saveLocal(next)
      setNote('')
      setDate('')
      setSaving(false)
      return
    }

    try {
      const data = await apiFetch('/journal', {
        method: 'POST',
        body: JSON.stringify({ date, note: note.trim() }),
      })
      setEvents(prev => [...prev, { id: data.id, date, note: note.trim() }]
        .sort((a, b) => a.date.localeCompare(b.date)))
      setNote('')
      setDate('')
    } catch {}
    setSaving(false)
  }, [date, note, events, isLoggedIn])

  // ── Delete event ────────────────────────────────────────────────────────────
  const handleDelete = useCallback((id) => {
    setEvents(prev => {
      const next = prev.filter(ev => ev.id !== id)
      if (!isLoggedIn) saveLocal(next)
      return next
    })
    if (isLoggedIn) {
      apiFetch(`/journal/${id}`, { method: 'DELETE' }).catch(() => {})
    }
  }, [isLoggedIn])

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-tx-primary font-heebo mb-3">{t('addEvent')}</h3>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div className="flex gap-3 flex-wrap">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-tx-primary outline-none focus:border-brand-500 font-inter w-44"
            />
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('notePlaceholder')}
              required
              className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-tx-primary placeholder-tx-muted outline-none focus:border-brand-500 font-heebo min-w-[180px]"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary text-sm self-start font-heebo disabled:opacity-60">
            {saving ? '...' : t('save')}
          </button>
        </form>
      </div>

      {events.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border">
            <h3 className="text-sm font-semibold text-tx-primary font-heebo">{t('myEvents')}</h3>
          </div>
          {events.map(ev => (
            <div key={ev.id} className="flex items-center justify-between px-4 py-3 border-b border-surface-border/50 hover:bg-surface-hover group">
              <div className="flex items-center gap-3">
                <span className="text-xs text-tx-muted font-inter tabular-nums">
                  {new Date(ev.date + 'T12:00:00').toLocaleDateString('he-IL')}
                </span>
                <span className="text-sm text-tx-primary font-heebo">{ev.note}</span>
              </div>
              <button
                onClick={() => handleDelete(ev.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-tx-muted hover:text-red-400"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
