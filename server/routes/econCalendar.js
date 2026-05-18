import { Router } from 'express'
import NodeCache from 'node-cache'
import { execFile } from 'child_process'
import os from 'os'
import path from 'path'

const router  = Router()
const cache   = new NodeCache({ stdTTL: 3600 }) // refresh every hour

const CURL_EXE = process.platform === 'win32'
  ? 'C:\\Windows\\System32\\curl.exe'
  : 'curl'

function curlGet(url) {
  return new Promise((resolve, reject) => {
    execFile(CURL_EXE,
      ['-sS', '--max-time', '15', '-L',
       '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
       '-H', 'Accept: application/json',
       url],
      { timeout: 20000 },
      (err, stdout) => {
        if (err) return reject(new Error(err.message))
        resolve(stdout || '')
      }
    )
  })
}

const COUNTRY_FLAGS = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
  CAD: '🇨🇦', AUD: '🇦🇺', NZD: '🇳🇿', CHF: '🇨🇭',
  CNY: '🇨🇳', KRW: '🇰🇷', ALL: '🌐',
}

// Hebrew translations for common economic events
const EVENT_HE = {
  'Non-Farm Payrolls':                  'שכירים מחוץ לחקלאות',
  'Non-Farm Employment Change':         'שינוי תעסוקה מחוץ לחקלאות',
  'Unemployment Rate':                  'שיעור אבטלה',
  'Average Hourly Earnings m/m':        'שכר שעתי ממוצע ח/ח',
  'CPI m/m':                            'מדד מחירים לצרכן ח/ח',
  'CPI y/y':                            'מדד מחירים לצרכן ש/ש',
  'Core CPI m/m':                       'מדד מחירים ליבה ח/ח',
  'PPI m/m':                            'מדד מחירי יצרן ח/ח',
  'Core PPI m/m':                       'מדד מחירי יצרן ליבה ח/ח',
  'GDP q/q':                            'תמ"ג רבעוני',
  'Preliminary GDP q/q':                'תמ"ג רבעוני (ראשוני)',
  'Final GDP q/q':                      'תמ"ג רבעוני (סופי)',
  'Initial Jobless Claims':             'תביעות אבטלה ראשוניות',
  'Continuing Jobless Claims':          'תביעות אבטלה מתמשכות',
  'FOMC Statement':                     'הצהרת FOMC',
  'Federal Funds Rate':                 'ריבית פדרלית',
  'FOMC Meeting Minutes':               'פרוטוקול ישיבת FOMC',
  'FOMC Member':                        'חבר FOMC',
  'Fed Chair':                          'יו"ר הפד',
  'ISM Manufacturing PMI':              'PMI תעשייה ISM',
  'ISM Services PMI':                   'PMI שירותים ISM',
  'ISM Non-Manufacturing PMI':          'PMI שירותים ISM',
  'Flash Manufacturing PMI':            'PMI תעשייה ראשוני',
  'Flash Services PMI':                 'PMI שירותים ראשוני',
  'Manufacturing PMI':                  'PMI תעשייה',
  'Services PMI':                       'PMI שירותים',
  'Chicago PMI':                        'PMI שיקגו',
  'Retail Sales m/m':                   'מכירות קמעונאיות ח/ח',
  'Core Retail Sales m/m':              'מכירות קמעונאיות ליבה ח/ח',
  'Consumer Confidence':                'אמון צרכנים',
  'CB Consumer Confidence':             'אמון צרכנים CB',
  'Michigan Consumer Sentiment':        'סנטימנט צרכנים מישיגן',
  'Michigan Consumer Sentiment Prel.':  'סנטימנט צרכנים מישיגן (ראשוני)',
  'ADP Non-Farm Employment Change':     'שינוי תעסוקה ADP',
  'Trade Balance':                      'מאזן סחר',
  'Housing Starts':                     'התחלות בנייה',
  'Building Permits':                   'היתרי בנייה',
  'Existing Home Sales':                'מכירות בתים קיימים',
  'New Home Sales':                     'מכירות בתים חדשים',
  'Pending Home Sales m/m':             'מכירות בתים בהמתנה',
  'Durable Goods Orders m/m':           'הזמנות מוצרי בני קיימא',
  'Core Durable Goods Orders m/m':      'הזמנות מוצרי בני קיימא ליבה',
  'JOLTS Job Openings':                 'משרות פנויות JOLTS',
  'PCE Price Index m/m':                'מדד מחירים PCE',
  'Core PCE Price Index m/m':           'מדד מחירים PCE ליבה',
  'Personal Spending m/m':              'הוצאות אישיות',
  'Personal Income m/m':                'הכנסה אישית',
  'Industrial Production m/m':          'ייצור תעשייתי',
  'Capacity Utilization Rate':          'ניצול כושר ייצור',
  'Empire State Manufacturing Index':   'מדד תעשייה Empire State',
  'Philly Fed Manufacturing Index':     'מדד תעשייה Philly Fed',
  'Current Account':                    'חשבון שוטף',
  'Interest Rate Decision':             'החלטת ריבית',
  'Bank Holiday':                       'חופשה בנקאית',
  'Treasury Currency Report':           'דוח מטבע אוצר',
  'EIA Crude Oil Inventories':          'מלאי נפט גולמי EIA',
  'EIA Natural Gas Storage':            'מלאי גז טבעי EIA',
  'Baker Hughes Oil Rig Count':         'ספירת קדחי נפט Baker Hughes',
  'OPEC Meetings':                      'ישיבות אופ"ק',
  'Consumer Price Index':               'מדד מחירים לצרכן',
  'Producer Price Index':               'מדד מחירי יצרן',
  'Import Prices m/m':                  'מחירי יבוא',
  'Export Prices m/m':                  'מחירי יצוא',
  'Wholesale Inventories m/m':          'מלאי סיטונאי',
  'Business Inventories m/m':           'מלאי עסקי',
  'Factory Orders m/m':                 'הזמנות מפעלים',
}

