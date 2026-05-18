const US_CALENDAR_2025 = [
  { date: '2025-01-01', day: 'Wednesday',  status: 'closed',   label: "New Year's Day" },
  { date: '2025-01-20', day: 'Monday',     status: 'closed',   label: 'MLK Day' },
  { date: '2025-02-17', day: 'Monday',     status: 'closed',   label: "Presidents' Day" },
  { date: '2025-04-18', day: 'Friday',     status: 'closed',   label: 'Good Friday' },
  { date: '2025-05-26', day: 'Monday',     status: 'closed',   label: 'Memorial Day' },
  { date: '2025-06-19', day: 'Thursday',   status: 'closed',   label: 'Juneteenth' },
  { date: '2025-07-03', day: 'Thursday',   status: 'early',    closeTime: '13:00', label: 'Independence Day Eve' },
  { date: '2025-07-04', day: 'Friday',     status: 'closed',   label: 'Independence Day' },
  { date: '2025-09-01', day: 'Monday',     status: 'closed',   label: 'Labor Day' },
  { date: '2025-11-27', day: 'Thursday',   status: 'closed',   label: 'Thanksgiving' },
  { date: '2025-11-28', day: 'Friday',     status: 'early',    closeTime: '13:00', label: 'Black Friday' },
  { date: '2025-12-24', day: 'Wednesday',  status: 'early',    closeTime: '13:00', label: 'Christmas Eve' },
  { date: '2025-12-25', day: 'Thursday',   status: 'closed',   label: 'Christmas' },
]

const US_CALENDAR_2026 = [
  { date: '2026-01-01', day: 'Thursday',   status: 'closed',   label: "New Year's Day" },
  { date: '2026-01-19', day: 'Monday',     status: 'closed',   label: 'MLK Day' },
  { date: '2026-02-16', day: 'Monday',     status: 'closed',   label: "Presidents' Day" },
  { date: '2026-04-03', day: 'Friday',     status: 'closed',   label: 'Good Friday' },
  { date: '2026-05-25', day: 'Monday',     status: 'closed',   label: 'Memorial Day' },
  { date: '2026-06-19', day: 'Friday',     status: 'closed',   label: 'Juneteenth' },
  { date: '2026-07-03', day: 'Friday',     status: 'early',    closeTime: '13:00', label: 'Independence Day Eve' },
  { date: '2026-09-07', day: 'Monday',     status: 'closed',   label: 'Labor Day' },
  { date: '2026-11-26', day: 'Thursday',   status: 'closed',   label: 'Thanksgiving' },
  { date: '2026-11-27', day: 'Friday',     status: 'early',    closeTime: '13:00', label: 'Black Friday' },
  { date: '2026-12-24', day: 'Thursday',   status: 'early',    closeTime: '13:00', label: 'Christmas Eve' },
  { date: '2026-12-25', day: 'Friday',     status: 'closed',   label: 'Christmas' },
]

const TASE_CALENDAR_2025 = [
  { date: '2025-01-01', day: 'Wednesday',  status: 'closed',   label: 'ראש השנה הגרגוריאני' },
  { date: '2025-04-13', day: 'Sunday',     status: 'closed',   label: 'ערב פסח' },
  { date: '2025-04-14', day: 'Monday',     status: 'closed',   label: 'פסח א' },
  { date: '2025-04-20', day: 'Sunday',     status: 'closed',   label: 'פסח ז' },
  { date: '2025-04-21', day: 'Monday',     status: 'closed',   label: 'פסח ח' },
  { date: '2025-05-01', day: 'Thursday',   status: 'closed',   label: 'יום העצמאות' },
  { date: '2025-06-02', day: 'Monday',     status: 'closed',   label: 'שבועות' },
  { date: '2025-09-22', day: 'Monday',     status: 'early',    closeTime: '14:45', label: 'ערב ראש השנה' },
  { date: '2025-09-23', day: 'Tuesday',    status: 'closed',   label: 'ראש השנה א' },
  { date: '2025-09-24', day: 'Wednesday',  status: 'closed',   label: 'ראש השנה ב' },
  { date: '2025-10-01', day: 'Wednesday',  status: 'early',    closeTime: '14:45', label: 'ערב יום כיפור' },
  { date: '2025-10-02', day: 'Thursday',   status: 'closed',   label: 'יום כיפור' },
  { date: '2025-10-06', day: 'Monday',     status: 'early',    closeTime: '14:45', label: 'ערב סוכות' },
  { date: '2025-10-07', day: 'Tuesday',    status: 'closed',   label: 'סוכות א' },
  { date: '2025-10-13', day: 'Monday',     status: 'early',    closeTime: '14:45', label: 'ערב שמחת תורה' },
  { date: '2025-10-14', day: 'Tuesday',    status: 'closed',   label: 'שמחת תורה' },
]

const TASE_CALENDAR_2026 = [
  { date: '2026-01-01', day: 'Thursday',   status: 'closed',   label: 'ראש השנה הגרגוריאני' },
  { date: '2026-03-19', day: 'Thursday',   status: 'early',    closeTime: '14:45', label: 'ערב פורים' },
  { date: '2026-03-20', day: 'Friday',     status: 'closed',   label: 'פורים' },
  { date: '2026-04-01', day: 'Wednesday',  status: 'early',    closeTime: '14:45', label: 'ערב פסח' },
  { date: '2026-04-02', day: 'Thursday',   status: 'closed',   label: 'פסח א' },
  { date: '2026-04-08', day: 'Wednesday',  status: 'early',    closeTime: '14:45', label: 'פסח ז' },
  { date: '2026-04-09', day: 'Thursday',   status: 'closed',   label: 'פסח ח' },
  { date: '2026-04-20', day: 'Monday',     status: 'closed',   label: 'יום העצמאות' },
  { date: '2026-05-21', day: 'Thursday',   status: 'closed',   label: 'שבועות' },
  { date: '2026-09-10', day: 'Thursday',   status: 'early',    closeTime: '14:45', label: 'ערב ראש השנה' },
  { date: '2026-09-11', day: 'Friday',     status: 'closed',   label: 'ראש השנה א' },
  { date: '2026-09-14', day: 'Monday',     status: 'closed',   label: 'ראש השנה ב' },
  { date: '2026-09-20', day: 'Sunday',     status: 'early',    closeTime: '14:45', label: 'ערב יום כיפור' },
  { date: '2026-09-21', day: 'Monday',     status: 'closed',   label: 'יום כיפור' },
  { date: '2026-09-25', day: 'Friday',     status: 'early',    closeTime: '14:45', label: 'ערב סוכות' },
  { date: '2026-09-28', day: 'Monday',     status: 'closed',   label: 'סוכות א' },
  { date: '2026-10-02', day: 'Friday',     status: 'early',    closeTime: '14:45', label: 'ערב שמחת תורה' },
  { date: '2026-10-03', day: 'Saturday',   status: 'closed',   label: 'שמחת תורה' },
]

export function getCalendar(exchange) {
  const currentYear = new Date().getFullYear()
  const cutoff = new Date(Date.now() - 30 * 86400000)

  if (exchange === 'TASE') {
    const data = [...TASE_CALENDAR_2025, ...TASE_CALENDAR_2026]
    return data
      .filter(e => new Date(e.date) >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const data = [...US_CALENDAR_2025, ...US_CALENDAR_2026]
  return data
    .filter(e => new Date(e.date) >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date))
}
