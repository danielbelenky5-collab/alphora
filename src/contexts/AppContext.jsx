import { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext(null)

// ── Translation strings ───────────────────────────────────────────────────────
const STRINGS = {
  // Nav
  journal:     { he: 'יומן',      en: 'Journal' },
  news:        { he: 'חדשות',    en: 'News' },
  portfolio:   { he: 'תיק',      en: 'Portfolio' },
  home:        { he: 'בית',      en: 'Home' },

  // Search
  searchPlaceholder: { he: 'חפש מניה, קריפטו, מדד...', en: 'Search stocks, crypto, index...' },
  searchHint:  { he: 'לדוגמה: AAPL, TSLA, BTC',        en: 'e.g. AAPL, TSLA, BTC' },
  noResults:   { he: 'לא נמצאו תוצאות',  en: 'No results found' },
  loading:     { he: 'טוען...',            en: 'Loading...' },

  // Market labels
  sp500:       { he: 'S&P 500',           en: 'S&P 500' },
  nasdaq:      { he: 'נאסד"ק',            en: 'NASDAQ' },
  bitcoin:     { he: 'ביטקויין',           en: 'Bitcoin' },

  // Time periods
  periodHour:  { he: 'שעה',   en: '1H' },
  periodDay:   { he: 'יום',   en: '1D' },
  periodWeek:  { he: 'שבוע',  en: '1W' },
  periodMonth: { he: 'חודש',  en: '1M' },
  periodYTD:   { he: 'YTD',   en: 'YTD' },

  // View toggle
  technical:   { he: 'טכני',       en: 'Technical' },
  fundamental: { he: 'פנדמנטלי',   en: 'Fundamental' },
  fundamentalPlaceholder: { he: 'ניתוח פנדמנטלי יתווסף בקרוב', en: 'Fundamental analysis coming soon' },
  fundamentalSub: { he: 'P/E, EPS, מחזור, שווי שוק ועוד', en: 'P/E, EPS, Volume, Market Cap and more' },

  // Dashboard
  dashboard:   { he: 'דשבורד',          en: 'Dashboard' },
  addStock:    { he: '+ הוסף מניה',     en: '+ Add Stock' },
  noStocks:    { he: 'לא נוספו מניות',  en: 'No stocks added' },
  filterStocks:{ he: 'סנן...',           en: 'Filter...' },
  allAdded:    { he: 'כל המניות כבר נוספו', en: 'All stocks already added' },

  // Journal
  holidayCalendar: { he: 'לוח חופשות בורסה', en: 'Exchange Holiday Calendar' },
  usMarket:    { he: 'בורסה אמריקאית',  en: 'US Market' },
  taMarket:    { he: 'בורסת ת"א',       en: 'TASE' },
  day:         { he: 'יום',              en: 'Day' },
  date:        { he: 'תאריך',            en: 'Date' },
  event:       { he: 'אירוע',            en: 'Event' },
  status:      { he: 'סטטוס',            en: 'Status' },
  closed:      { he: 'סגור',             en: 'Closed' },
  earlyClose:  { he: 'סגירה מוקדמת עד', en: 'Early close until' },
  noUpcoming:  { he: 'אין אירועים קרובים', en: 'No upcoming events' },
  personalJournal: { he: 'יומן אישי',   en: 'Personal Journal' },
  addEvent:    { he: 'הוסף אירוע ליומן', en: 'Add Journal Event' },
  notePlaceholder: { he: 'הערה, אירוע...',  en: 'Note, event...' },
  save:        { he: 'שמור',             en: 'Save' },
  myEvents:    { he: 'האירועים שלי',     en: 'My Events' },
  economicCalendar: { he: 'לוח אירועים כלכליים', en: 'Economic Calendar' },
  investingCom: { he: '', en: '' },
  impactHigh:  { he: 'גבוה',   en: 'High' },
  impactMed:   { he: 'בינוני', en: 'Medium' },
  impactLow:   { he: 'נמוך',   en: 'Low' },

  // Misc
  priceChart:  { he: 'גרף מחיר',         en: 'Price Chart' },
  realtimeData: { he: 'נתוני שוק בזמן אמת', en: 'Real-time market data' },
  loadingChart: { he: 'טוען גרף...',      en: 'Loading chart...' },
  loadingError: { he: 'שגיאה בטעינת לוח השנה', en: 'Failed to load calendar' },
}

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [lang,  setLang]  = useState(() => localStorage.getItem('lang')  || 'he')

  // Apply theme and lang to <html>
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('dark', 'light')
    html.classList.add(theme)
    html.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr')
    html.setAttribute('lang', lang)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr')
    html.setAttribute('lang', lang)
    localStorage.setItem('lang', lang)
  }, [lang])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }
  function toggleLang() {
    setLang(l => l === 'he' ? 'en' : 'he')
  }

  // Translation function
  function t(key) {
    const entry = STRINGS[key]
    if (!entry) return key
    return entry[lang] ?? entry.he
  }

  return (
    <AppContext.Provider value={{ theme, toggleTheme, lang, toggleLang, t }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
