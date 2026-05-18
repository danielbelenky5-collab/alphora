import { useState, useCallback, useMemo } from 'react'
import ReactApexChart from 'react-apexcharts'
import { useApp } from '../../contexts/AppContext'
import { useFundamentals } from '../../hooks/useFundamentals'
import client from '../../api/client'

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtNum(raw) {
  if (raw == null) return '—'
  if (Math.abs(raw) >= 1e12) return (raw / 1e12).toFixed(2) + 'T'
  if (Math.abs(raw) >= 1e9)  return (raw / 1e9).toFixed(2)  + 'B'
  if (Math.abs(raw) >= 1e6)  return (raw / 1e6).toFixed(2)  + 'M'
  if (Math.abs(raw) >= 1e3)  return (raw / 1e3).toFixed(1)  + 'K'
  return raw.toFixed(2)
}
// Income-statement table formatter — matches Yahoo Finance's "in thousands" display
function fmtTableNum(raw) {
  if (raw == null) return '—'
  return Math.round(raw / 1000).toLocaleString('en-US')
}
function fmtPct(raw)  { return raw == null ? '—' : (raw * 100).toFixed(2) + '%' }
function fmtDate(raw) {
  if (!raw) return '—'
  const d = typeof raw === 'number' ? new Date(raw * 1000) : new Date(raw)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtEPS(raw)  { return raw == null ? '—' : raw.toFixed(2) }

function periodLabel(stmt, type) {
  const raw = stmt?.endDate?.raw
  const fmt = stmt?.endDate?.fmt   // "YYYY-MM-DD" from timeseries or Yahoo
  if (!raw && !fmt) return '—'
  const d = raw ? new Date(raw * 1000) : new Date(fmt + 'T00:00:00')
  if (type === 'annual') return `FY ${d.getFullYear()}`
  // Quarterly: M/DD/YYYY (e.g. 3/31/2026) — same style as Yahoo Finance
  const month = d.getMonth() + 1
  const day   = String(d.getDate()).padStart(2, '0')
  const year  = d.getFullYear()
  return `${month}/${day}/${year}`
}

// ── Row definitions — matches Yahoo Finance income statement exactly ──────────
const INCOME_ROWS = [
  { heLabel: 'הכנסות כוללות',                     enLabel: 'Total Revenue',                                    key: 'totalRevenue' },
  { heLabel: 'עלות הכנסות',                        enLabel: 'Cost of Revenue',                                  key: 'costOfRevenue' },
  { heLabel: 'רווח גולמי',                         enLabel: 'Gross Profit',                                     key: 'grossProfit' },
  { heLabel: 'הוצאות תפעוליות',                    enLabel: 'Operating Expense',                                key: 'totalOperatingExpenses' },
  { heLabel: 'רווח תפעולי',                        enLabel: 'Operating Income',                                 key: 'operatingIncome' },
  { heLabel: 'הכנסות ריבית שאינן תפעוליות, נטו',  enLabel: 'Net Non Operating Interest Income Expense',        key: 'netNonOperatingInterestIncomeExpense' },
  { heLabel: 'הכנסות/הוצאות אחרות',               enLabel: 'Other Income Expense',                             key: 'totalOtherIncomeExpenseNet' },
  { heLabel: 'הכנסה לפני מס',                      enLabel: 'Pretax Income',                                    key: 'incomeBeforeTax' },
  { heLabel: 'הפרשת מס',                           enLabel: 'Tax Provision',                                    key: 'incomeTaxExpense' },
  { heLabel: 'רווח נקי לבעלי מניות רגיליות',       enLabel: 'Net Income Common Stockholders',                   key: 'netIncomeApplicableToCommonShares' },
  { heLabel: 'רווח נקי מדולל לבעלי מניות',         enLabel: 'Diluted NI Available to Common Shareholders',      key: 'dilutedNIAvailableToCommonShareholders' },
  { heLabel: 'EPS בסיסי',                          enLabel: 'Basic EPS',                                        key: 'basicEPS',             fmt: 'eps' },
  { heLabel: 'EPS מדולל',                          enLabel: 'Diluted EPS',                                      key: 'dilutedEPS',           fmt: 'eps' },
  { heLabel: 'מניות ממוצעות בסיסיות',              enLabel: 'Basic Average Shares',                             key: 'basicAverageShares',   fmt: 'shares' },
  { heLabel: 'מניות ממוצעות מדוללות',              enLabel: 'Diluted Average Shares',                           key: 'dilutedAverageShares', fmt: 'shares' },
  { heLabel: 'רווח תפעולי כולל כפי שדווח',         enLabel: 'Total Operating Income As Reported',               key: 'totalOperatingIncomeAsReported' },
  { heLabel: 'הוצאות כוללות',                      enLabel: 'Total Expenses',                                   key: 'totalExpenses' },
  { heLabel: 'רווח נקי מפעילות מתמשכת ומופסקת',   enLabel: 'Net Income from Continuing & Discontinuing Operation', key: 'netIncomeContinuousOperations' },
  { heLabel: 'הכנסה מנורמלת',                      enLabel: 'Normalized Income',                                key: 'normalizedIncome' },
  { heLabel: 'הכנסות ריבית',                       enLabel: 'Interest Income',                                  key: 'interestIncome' },
  { heLabel: 'הוצאות ריבית',                       enLabel: 'Interest Expense',                                 key: 'interestExpense' },
  { heLabel: 'הכנסות ריבית נטו',                   enLabel: 'Net Interest Income',                              key: 'netInterestIncome' },
  { heLabel: 'EBIT',                               enLabel: 'EBIT',                                             key: 'ebit' },
  { heLabel: 'EBITDA',                             enLabel: 'EBITDA',                                           key: 'ebitda' },
  { heLabel: 'עלות הכנסות מתואמת',                 enLabel: 'Reconciled Cost of Revenue',                       key: 'reconciledCostOfRevenue' },
  { heLabel: 'פחת מתואם',                          enLabel: 'Reconciled Depreciation',                          key: 'reconciledDepreciation' },
  { heLabel: 'רווח נקי מפעילות מתמשכת',            enLabel: 'Net Income from Continuing Operations',            key: 'netIncomeFromContinuingOps' },
  { heLabel: 'פריטים חריגים ללא מוניטין',           enLabel: 'Total Unusual Items Excluding Goodwill',           key: 'totalUnusualItemsExcludingGoodwill' },
  { heLabel: 'פריטים חריגים כוללים',               enLabel: 'Total Unusual Items',                              key: 'totalUnusualItems' },
  { heLabel: 'EBITDA מנורמל',                      enLabel: 'Normalized EBITDA',                                key: 'normalizedEBITDA' },
  { heLabel: 'שיעור מס לחישוב',                    enLabel: 'Tax Rate for Calcs',                               key: 'taxRateForCalcs',   fmt: 'pct' },
  { heLabel: 'השפעת מס על פריטים חריגים',          enLabel: 'Tax Effect of Unusual Items',                      key: 'taxEffectOfUnusualItems' },
]

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, C }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: '10px', padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0,
    }}>
      <span style={{ fontSize: '11px', color: C.muted, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ fontSize: '15px', fontWeight: 700, color: color || C.text, fontFamily: 'Inter, sans-serif', wordBreak: 'break-word' }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

// ── Income row — 4 columns matching Yahoo Finance ─────────────────────────────
function IncomeRow({ label, vals, fmt, C, shade }) {
  const format = (v) => {
    if (v == null) return '—'
    if (fmt === 'eps')    return fmtEPS(v)
    if (fmt === 'shares') return fmtTableNum(v)
    if (fmt === 'pct')    return fmtPct(v)
    return fmtTableNum(v)
  }
  return (
    <tr style={{ borderBottom: `1px solid ${C.border}`, background: shade ? C.shadeRow : 'transparent' }}>
      <td style={{ padding: '9px 12px', fontSize: '13px', color: C.text, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
        {label}
      </td>
      {vals.map((v, i) => (
        <td key={i} style={{
          padding: '9px 12px', fontSize: '13px', textAlign: 'right', whiteSpace: 'nowrap',
          fontFamily: 'Inter, sans-serif',
          fontWeight: i === 0 ? 600 : 400,
          color: i === 0 ? C.text : C.muted,
        }}>
          {format(v)}
        </td>
      ))}
    </tr>
  )
}

// ── Toggle button ─────────────────────────────────────────────────────────────
function ToggleBtn({ active, onClick, children, C }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
      border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
      background: active ? C.accent : 'transparent',
      color:      active ? '#fff'   : C.muted,
      transition: 'background .15s',
    }}>
      {children}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FundamentalView({ symbol }) {
  const { theme, lang } = useApp()
  const isDark = theme === 'dark'
  const isHe   = lang === 'he'

  const [descLang,       setDescLang]       = useState('en')
  const [translatedText, setTranslatedText] = useState(null)
  const [translating,    setTranslating]    = useState(false)
  const [translateErr,   setTranslateErr]   = useState(null)
  const [summaryType, setSummaryType] = useState('quarterly')
  const [tableType,   setTableType]   = useState('quarterly')
  const [bsType,      setBsType]      = useState('annual')
  const [debtYears,   setDebtYears]   = useState(5)

  const { data: raw, isLoading, isError } = useFundamentals(symbol)

  const handleTranslate = useCallback(async (text) => {
    if (translatedText) { setDescLang('he'); return }
    setDescLang('he')
    setTranslating(true)
    setTranslateErr(null)
    try {
      const res = await client.get(`/translate?text=${encodeURIComponent(text)}`)
      setTranslatedText(res.translated || text)
    } catch (e) {
      setTranslateErr(isHe ? 'שגיאה בתרגום' : 'Translation failed')
    } finally {
      setTranslating(false)
    }
  }, [translatedText, isHe])

  const C = {
    bg:       isDark ? '#161b22' : '#ffffff',
    card:     isDark ? '#0d1117' : '#f6f8fa',
    border:   isDark ? '#30363d' : '#d0d7de',
    text:     isDark ? '#e6edf3' : '#1c2128',
    muted:    isDark ? '#8b949e' : '#57606a',
    accent:   '#3b6ff5',
    up:       '#26a65b',
    down:     '#e53935',
    shadeRow: isDark ? '#0d111780' : '#f6f8fa80',
  }

  if (isLoading) return (
    <div className="card p-8 flex items-center justify-center min-h-[380px]">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (isError || !raw) return (
    <div className="card p-8 flex items-center justify-center min-h-[380px]">
      <span style={{ color: C.muted, fontFamily: 'Inter, sans-serif' }}>
        {isHe ? 'שגיאה בטעינת נתונים' : 'Failed to load data'}
      </span>
    </div>
  )

  // ── Extract raw data ─────────────────────────────────────────────────────────
  const d         = raw.data ?? raw
  const isPartial = !!d._partial
  const ap  = d.assetProfile              || {}
  const sd  = d.summaryDetail             || {}
  const ks  = d.defaultKeyStatistics      || {}
  const fd  = d.financialData             || {}
  const pr  = d.price                     || {}
  // Quarterly: prefer timeseries (has all Q1/Q2/Q3/Q4 correctly).
  // Yahoo's incomeStatementHistory may only return annual Q4 data for some companies.
  const ishQRaw = (
    d.quarterlyTimeseries?.incomeStatementHistory?.length > 0
      ? d.quarterlyTimeseries.incomeStatementHistory
      : d.incomeStatementHistory?.incomeStatementHistory
  ) || []
  const ishQ = [...ishQRaw].sort((a, b) => (b.endDate?.raw ?? 0) - (a.endDate?.raw ?? 0))

  // Annual: always from timeseries annual
  const ishARaw = d.incomeStatementHistoryAnnual?.incomeStatementHistory || []
  const ishA = [...ishARaw].sort((a, b) => (b.endDate?.raw ?? 0) - (a.endDate?.raw ?? 0))

  const eh   = d.earningsHistory?.history || []
  const cal  = d.calendarEvents?.earnings || {}

  // Balance sheet timeseries
  const bsAnnual    = d.balanceSheetAnnual    || []
  const bsQuarterly = d.balanceSheetQuarterly || []
  const bsStmts     = (bsType === 'annual' ? bsAnnual : bsQuarterly).slice(0, 4)
  const bsLabels    = bsStmts.map(s => periodLabel(s, bsType))

  // Cash flow timeseries
  const cfAnnual    = d.cashflowAnnual    || []
  const cfQuarterly = d.cashflowQuarterly || []

  const vsWord = isHe ? 'מול' : 'vs'

  // ── Summary section (its own toggle) ─────────────────────────────────────────
  const summStmts   = summaryType === 'quarterly' ? ishQ : ishA
  const summCurr    = summStmts[0] || {}
  const summPrev    = summStmts[1] || {}
  const summCurrLbl = periodLabel(summCurr, summaryType)
  const summPrevLbl = periodLabel(summPrev, summaryType)
  const summComp    = summCurrLbl !== '—' && summPrevLbl !== '—'
    ? `${summCurrLbl}  ${vsWord}  ${summPrevLbl}` : summCurrLbl

  // ── Table section (its own toggle) — up to 4 periods ────────────────────────
  const tableStmts = (tableType === 'quarterly' ? ishQ : ishA).slice(0, 4)
  const tableLabels = tableStmts.map(s => periodLabel(s, tableType))
  const tableCurrLbl = tableLabels[0] || '—'

  // ── Beat/Miss ────────────────────────────────────────────────────────────────
  const lastEarning = eh[eh.length - 1] || {}
  const beatMiss = () => {
    const actual = lastEarning.epsActual?.raw
    const est    = lastEarning.epsEstimate?.raw
    if (actual == null || est == null) return { label: '—', color: C.muted }
    const diff = actual - est
    return diff >= 0
      ? { label: `Beat +${diff.toFixed(2)}`, color: C.up }
      : { label: `Miss ${diff.toFixed(2)}`,  color: C.down }
  }
  const bm = beatMiss()

  const lastEarningsDate = cal.earningsDate?.[0]?.raw ?? lastEarning.quarter?.raw ?? null
  const website  = ap.website || null
  const secUrl   = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}&type=10-K&dateb=&owner=include&count=10`
  const yfUrl    = `https://finance.yahoo.com/quote/${symbol}/financials/`

  const marketCap = pr.marketCap?.raw  ?? sd.marketCap?.raw
  const peRatio   = pr.trailingPE?.raw ?? sd.trailingPE?.raw
  const divYield  = sd.dividendYield?.raw

  // FCF Yield = Free Cash Flow (latest annual) / Market Cap
  const latestFCF  = cfAnnual[0]?.freeCashFlow?.raw
  const fcfYield   = (latestFCF != null && marketCap) ? latestFCF / marketCap : null
  const divRate     = sd.dividendRate?.raw
  const exDivDate   = sd.exDividendDate?.raw
  const payDate     = d.calendarEvents?.dividendDate?.raw
  const payoutRatio = sd.payoutRatio?.raw
  const fiveYrYield = sd.fiveYearAvgDividendYield?.raw
  const beta      = ks.beta?.raw       ?? sd.beta?.raw
  const debtEq    = fd.debtToEquity?.raw
  const roe       = fd.returnOnEquity?.raw
  const w52chg    = ks['52WeekChange']?.raw
  const employees = ap.fullTimeEmployees
  const ebitda    = fd.ebitda?.raw

  // Summary card values (from summary section current period)
  const summaryRev  = summCurr.totalRevenue?.raw
  const summaryOpIn = summCurr.operatingIncome?.raw
  const summaryNI   = summCurr.netIncome?.raw ?? summCurr.netIncomeApplicableToCommonShares?.raw
  const summaryEPS  = summCurr.dilutedEPS?.raw ?? summCurr.basicEPS?.raw

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
    gap: '10px',
  }

  const sectionHead = (title, extra) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: '10px', marginTop: '6px',
    }}>
      <div style={{
        fontSize: '13px', fontWeight: 700, color: C.muted,
        fontFamily: 'Inter, sans-serif', textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {title}
      </div>
      {extra}
    </div>
  )

  const makeToggle = (active, setActive) => (
    <div style={{ display: 'flex', gap: '2px', background: C.card, borderRadius: '7px', padding: '2px', border: `1px solid ${C.border}` }}>
      <ToggleBtn active={active === 'quarterly'} onClick={() => setActive('quarterly')} C={C}>
        {isHe ? 'רבעוני' : 'Quarterly'}
      </ToggleBtn>
      <ToggleBtn active={active === 'annual'} onClick={() => setActive('annual')} C={C}>
        {isHe ? 'שנתי' : 'Annual'}
      </ToggleBtn>
    </div>
  )

  return (
    <div className="card overflow-hidden flex flex-col gap-0" style={{ background: C.bg }}>

      {/* ── Stock name header ───────────────────────────────────────────────── */}
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '22px', fontWeight: 800, color: C.text, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}>
          {symbol}
        </span>
        {(pr.shortName || pr.longName || ap.longName) && (
          <span style={{ fontSize: '14px', fontWeight: 400, color: C.muted, fontFamily: 'Inter, sans-serif' }}>
            {pr.longName || pr.shortName || ap.longName}
          </span>
        )}
        {pr.currency && (
          <span style={{
            marginLeft: 'auto', fontSize: '11px', fontWeight: 600,
            color: C.muted, fontFamily: 'Inter, sans-serif',
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: '5px', padding: '2px 8px',
          }}>
            {pr.currency}
          </span>
        )}
      </div>

      {/* ── Quick-links bar ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '8px', flexWrap: 'wrap',
        padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: C.card,
      }}>
        {[
          website ? { label: isHe ? 'אתר החברה' : 'Company Website', href: website, icon: '🌐' } : null,
          { label: isHe ? 'קשרי משקיעים' : 'Investor Relations', href: `https://www.google.com/search?q=${symbol}+investor+relations`, icon: '🔍' },
          { label: 'SEC Filing', href: secUrl, icon: '📄' },
        ].filter(Boolean).map(link => (
          <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '6px',
              fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
              color: C.accent, border: `1px solid ${C.border}`,
              background: C.bg, textDecoration: 'none', transition: 'background .15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = isDark ? '#21262d' : '#eaeef2'}
            onMouseOut={e  => e.currentTarget.style.background = C.bg}
          >
            <span>{link.icon}</span>{link.label}
          </a>
        ))}
      </div>

      {/* ── Partial data warning ────────────────────────────────────────────── */}
      {isPartial && (
        <div style={{
          padding: '10px 20px', fontSize: '12px', fontFamily: 'Inter, sans-serif',
          background: isDark ? '#1c2128' : '#fff8e1',
          borderBottom: `1px solid ${C.border}`,
          color: isDark ? '#e3b341' : '#856404',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span>⚠</span>
          <span>
            {isHe
              ? 'חלק מהנתונים אינם זמינים כרגע — הנתונים יעודכנו אוטומטית בקרוב'
              : 'Some data unavailable — will refresh automatically when API connection restores'}
          </span>
        </div>
      )}

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

        {/* ── Company description ─────────────────────────────────────────── */}
        {ap.longBusinessSummary && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: C.muted, fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isHe ? 'תיאור החברה' : 'Company Description'}
              </span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={() => setDescLang('en')}
                  style={{
                    padding: '3px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                    border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    background: descLang === 'en' ? C.accent : 'transparent',
                    color:      descLang === 'en' ? '#fff'   : C.muted,
                  }}>
                  EN
                </button>
                <button
                  onClick={() => handleTranslate(ap.longBusinessSummary)}
                  disabled={translating}
                  style={{
                    padding: '3px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                    border: 'none', cursor: translating ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif',
                    background: descLang === 'he' ? C.accent : 'transparent',
                    color:      descLang === 'he' ? '#fff'   : C.muted,
                    opacity:    translating ? 0.7 : 1,
                    display:    'flex', alignItems: 'center', gap: '4px',
                  }}>
                  {translating
                    ? <><span style={{ fontSize: '10px' }}>⟳</span> {isHe ? 'מתרגם...' : 'Translating...'}</>
                    : 'HE'
                  }
                </button>
              </div>
            </div>
            {descLang === 'en' ? (
              <p style={{ fontSize: '13px', lineHeight: 1.7, color: C.text, fontFamily: 'Inter, sans-serif', margin: 0 }}>
                {ap.longBusinessSummary}
              </p>
            ) : (
              <p style={{ fontSize: '13px', lineHeight: 1.7, fontFamily: 'Heebo, sans-serif', margin: 0,
                          direction: 'rtl', textAlign: 'right',
                          color: translateErr ? C.down : translatedText ? C.text : C.muted,
                          fontStyle: translateErr ? 'normal' : translatedText ? 'normal' : 'italic' }}>
                {translateErr
                  ? translateErr
                  : translatedText
                    ? translatedText
                    : (isHe ? 'לחץ HE לתרגום...' : 'Click HE to translate...')
                }
              </p>
            )}
          </div>
        )}

        {/* ── Next earnings date banner ──────────────────────────────────── */}
        {(() => {
          const nextEarningsRaw = cal.earningsDate?.[0]?.raw
          if (!nextEarningsRaw) return null
          const nextDate  = new Date(nextEarningsRaw * 1000)
          const today     = new Date()
          const diffDays  = Math.ceil((nextDate - today) / 86400000)
          const isPast    = diffDays < 0
          const isClose   = diffDays >= 0 && diffDays <= 14
          const dateFmt   = nextDate.toLocaleDateString(isHe ? 'he-IL' : 'en-US', {
            day: 'numeric', month: 'long', year: 'numeric'
          })
          const bannerColor = isPast ? C.muted : isClose ? '#e3b341' : C.accent
          const bgColor     = isPast
            ? (isDark ? '#1c212820' : '#f6f8fa')
            : isClose
              ? (isDark ? '#29230a' : '#fffbf0')
              : (isDark ? '#0e1726' : '#edf2ff')
          const borderColor = isPast ? C.border : isClose ? '#614a00' : '#2d5eb5'
          const icon        = isPast ? '📋' : isClose ? '⚡' : '📅'
          const countdown   = isPast
            ? null
            : diffDays === 0
              ? (isHe ? 'היום!' : 'Today!')
              : diffDays === 1
                ? (isHe ? 'מחר' : 'Tomorrow')
                : isHe
                  ? `עוד ${diffDays} ימים`
                  : `in ${diffDays} days`

          return (
            <div style={{
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>{icon}</span>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: bannerColor,
                                fontFamily: 'Inter, sans-serif', textTransform: 'uppercase',
                                letterSpacing: '0.05em', marginBottom: '2px' }}>
                    {isHe ? (isPast ? 'דוח אחרון' : 'דוח רבעוני הבא') : (isPast ? 'Last Earnings' : 'Next Earnings Report')}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.text,
                                fontFamily: 'Inter, sans-serif' }}>
                    {dateFmt}
                  </div>
                </div>
              </div>
              {countdown && (
                <div style={{
                  fontSize: '13px', fontWeight: 700,
                  color: isClose ? '#e3b341' : C.accent,
                  fontFamily: 'Inter, sans-serif',
                  background: isDark ? '#ffffff12' : '#00000010',
                  padding: '4px 12px', borderRadius: '20px',
                }}>
                  {countdown}
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Key metrics grid ────────────────────────────────────────────── */}
        <div>
          {sectionHead(isHe ? 'נתוני מפתח' : 'Key Metrics')}
          <div style={gridStyle}>
            <StatCard label="P/E"                                       value={peRatio   != null ? peRatio.toFixed(2)   : '—'} C={C} />
            <StatCard label={isHe ? 'שווי שוק'      : 'Market Cap'}    value={fmtNum(marketCap)} C={C} />
            <StatCard label="Beta"                                       value={beta      != null ? beta.toFixed(2)      : '—'} C={C} />
            <StatCard label="Debt/Equity"                                value={debtEq    != null ? debtEq.toFixed(2)    : '—'} C={C} />
            <StatCard label="ROE"                                        value={fmtPct(roe)} C={C} />
            <StatCard label={isHe ? 'תשואת דיבידנד' : 'Dividend Yield'} value={fmtPct(divYield)} C={C} />
            <StatCard label={isHe ? 'תשואה 12M'     : '12M Return'}     value={fmtPct(w52chg)}
                      color={w52chg != null ? (w52chg >= 0 ? C.up : C.down) : undefined} C={C} />
            <StatCard label={isHe ? 'עובדים'        : 'Employees'}      value={employees != null ? employees.toLocaleString() : '—'} C={C} />
            <StatCard label="EBITDA"                                      value={fmtNum(ebitda)} C={C} />
            <StatCard label={isHe ? 'דוח אחרון'     : 'Last Earnings'}  value={fmtDate(lastEarningsDate)} C={C} />
            <StatCard label="Beat / Miss"                                 value={bm.label} color={bm.color} C={C} />
            <StatCard label="FCF Yield"
                      value={fcfYield != null ? fmtPct(fcfYield) : '—'}
                      color={fcfYield != null ? (fcfYield >= 0 ? C.up : C.down) : undefined} C={C} />
            <StatCard label="SEC Filing" value={
              <a href={secUrl} target="_blank" rel="noopener noreferrer"
                 style={{ color: C.accent, textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>
                {isHe ? 'צפה →' : 'View →'}
              </a>
            } C={C} />
          </div>
        </div>

        {/* ── Dividend section ────────────────────────────────────────────── */}
        {divYield != null && divYield > 0 && (
          <div>
            {sectionHead(isHe ? '💰 דיבידנד' : '💰 Dividend')}
            <div style={gridStyle}>
              <StatCard label={isHe ? 'תאריך אקס-דיב'    : 'Ex-Div Date'}    value={fmtDate(exDivDate)}  C={C} />
              <StatCard label={isHe ? 'תאריך תשלום'       : 'Pay Date'}       value={fmtDate(payDate)}    C={C} />
              <StatCard label={isHe ? 'דיבידנד למניה'     : 'Div / Share'}    value={divRate != null ? `$${divRate.toFixed(2)}` : '—'} C={C} />
              <StatCard label={isHe ? 'יחס חלוקה'         : 'Payout Ratio'}   value={fmtPct(payoutRatio)} C={C} />
              <StatCard label={isHe ? 'תשואה ממוצעת 5Y'   : '5Y Avg Yield'}   value={fmtPct(fiveYrYield)} C={C} />
            </div>
          </div>
        )}

        {/* ── Summary cards — own toggle ──────────────────────────────────── */}
        {summStmts.length > 0 && summaryRev && (
          <div>
            {sectionHead(
              isHe
                ? (summaryType === 'annual' ? `סיכום שנתי — ${summComp}` : `סיכום רבעוני — ${summComp}`)
                : (summaryType === 'annual' ? `Annual Summary — ${summComp}` : `Quarterly Summary — ${summComp}`),
              makeToggle(summaryType, setSummaryType)
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <StatCard label={isHe ? 'הכנסות' : 'Revenue'}         value={fmtNum(summaryRev)} C={C} />
              <StatCard label={isHe ? 'רווח תפעולי' : 'Oper. Income'} value={fmtNum(summaryOpIn)}
                        color={summaryOpIn != null ? (summaryOpIn >= 0 ? C.up : C.down) : undefined} C={C} />
              <StatCard label="EPS" value={summaryEPS != null ? summaryEPS.toFixed(2) : '—'}
                        color={summaryEPS != null ? (summaryEPS >= 0 ? C.up : C.down) : undefined} C={C} />
              <StatCard label={isHe ? 'רווח נקי' : 'Net Income'} value={fmtNum(summaryNI)}
                        color={summaryNI != null ? (summaryNI >= 0 ? C.up : C.down) : undefined} C={C} />
            </div>
          </div>
        )}

        {/* ── Full income statement table — own toggle ─────────────────────── */}
        {tableStmts.length >= 1 && (
          <div>
            {sectionHead(
              isHe ? 'דוח רווח והפסד' : 'Income Statement',
              makeToggle(tableType, setTableType)
            )}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{
                padding: '7px 12px', fontSize: '11px', color: C.muted,
                fontFamily: 'Inter, sans-serif', borderBottom: `1px solid ${C.border}`,
              }}>
                {isHe ? 'כל הסכומים באלפי דולרים' : 'All amounts in thousands'}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                  <thead>
                    <tr style={{ background: isDark ? '#161b22' : '#f0f2f5' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', color: C.muted, fontFamily: 'Inter, sans-serif', fontWeight: 700, textTransform: 'uppercase', width: '36%' }}>
                        {isHe ? 'פריט' : 'Breakdown'}
                      </th>
                      {tableLabels.map((lbl, i) => (
                        <th key={i} style={{
                          padding: '10px 12px', textAlign: 'right', fontSize: '11px',
                          fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', whiteSpace: 'nowrap',
                          fontWeight: i === 0 ? 700 : 600,
                          color: i === 0 ? C.text : C.muted,
                        }}>
                          {lbl}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {INCOME_ROWS.map((row, i) => {
                      const vals = tableStmts.map(s => s[row.key]?.raw ?? null)
                      if (vals.every(v => v == null)) return null
                      return (
                        <IncomeRow
                          key={row.key}
                          label={isHe ? row.heLabel : row.enLabel}
                          vals={vals}
                          fmt={row.fmt}
                          C={C}
                          shade={i % 2 === 1}
                        />
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Balance Sheet ───────────────────────────────────────────────── */}
        {bsStmts.length > 0 && (
          <div>
            {sectionHead(isHe ? '🏦 מאזן' : '🏦 Balance Sheet', makeToggle(bsType, setBsType))}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '7px 12px', fontSize: '11px', color: C.muted, fontFamily: 'Inter, sans-serif', borderBottom: `1px solid ${C.border}` }}>
                {isHe ? 'כל הסכומים באלפי דולרים' : 'All amounts in thousands'}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                  <thead>
                    <tr style={{ background: isDark ? '#161b22' : '#f0f2f5' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', color: C.muted, fontFamily: 'Inter, sans-serif', fontWeight: 700, textTransform: 'uppercase', width: '36%' }}>
                        {isHe ? 'פריט' : 'Item'}
                      </th>
                      {bsLabels.map((lbl, i) => (
                        <th key={i} style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', color: i === 0 ? C.text : C.muted, fontFamily: 'Inter, sans-serif', fontWeight: i === 0 ? 700 : 500 }}>
                          {lbl}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'totalAssets',      heLabel: 'סך נכסים',          enLabel: 'Total Assets' },
                      { key: 'currentAssets',    heLabel: 'נכסים שוטפים',       enLabel: 'Current Assets' },
                      { key: 'totalLiabilities', heLabel: 'סך התחייבויות',      enLabel: 'Total Liabilities' },
                      { key: 'currentLiabilities',heLabel: 'התחייבויות שוטפות', enLabel: 'Current Liabilities' },
                      { key: 'totalDebt',        heLabel: 'חוב כולל',           enLabel: 'Total Debt' },
                      { key: 'commonStockEquity',heLabel: 'הון עצמי',           enLabel: 'Stockholders Equity' },
                    ].map((row, i) => {
                      const vals = bsStmts.map(s => s[row.key]?.raw ?? null)
                      if (vals.every(v => v == null)) return null
                      return (
                        <tr key={row.key} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 1 ? (isDark ? '#ffffff06' : '#f9fafb') : 'transparent' }}>
                          <td style={{ padding: '9px 12px', fontSize: '13px', color: C.text, fontFamily: 'Inter, sans-serif' }}>{isHe ? row.heLabel : row.enLabel}</td>
                          {vals.map((v, j) => (
                            <td key={j} style={{ padding: '9px 12px', fontSize: '13px', textAlign: 'right', fontFamily: 'Inter, sans-serif', fontWeight: j === 0 ? 600 : 400, color: j === 0 ? C.text : C.muted }}>
                              {v != null ? Math.round(v / 1000).toLocaleString('en-US') : '—'}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Debt / Assets over time ─────────────────────────────────────── */}
        {bsAnnual.length >= 2 && (
          <DebtChart bsAnnual={bsAnnual} isHe={isHe} C={C} isDark={isDark} />
        )}

        {/* ── Analyst Ratings ────────────────────────────────────────────── */}
        <AnalystRatings fd={fd} rt={d.recommendationTrend} ug={d.upgradeDowngradeHistory} isHe={isHe} C={C} isDark={isDark} symbol={symbol} />

      </div>
    </div>
  )
}

// ── Debt / Assets over time chart ────────────────────────────────────────────
function DebtChart({ bsAnnual, isHe, C, isDark }) {
  const [activeIdx, setActiveIdx] = useState(0)   // index into yearOptions

  // All annual records sorted oldest→newest, valid dates only
  const allSorted = useMemo(() =>
    [...bsAnnual]
      .filter(s => s.endDate?.raw)
      .sort((a, b) => (a.endDate.raw ?? 0) - (b.endDate.raw ?? 0)),
    [bsAnnual]
  )

  // Helper: get year from a statement
  const getYear = s =>
    s.endDate?.fmt
      ? parseInt(s.endDate.fmt.slice(0, 4), 10)
      : new Date((s.endDate.raw) * 1000).getFullYear()

  // Build options [1,3,5,10] keeping only those with data AND unique bar count
  const yearOptions = useMemo(() => {
    const OPTS = [1, 3, 5, 10]
    const seenCount = new Set()
    const result = []
    for (const y of OPTS) {
      const cutoff = new Date().getFullYear() - y
      const items  = allSorted.filter(s => getYear(s) >= cutoff)
      if (items.length === 0) continue          // no data → skip
      if (seenCount.has(items.length)) continue // same bars as smaller range → skip
      seenCount.add(items.length)
      result.push({ label: `${items.length}Y`, items })
    }
    return result
  }, [allSorted])

  // Keep activeIdx in bounds if yearOptions changes
  const safeIdx    = Math.min(activeIdx, Math.max(0, yearOptions.length - 1))
  const activeOpt  = yearOptions[safeIdx] || null
  const filtered   = activeOpt?.items || allSorted

  if (!filtered.length) return null

  const categories = filtered.map(s =>
    s.endDate?.fmt ? `FY ${s.endDate.fmt.slice(0, 4)}` : '—'
  )
  const toB = v => v != null ? parseFloat((v / 1e9).toFixed(2)) : null

  const series = [
    { name: isHe ? 'סך נכסים' : 'Total Assets',   data: filtered.map(s => toB(s.totalAssets?.raw)) },
    { name: isHe ? 'חוב כולל' : 'Total Debt',      data: filtered.map(s => toB(s.totalDebt?.raw)) },
    { name: isHe ? 'הון עצמי' : 'Equity',          data: filtered.map(s => toB(s.commonStockEquity?.raw)) },
  ].filter(s => s.data.some(v => v != null))

  if (!series.length) return null

  const options = {
    chart: { type: 'bar', background: C.card, toolbar: { show: false }, animations: { enabled: false } },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: ['#3b6ff5', '#e53935', '#26a65b'],
    xaxis: { categories, labels: { style: { colors: C.text, fontSize: '11px', fontFamily: 'Inter, sans-serif' } } },
    yaxis: { labels: { style: { colors: C.text, fontSize: '11px', fontFamily: 'Inter, sans-serif' }, formatter: v => `$${v}B` } },
    legend: { labels: { colors: C.text }, fontFamily: 'Inter, sans-serif', fontSize: '12px' },
    dataLabels: { enabled: false },
    grid: { borderColor: isDark ? '#1e2630' : '#e8eaed', strokeDashArray: 2 },
    plotOptions: { bar: { columnWidth: filtered.length <= 3 ? '40%' : '60%', borderRadius: 3 } },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: v => `$${v}B` } },
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, marginTop: 6 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: C.muted, fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isHe ? '📊 חוב ונכסים לאורך זמן' : '📊 Debt & Assets over Time'}
        </div>
        {yearOptions.length > 1 && (
          <div style={{ display: 'flex', gap: '2px', background: C.card, borderRadius: '7px', padding: '2px', border: `1px solid ${C.border}` }}>
            {yearOptions.map((opt, i) => (
              <button key={opt.label} onClick={() => setActiveIdx(i)}
                style={{ padding: '3px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
                  background: safeIdx === i ? '#3b6ff5' : 'transparent',
                  color:      safeIdx === i ? '#fff'    : C.text }}>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden', padding: '8px 4px 4px' }}>
        <ReactApexChart key={`debt-${safeIdx}-${isDark}`} type="bar" series={series} options={options} height={240} />
      </div>
    </div>
  )
}

// ── Analyst Ratings component ─────────────────────────────────────────────────
function AnalystRatings({ fd, rt, ug, isHe, C, isDark, symbol }) {
  const ratingKey   = fd.recommendationKey   // "buy","overweight","hold","underperform","sell"
  const numAnalysts = fd.numberOfAnalystOpinions?.raw
  const targetMean  = fd.targetMeanPrice?.raw
  const targetHigh  = fd.targetHighPrice?.raw
  const targetLow   = fd.targetLowPrice?.raw
  const currentPrice = fd.currentPrice?.raw

  const trend = rt?.trend || []
  const latest = trend.find(t => t.period === '0m') || trend[0] || null

  const upgrades = (ug?.history || []).slice(0, 8)

  if (!ratingKey && !latest && !targetMean) return null

  const RATING_META = {
    strongbuy:    { label: isHe ? 'קנייה חזקה' : 'Strong Buy',    color: '#16a34a', bg: '#16a34a22' },
    buy:          { label: isHe ? 'קנייה'       : 'Buy',           color: '#22c55e', bg: '#22c55e22' },
    overweight:   { label: isHe ? 'קנייה'       : 'Buy',           color: '#22c55e', bg: '#22c55e22' },
    outperform:   { label: isHe ? 'קנייה'       : 'Outperform',    color: '#22c55e', bg: '#22c55e22' },
    hold:         { label: isHe ? 'החזקה'       : 'Hold',          color: '#f59e0b', bg: '#f59e0b22' },
    neutral:      { label: isHe ? 'ניטרלי'      : 'Neutral',       color: '#f59e0b', bg: '#f59e0b22' },
    underweight:  { label: isHe ? 'מכירה'       : 'Sell',          color: '#ef4444', bg: '#ef444422' },
    underperform: { label: isHe ? 'מכירה'       : 'Underperform',  color: '#ef4444', bg: '#ef444422' },
    sell:         { label: isHe ? 'מכירה חזקה'  : 'Sell',          color: '#dc2626', bg: '#dc262622' },
  }

  const meta = RATING_META[ratingKey?.toLowerCase()] || { label: ratingKey, color: C.muted, bg: C.card }

  const upside = targetMean && currentPrice
    ? ((targetMean - currentPrice) / currentPrice) * 100
    : null

  const barGroups = latest ? [
    { key: 'strongBuy',  label: isHe ? 'קנייה חזקה' : 'Strong Buy',   color: '#16a34a', val: latest.strongBuy  || 0 },
    { key: 'buy',        label: isHe ? 'קנייה'       : 'Buy',          color: '#22c55e', val: latest.buy        || 0 },
    { key: 'hold',       label: isHe ? 'החזקה'       : 'Hold',         color: '#f59e0b', val: latest.hold       || 0 },
    { key: 'sell',       label: isHe ? 'מכירה'       : 'Sell',         color: '#ef4444', val: latest.sell       || 0 },
    { key: 'strongSell', label: isHe ? 'מכירה חזקה'  : 'Strong Sell',  color: '#dc2626', val: latest.strongSell || 0 },
  ] : []
  const totalVotes = barGroups.reduce((s, g) => s + g.val, 0)

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, fontFamily: 'Inter, sans-serif',
                      textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isHe ? 'הערכות אנליסטים' : 'Analyst Ratings'}
        </div>
        {numAnalysts && (
          <span style={{ fontSize: 12, color: C.muted, fontFamily: 'Inter, sans-serif' }}>
            {numAnalysts} {isHe ? 'אנליסטים' : 'analysts'}
          </span>
        )}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Consensus + price targets row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>

          {/* Consensus pill */}
          {ratingKey && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: meta.bg, border: `1.5px solid ${meta.color}44`,
              borderRadius: 10, padding: '10px 20px',
            }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: meta.color, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.5px' }}>
                {meta.label}
              </span>
            </div>
          )}

          {/* Price targets */}
          {targetMean && (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, color: C.muted, fontFamily: 'Inter, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                  {isHe ? 'יעד מחיר ממוצע' : 'Mean Target'}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: 'Inter, sans-serif' }}>
                    ${targetMean.toFixed(2)}
                  </span>
                  {upside != null && (
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                                   color: upside >= 0 ? '#22c55e' : '#ef4444' }}>
                      {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              {targetLow && targetHigh && (
                <div>
                  <div style={{ fontSize: 10, color: C.muted, fontFamily: 'Inter, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                    {isHe ? 'טווח יעד' : 'Target Range'}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif' }}>
                    ${targetLow.toFixed(2)} — ${targetHigh.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Breakdown bars */}
        {barGroups.length > 0 && totalVotes > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {barGroups.map(g => (
              <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: C.muted, fontFamily: 'Inter, sans-serif', minWidth: 80, textAlign: isHe ? 'right' : 'left' }}>
                  {g.label}
                </span>
                <div style={{ flex: 1, height: 8, background: isDark ? '#21262d' : '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(g.val / totalVotes) * 100}%`, height: '100%',
                    background: g.color, borderRadius: 4,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif', minWidth: 20, textAlign: 'right' }}>
                  {g.val}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Recent upgrades/downgrades */}
        {upgrades.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, fontFamily: 'Inter, sans-serif',
                          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              {isHe ? 'שינויי דירוג אחרונים' : 'Recent Rating Changes'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {upgrades.map((u, i) => {
                const date = u.epochGradeDate
                  ? new Date(u.epochGradeDate * 1000).toLocaleDateString(isHe ? 'he-IL' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'
                const isUpgrade = (u.action || '').toLowerCase().includes('up')
                const isDowngrade = (u.action || '').toLowerCase().includes('down')
                const actionColor = isUpgrade ? '#22c55e' : isDowngrade ? '#ef4444' : C.muted
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 0',
                    borderBottom: i < upgrades.length - 1 ? `1px solid ${C.border}40` : 'none',
                  }}>
                    <span style={{ fontSize: 11, color: C.muted, fontFamily: 'Inter, sans-serif', minWidth: 80, flexShrink: 0 }}>{date}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: 'Inter, sans-serif', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.firm || '—'}</span>
                    {u.fromGrade && u.toGrade && (
                      <span style={{ fontSize: 11, color: C.muted, fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
                        {u.fromGrade} → {u.toGrade}
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Inter, sans-serif', color: actionColor, flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
                      {isUpgrade ? '▲ ' : isDowngrade ? '▼ ' : ''}{u.action || '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
