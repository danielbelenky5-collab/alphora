import { useState } from 'react'
import { useApp } from '../../contexts/AppContext'

const STORAGE_KEY = 'journal_events'
function loadEvents() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
}

export default function JournalEventForm() {
  const { t } = useApp()
  const [events, setEvents] = useState(loadEvents)
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    if (!date || !note.trim()) return
    const next = [...events, { id: Date.now(), date, note: note.trim() }]
      .sort((a, b) => a.date.localeCompare(b.date))
    setEvents(next)
    saveEvents(next)
    setNote('')
    setDate('')
  }

  function handleDelete(id) {
    const next = events.filter(ev => ev.id !== id)
    setEvents(next)
    saveEvents(next)
  }

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
          <button type="submit" className="btn-primary text-sm self-start font-heebo">
            {t('save')}
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