// API returns ISO 8601 with ET offset: "2026-05-04T08:30:00-04:00"
// ForexFactory uses US Eastern Time as the reference timezone.
function parseISOEvent(isoStr) {
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return { date: null, time: null }
  // Get ET date ("YYYY-MM-DD") and time ("HH:MM")
  const date = d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const time = d.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false,
  }).replace('24:', '00:')
  return { date, time }
}

async function fetchWeek(url) {
  try {
    const out = await curlGet(url)
    const json = JSON.parse(out)
    return Array.isArray(json) ? json : []
  } catch (e) {
    console.warn('econCalendar fetch failed:', url, e.message.slice(0, 100))
    return []
  }
}

// Compute YYYY-MM-DD for today in New York time (market timezone)
function todayNY() {
  const now = new Date()
  const nyStr = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  return nyStr // already "YYYY-MM-DD" from en-CA locale
}

router.get('/', async (req, res) => {
  try {
    const cacheKey = `econ-cal:${todayNY()}`
    const cached = cache.get(cacheKey)
    if (cached) return res.json(cached)

    const [thisWeek, nextWeek] = await Promise.all([
      fetchWeek('https://nfs.faireconomy.media/ff_calendar_thisweek.json?version=json'),
      fetchWeek('https://nfs.faireconomy.media/ff_calendar_nextweek.json?version=json'),
    ])

    const allRaw = [...thisWeek, ...nextWeek]

    const today = todayNY()
    const endDate = new Date(today + 'T00:00:00Z')
    endDate.setUTCDate(endDate.getUTCDate() + 7)
    const end = endDate.toISOString().slice(0, 10)

    const events = allRaw
      .map(ev => {
        const { date, time } = parseISOEvent(ev.date)
        if (!date || date < today || date > end) return null
        const impact = (ev.impact || '').toLowerCase()
        if (impact === 'holiday') return null // skip bank holidays
        return {
          date,
          time,
          event:       ev.title || '',
          eventHe:     EVENT_HE[ev.title] || ev.title || '',
          country:     COUNTRY_FLAGS[ev.country] || ev.country || '🌐',
          countryCode: ev.country || '',
          impact:      impact === 'high' ? 'high' : impact === 'medium' ? 'medium' : 'low',
          forecast:    ev.forecast || '',
          previous:    ev.previous || '',
          actual:      ev.actual   || '',
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

    cache.set(cacheKey, events)
    res.json(events)
  } catch (err) {
    console.error('econCalendar route error:', err.message)
    res.status(500).json({ error: 'Failed to fetch economic calendar' })
  }
})

export default router
