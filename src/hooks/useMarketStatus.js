import { useState, useEffect } from 'react'

// NYSE holidays (YYYY-MM-DD in ET)
const NYSE_HOLIDAYS = new Set([
  // 2025
  '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18',
  '2025-05-26', '2025-06-19', '2025-07-04', '2025-09-01',
  '2025-11-27', '2025-12-25',
  // 2026
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03',
  '2026-05-25', '2026-06-19', '2026-07-03', '2026-09-07',
  '2026-11-26', '2026-12-25',
])

// Minutes from midnight ET for key thresholds
const PRE_OPEN   = 4 * 60          // 04:00 ET
const OPEN       = 9 * 60 + 30     // 09:30 ET
const CLOSE      = 16 * 60         // 16:00 ET
const AFTER_END  = 20 * 60         // 20:00 ET

/**
 * Returns the current time broken down in America/New_York timezone.
 */
function getETDateParts() {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(now).map(p => [p.type, p.value]))
  return {
    dateStr:  `${parts.year}-${parts.month}-${parts.day}`,
    weekday:  new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getDay(), // 0=Sun
    minutes:  parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10),
    secondsInMinute: parseInt(parts.second, 10),
  }
}

/**
 * Possible statuses:
 *  'open'       — regular trading hours (green, pulsing)
 *  'premarket'  — pre-market session (orange)
 *  'afterhours' — after-hours session (orange)
 *  'closed'     — nights / weekends / holidays (red)
 */
function computeStatus() {
  const { dateStr, weekday, minutes } = getETDateParts()

  const isWeekend = weekday === 0 || weekday === 6
  const isHoliday = NYSE_HOLIDAYS.has(dateStr)

  if (isWeekend || isHoliday) return 'closed'
  if (minutes >= OPEN  && minutes <  CLOSE)     return 'open'
  if (minutes >= PRE_OPEN && minutes < OPEN)    return 'premarket'
  if (minutes >= CLOSE && minutes <  AFTER_END) return 'afterhours'
  return 'closed'
}

/**
 * Hook — recalculates every 30 s so it updates when market opens/closes.
 */
export function useMarketStatus() {
  const [status, setStatus] = useState(computeStatus)

  useEffect(() => {
    const id = setInterval(() => setStatus(computeStatus()), 30_000)
    return () => clearInterval(id)
  }, [])

  return status
}
