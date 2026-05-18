export const t = {
  // Navigation
  landing:       { he: 'בית',             en: 'Home' },
  journal:       { he: 'יומן',            en: 'Journal' },

  // Search
  searchPlaceholder: { he: 'חפש מניה, קריפטו...',  en: 'Search stocks, crypto...' },
  clear:         { he: 'נקה',             en: 'Clear' },

  // Market indicators
  sp500:         { he: 'S&P 500',         en: 'S&P 500' },
  nasdaq:        { he: 'נאסד"ק',          en: 'NASDAQ' },
  bitcoin:       { he: 'ביטקויין',         en: 'Bitcoin' },

  // Main page
  technical:     { he: 'טכני',            en: 'Technical' },
  fundamental:   { he: 'פנדמנטלי',        en: 'Fundamental' },
  fundamentalPlaceholder: { he: 'ניתוח פנדמנטלי יתווסף בקרוב', en: 'Fundamental analysis coming soon' },

  // Dashboard
  dashboard:     { he: 'דשבורד',          en: 'Dashboard' },
  addStock:      { he: '+ הוסף מניה',     en: '+ Add Stock' },
  watchlist:     { he: 'רשימת מעקב',      en: 'Watchlist' },
  noStocks:      { he: 'לא נוספו מניות',  en: 'No stocks added' },
  remove:        { he: 'הסר',             en: 'Remove' },
  selectStock:   { he: 'בחר מניה...',     en: 'Select stock...' },

  // Journal
  usMarket:      { he: 'בורסה אמריקאית', en: 'US Market' },
  taMarket:      { he: 'בורסת ת"א',      en: 'TASE' },
  day:           { he: 'יום',             en: 'Day' },
  date:          { he: 'תאריך',           en: 'Date' },
  status:        { he: 'סטטוס',           en: 'Status' },
  holiday:       { he: 'חג / חופשה',      en: 'Holiday' },
  closed:        { he: 'סגור',            en: 'Closed' },
  earlyClose:    { he: 'סגירה מוקדמת עד', en: 'Early close until' },
  addEvent:      { he: 'הוסף אירוע ליומן', en: 'Add to Journal' },
  eventDate:     { he: 'תאריך',           en: 'Date' },
  eventNote:     { he: 'הערה',            en: 'Note' },
  save:          { he: 'שמור',            en: 'Save' },
  yourEvents:    { he: 'האירועים שלי',    en: 'My Events' },
  noEvents:      { he: 'אין אירועים',     en: 'No events' },
  newsCalendar:  { he: 'לוח אירועים כלכליים', en: 'Economic Calendar' },

  // Time periods
  periodHour:    { he: 'שעה', en: '1H' },
  periodDay:     { he: 'יום',  en: '1D' },
  periodWeek:    { he: 'שבוע', en: '1W' },
  periodMonth:   { he: 'חודש', en: '1M' },
  periodYTD:     { he: 'YTD',  en: 'YTD' },

  // Loading / errors
  loading:       { he: 'טוען...',         en: 'Loading...' },
  error:         { he: 'שגיאה בטעינה',    en: 'Failed to load' },
  noData:        { he: 'אין נתונים',      en: 'No data' },
}

// Primary language is Hebrew
export function getText(key) {
  return t[key]?.he ?? key
}
