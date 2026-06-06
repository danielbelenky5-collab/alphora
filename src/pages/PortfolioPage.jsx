import { useState, useMemo, useEffect, useCallback } from 'react'
import ReactApexChart from 'react-apexcharts'
import { useQuery } from '@tanstack/react-query'
import TopBar from '../components/layout/TopBar'
import PortfolioVsSpyChart from '../components/portfolio/PortfolioVsSpyChart'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { exportPositionsCsv } from '../utils/exportCsv'
import client from '../api/client'

// ── API helper (server-side persistence) ──────────────────────────────────────
const TOKEN_KEY = 'alphora_token'
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

// ── Storage ────────────────────────────────────────────────────────────────────
const PORTFOLIOS_KEY = 'alphora_portfolios_v1'
const WATCHLIST_KEY  = 'alphora_watchlist_v1'
const CHART_COLORS   = ['#3b6ff5','#26a65b','#f59e0b','#8b5cf6','#06b6d4','#e53935','#ec4899','#14b8a6','#f97316','#a855f7','#0ea5e9','#84cc16']

function loadPortfolios() {
  try {
    const saved = JSON.parse(localStorage.getItem(PORTFOLIOS_KEY))
    if (saved?.portfolios?.length) return saved
  } catch {}
  // One-time migration from old single-portfolio schema
  try {
    const old = JSON.parse(localStorage.getItem('alphora_portfolio_v2'))
    if (old?.positions) {
      const migrated = { active: 'main', portfolios: [{ id: 'main', name: 'ראשי', positions: old.positions }] }
      localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(migrated))
      return migrated
    }
  } catch {}
  return { active: 'main', portfolios: [{ id: 'main', name: 'ראשי', positions: [] }] }
}
function savePortfolios(d) { localStorage.setItem(PORTFOLIOS_KEY, JSON.stringify(d)) }

const MONTH_NAMES_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_NAMES_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

function loadWatchlist()    { try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || [] } catch { return [] } }
function saveWatchlist(d)   { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(d)) }
function uid()              { return Date.now().toString(36) + Math.random().toString(36).slice(2,6) }

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtMoney(n, decimals = 2) {
  if (n == null) return '—'
  return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
function calcPnl(pos) {
  if (pos.sellPrice == null || !pos.buyPrice || !pos.quantity) return null
  return pos.direction === 'long'
    ? (pos.sellPrice - pos.buyPrice) * pos.quantity
    : (pos.buyPrice  - pos.sellPrice) * pos.quantity
}
function mkC(isDark) {
  return {
    bg: isDark?'#0d1117':'#f6f8fa', card: isDark?'#161b22':'#ffffff',
    border: isDark?'#30363d':'#d0d7de', text: isDark?'#e6edf3':'#1c2128',
    muted: isDark?'#8b949e':'#57606a', hover: isDark?'#1c2128':'#f0f6ff',
    hdr: isDark?'#21262d':'#eaeef2', accent: '#3b6ff5',
    green: '#26a65b', red: '#DC2626', orange: '#D97706',
  }
}

// ── Alert Toast ────────────────────────────────────────────────────────────────
function AlertToast({ alerts, onDismiss, isHe }) {
  useEffect(() => {
    if (!alerts.length) return
    const t = setTimeout(() => onDismiss(alerts[0].id), 20000)
    return () => clearTimeout(t)
  }, [alerts, onDismiss])

  if (!alerts.length) return null
  return (
    <div style={{ position:'fixed', bottom:'24px', right:'24px', zIndex:3000, display:'flex', flexDirection:'column', gap:'10px', maxWidth:'340px' }}>
      {alerts.map(a => (
        <div key={a.id} style={{ background: a.dir === 'above' ? '#26a65b' : '#DC2626',
          color:'#fff', borderRadius:'12px', padding:'14px 16px', boxShadow:'0 8px 32px rgba(0,0,0,0.35)',
          display:'flex', flexDirection:'column', gap:'6px', animation:'slideIn 0.25s ease' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px' }}>
            <div style={{ fontSize:'15px', fontWeight:800, fontFamily:'Inter,sans-serif' }}>
              🚨 {a.symbol}
            </div>
            <button onClick={() => onDismiss(a.id)}
              style={{ background:'rgba(255,255,255,0.25)', border:'none', borderRadius:'50%', width:'22px', height:'22px', cursor:'pointer', color:'#fff', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
              ×
            </button>
          </div>
          <div style={{ fontSize:'13px', fontFamily:'Heebo,sans-serif', lineHeight:1.5 }}>
            {isHe
              ? `${a.dir === 'above' ? '📈 עברה מעל' : '📉 ירדה מתחת ל'} $${a.alertPrice} → ${fmtMoney(a.currentPrice)}`
              : `${a.dir === 'above' ? '📈 Broke above' : '📉 Dropped below'} $${a.alertPrice} → ${fmtMoney(a.currentPrice)}`
            }
          </div>
          {a.entryStage && (
            <div style={{ fontSize:'11px', opacity:0.85, fontFamily:'Inter,sans-serif' }}>
              {isHe ? 'שלב כניסה: ' : 'Entry: '}{a.entryStage}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Position Modal ─────────────────────────────────────────────────────────────
const EMPTY_POS = {
  buyDate: new Date().toISOString().slice(0,10),
  symbol:'', direction:'long', buyPrice:'', quantity:'',
  sellDate:'', sellPrice:'', notes:'',
  stopLoss:'', targetPrice:'', accountSize:'', riskPct:'1',
}

// ── Risk math helpers ──────────────────────────────────────────────────────────
function calcRR(direction, buyPrice, stopLoss, targetPrice) {
  if (!buyPrice || !stopLoss || !targetPrice) return null
  if (direction === 'long') {
    const risk   = buyPrice  - stopLoss
    const reward = targetPrice - buyPrice
    if (risk <= 0 || reward <= 0) return null
    return reward / risk
  } else {
    const risk   = stopLoss   - buyPrice
    const reward = buyPrice   - targetPrice
    if (risk <= 0 || reward <= 0) return null
    return reward / risk
  }
}

function suggestedQty(accountSize, riskPct, buyPrice, stopLoss) {
  if (!accountSize || !riskPct || !buyPrice || !stopLoss) return null
  const riskPerShare = Math.abs(buyPrice - stopLoss)
  if (riskPerShare <= 0) return null
  const dollarsAtRisk = accountSize * (riskPct / 100)
  return Math.floor(dollarsAtRisk / riskPerShare)
}

// Compute deep analytics over closed positions for a year
function computeTradeAnalytics(yearPos) {
  const closed = yearPos.filter(p => p.sellPrice != null && p.sellDate)
  if (!closed.length) return null

  const pnls       = closed.map(p => ({ pos:p, pnl:calcPnl(p) })).filter(x => x.pnl != null)
  const wins       = pnls.filter(x => x.pnl > 0)
  const losses     = pnls.filter(x => x.pnl < 0)
  const winRate    = pnls.length ? (wins.length / pnls.length * 100) : 0
  const avgWin     = wins.length   ? wins.reduce((s,x)=>s+x.pnl,0)   / wins.length   : 0
  const avgLoss    = losses.length ? losses.reduce((s,x)=>s+x.pnl,0) / losses.length : 0
  const largestWin = wins.length   ? Math.max(...wins.map(x=>x.pnl)) : 0
  const largestLoss= losses.length ? Math.min(...losses.map(x=>x.pnl)) : 0
  const grossProfit= wins.reduce((s,x)=>s+x.pnl, 0)
  const grossLoss  = Math.abs(losses.reduce((s,x)=>s+x.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0)

  // Avg holding days
  const holdingDays = pnls
    .map(x => {
      const buy  = new Date(x.pos.buyDate).getTime()
      const sell = new Date(x.pos.sellDate).getTime()
      return Math.max(0, Math.round((sell - buy) / 86400000))
    })
  const avgHolding = holdingDays.length ? holdingDays.reduce((s,d)=>s+d,0) / holdingDays.length : 0

  // Best / worst symbol by total P&L
  const bySymbol = {}
  for (const x of pnls) bySymbol[x.pos.symbol] = (bySymbol[x.pos.symbol] || 0) + x.pnl
  const symEntries = Object.entries(bySymbol)
  const bestSymbol  = symEntries.length ? symEntries.reduce((a,b) => b[1] > a[1] ? b : a) : null
  const worstSymbol = symEntries.length ? symEntries.reduce((a,b) => b[1] < a[1] ? b : a) : null

  // Streaks (chronological by sellDate)
  const sorted = [...pnls].sort((a,b) => a.pos.sellDate.localeCompare(b.pos.sellDate))
  let curWinStreak = 0, maxWinStreak = 0, curLossStreak = 0, maxLossStreak = 0
  for (const x of sorted) {
    if (x.pnl > 0) { curWinStreak++; curLossStreak = 0; maxWinStreak = Math.max(maxWinStreak, curWinStreak) }
    else if (x.pnl < 0) { curLossStreak++; curWinStreak = 0; maxLossStreak = Math.max(maxLossStreak, curLossStreak) }
    else { curWinStreak = 0; curLossStreak = 0 }
  }

  // Long vs Short
  const longPnls  = pnls.filter(x => x.pos.direction === 'long').map(x => x.pnl)
  const shortPnls = pnls.filter(x => x.pos.direction === 'short').map(x => x.pnl)
  const longTotal  = longPnls.reduce((s,p)=>s+p,0)
  const shortTotal = shortPnls.reduce((s,p)=>s+p,0)

  return {
    count: pnls.length,
    winRate, avgWin, avgLoss, largestWin, largestLoss,
    profitFactor, avgHolding,
    bestSymbol, worstSymbol,
    maxWinStreak, maxLossStreak,
    longCount: longPnls.length,  longTotal,
    shortCount: shortPnls.length, shortTotal,
  }
}

// Did the trade follow its plan? Returns 'followed' | 'deviated' | null
function planOutcome(pos) {
  if (pos.sellPrice == null) return null
  if (!pos.stopLoss && !pos.targetPrice) return null
  if (pos.direction === 'long') {
    // Followed plan if sell happened at/near target (won) or at/near stop (lost)
    const hitTarget = pos.targetPrice && pos.sellPrice >= pos.targetPrice * 0.98
    const hitStop   = pos.stopLoss    && pos.sellPrice <= pos.stopLoss    * 1.02
    return (hitTarget || hitStop) ? 'followed' : 'deviated'
  } else {
    const hitTarget = pos.targetPrice && pos.sellPrice <= pos.targetPrice * 1.02
    const hitStop   = pos.stopLoss    && pos.sellPrice >= pos.stopLoss    * 0.98
    return (hitTarget || hitStop) ? 'followed' : 'deviated'
  }
}

function PositionModal({ initial, onSave, onClose, isDark, isHe }) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState(() => !initial ? EMPTY_POS : {
    buyDate:    initial.buyDate    || '',
    symbol:     initial.symbol     || '',
    direction:  initial.direction  || 'long',
    buyPrice:   initial.buyPrice   != null ? String(initial.buyPrice)   : '',
    quantity:   initial.quantity   != null ? String(initial.quantity)   : '',
    sellDate:   initial.sellDate   || '',
    sellPrice:  initial.sellPrice  != null ? String(initial.sellPrice)  : '',
    notes:      initial.notes      || '',
    stopLoss:   initial.stopLoss   != null ? String(initial.stopLoss)   : '',
    targetPrice:initial.targetPrice!= null ? String(initial.targetPrice): '',
    accountSize:initial.accountSize!= null ? String(initial.accountSize): '',
    riskPct:    initial.riskPct    != null ? String(initial.riskPct)    : '1',
  })
  const [err, setErr] = useState('')
  const C = mkC(isDark)

  const inp = { padding:'7px 10px', borderRadius:'6px', fontSize:'13px', background:C.bg, color:C.text, border:`1px solid ${C.border}`, outline:'none', fontFamily:'Inter,sans-serif', width:'100%', boxSizing:'border-box' }
  const lbl = { fontSize:'11px', fontWeight:700, color:C.muted, fontFamily:'Inter,sans-serif', marginBottom:'4px', display:'block', textTransform:'uppercase', letterSpacing:'0.05em' }

  const buyPrice    = parseFloat(form.buyPrice)
  const qty         = parseInt(form.quantity)
  const sellPrice   = parseFloat(form.sellPrice)
  const stopLoss    = parseFloat(form.stopLoss)
  const targetPrice = parseFloat(form.targetPrice)
  const accountSize = parseFloat(form.accountSize)
  const riskPct     = parseFloat(form.riskPct)
  const totalCost = buyPrice > 0 && qty > 0 ? buyPrice * qty : null
  const pnlPreview = sellPrice > 0 && totalCost
    ? calcPnl({ direction:form.direction, buyPrice, sellPrice, quantity:qty }) : null
  const rr = calcRR(form.direction, buyPrice || null, stopLoss || null, targetPrice || null)
  const suggested = suggestedQty(accountSize || null, riskPct || null, buyPrice || null, stopLoss || null)

  function submit() {
    if (!form.buyDate||!form.symbol||!form.buyPrice||!form.quantity) { setErr(isHe?'שדות חובה חסרים':'Required fields missing'); return }
    if (isNaN(buyPrice)||buyPrice<=0||isNaN(qty)||qty<=0) { setErr(isHe?'מחיר וכמות חייבים להיות חיוביים':'Price and qty must be positive'); return }
    let finalSell = null, finalSellDate = null
    if (form.sellPrice) {
      finalSell = parseFloat(form.sellPrice)
      if (isNaN(finalSell)||finalSell<=0) { setErr(isHe?'מחיר מכירה לא תקין':'Invalid sell price'); return }
      finalSellDate = form.sellDate || form.buyDate
    }
    onSave({
      buyDate:    form.buyDate,
      symbol:     form.symbol.toUpperCase().trim(),
      direction:  form.direction,
      buyPrice, quantity:qty,
      sellDate:   finalSellDate, sellPrice: finalSell,
      notes:      form.notes.trim(),
      stopLoss:   form.stopLoss    && !isNaN(stopLoss)    ? stopLoss    : null,
      targetPrice:form.targetPrice && !isNaN(targetPrice) ? targetPrice : null,
      accountSize:form.accountSize && !isNaN(accountSize) ? accountSize : null,
      riskPct:    form.riskPct     && !isNaN(riskPct)     ? riskPct     : null,
    })
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'12px', padding:'24px', width:'100%', maxWidth:'460px', display:'flex', flexDirection:'column', gap:'16px', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h2 style={{ margin:0, fontSize:'16px', fontWeight:700, color:C.text, fontFamily:'Inter,sans-serif' }}>
            {isEdit?(isHe?'✏️ ערוך פוזיציה':'✏️ Edit Position'):(isHe?'+ פוזיציה חדשה':'+ New Position')}
          </h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:C.muted }}>×</button>
        </div>

        {/* Buy */}
        <div style={{ border:`1px solid ${C.border}`, borderRadius:'8px', padding:'14px', display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:C.green, fontFamily:'Inter,sans-serif', textTransform:'uppercase', letterSpacing:'0.06em' }}>📈 {isHe?'קנייה':'Buy'}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div><label style={lbl}>{isHe?'תאריך קנייה':'Buy Date'}</label>
              <input type="date" value={form.buyDate} onChange={e=>setForm(f=>({...f,buyDate:e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>{isHe?'מניה':'Symbol'}</label>
              <input type="text" value={form.symbol} placeholder="AAPL" onChange={e=>setForm(f=>({...f,symbol:e.target.value.toUpperCase()}))} style={inp} /></div>
          </div>
          <div>
            <label style={lbl}>{isHe?'כיוון':'Direction'}</label>
            <div style={{ display:'flex', gap:'8px' }}>
              {['long','short'].map(d=>(
                <button key={d} onClick={()=>setForm(f=>({...f,direction:d}))}
                  style={{ flex:1, padding:'8px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:700, fontFamily:'Inter,sans-serif',
                    background:form.direction===d?(d==='long'?'#2563EB':C.orange):C.bg,
                    color:form.direction===d?'#fff':C.muted }}>
                  {d==='long'?(isHe?'↑ לונג':'↑ LONG'):(isHe?'↓ שורט':'↓ SHORT')}
                </button>))}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div><label style={lbl}>{isHe?'מחיר קנייה ($)':'Buy Price ($)'}</label>
              <input type="number" min="0.01" step="0.01" value={form.buyPrice} placeholder="0.00" onChange={e=>setForm(f=>({...f,buyPrice:e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>{isHe?'כמות':'Quantity'}</label>
              <input type="number" min="1" step="1" value={form.quantity} placeholder="0" onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} style={inp} /></div>
          </div>
          {totalCost!=null && <div style={{ background:C.bg, borderRadius:'6px', padding:'8px 12px', fontSize:'12px', fontFamily:'Inter,sans-serif', color:C.muted }}>{isHe?'עלות כוללת: ':'Total cost: '}<strong style={{color:C.text}}>{fmtMoney(totalCost)}</strong></div>}
        </div>

        {/* Risk Management */}
        <div style={{ border:`1px solid ${C.border}`, borderRadius:'8px', padding:'14px', display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'#f59e0b', fontFamily:'Inter,sans-serif', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            🎯 {isHe?'ניהול סיכון':'Risk Management'}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div><label style={lbl}>{isHe?'Stop Loss ($)':'Stop Loss ($)'}</label>
              <input type="number" min="0.01" step="0.01" value={form.stopLoss} placeholder="0.00" onChange={e=>setForm(f=>({...f,stopLoss:e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>{isHe?'יעד ($)':'Target ($)'}</label>
              <input type="number" min="0.01" step="0.01" value={form.targetPrice} placeholder="0.00" onChange={e=>setForm(f=>({...f,targetPrice:e.target.value}))} style={inp} /></div>
          </div>

          {rr != null && (
            <div style={{ borderRadius:'6px', padding:'8px 12px', fontSize:'13px', fontWeight:700, fontFamily:'Inter,sans-serif',
              background: rr >= 2 ? '#26a65b18' : rr >= 1 ? '#f59e0b18' : '#DC262618',
              color:      rr >= 2 ? C.green     : rr >= 1 ? '#f59e0b'   : C.red,
              border:`1px solid ${rr >= 2 ? '#26a65b44' : rr >= 1 ? '#f59e0b44' : '#DC262644'}` }}>
              {isHe?'יחס סיכון/סיכוי: ':'Risk/Reward: '}{rr.toFixed(2)}:1
              {rr >= 2 ? ' ✅' : rr >= 1 ? ' ⚠️' : ' ❌'}
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div><label style={lbl}>{isHe?'גודל חשבון ($)':'Account Size ($)'}</label>
              <input type="number" min="1" step="1" value={form.accountSize} placeholder="10000" onChange={e=>setForm(f=>({...f,accountSize:e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>{isHe?'סיכון (%)':'Risk (%)'}</label>
              <input type="number" min="0.1" max="100" step="0.1" value={form.riskPct} placeholder="1" onChange={e=>setForm(f=>({...f,riskPct:e.target.value}))} style={inp} /></div>
          </div>

          {suggested != null && suggested > 0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px',
              background:'#3b6ff518', border:'1px solid #3b6ff544', borderRadius:'6px', padding:'8px 12px' }}>
              <div style={{ fontSize:'12px', color:C.text, fontFamily:'Inter,sans-serif' }}>
                💡 {isHe?'מומלץ: ':'Suggested: '}<strong>{suggested} {isHe?'מניות':'shares'}</strong>
                <span style={{ color:C.muted, marginLeft:'6px' }}>
                  ({fmtMoney(accountSize * (riskPct/100))} {isHe?'בסיכון':'at risk'})
                </span>
              </div>
              <button type="button" onClick={()=>setForm(f=>({...f,quantity:String(suggested)}))}
                style={{ padding:'4px 10px', borderRadius:'5px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:700, background:C.accent, color:'#fff', fontFamily:'Inter,sans-serif' }}>
                {isHe?'מלא':'Use'}
              </button>
            </div>
          )}
        </div>

        {/* Sell */}
        <div style={{ border:`1px solid ${C.border}`, borderRadius:'8px', padding:'14px', display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:C.red, fontFamily:'Inter,sans-serif', textTransform:'uppercase', letterSpacing:'0.06em' }}>📉 {isHe?'מכירה (אופציונלי)':'Sell (optional)'}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div><label style={lbl}>{isHe?'תאריך מכירה':'Sell Date'}</label>
              <input type="date" value={form.sellDate} onChange={e=>setForm(f=>({...f,sellDate:e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>{isHe?'מחיר מכירה ($)':'Sell Price ($)'}</label>
              <input type="number" min="0.01" step="0.01" value={form.sellPrice} placeholder="0.00" onChange={e=>setForm(f=>({...f,sellPrice:e.target.value}))} style={inp} /></div>
          </div>
          {pnlPreview!=null && (
            <div style={{ borderRadius:'6px', padding:'8px 12px', fontSize:'13px', fontWeight:700, fontFamily:'Inter,sans-serif',
              background:pnlPreview>=0?'#26a65b18':'#DC262618', color:pnlPreview>=0?C.green:C.red,
              border:`1px solid ${pnlPreview>=0?'#26a65b44':'#DC262644'}` }}>
              {pnlPreview>=0?'▲ ':'▼ '}{isHe?'רווח/הפסד משוער: ':'Est. P&L: '}{fmtMoney(pnlPreview)}
            </div>
          )}
        </div>

        {/* Notes */}
        <div><label style={lbl}>{isHe?'הערות':'Notes'}</label>
          <textarea value={form.notes} rows={2} placeholder={isHe?'אסטרטגיה, יעד מחיר...':'Strategy, price target...'}
            onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
            style={{...inp, height:'56px', resize:'vertical'}} /></div>

        {err && <p style={{margin:0,fontSize:'12px',color:C.red,fontFamily:'Inter,sans-serif'}}>{err}</p>}
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={submit} style={{ flex:1, padding:'9px', borderRadius:'7px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:700, background:C.accent, color:'#fff', fontFamily:'Inter,sans-serif' }}>
            {isEdit?(isHe?'עדכן':'Update'):(isHe?'שמור':'Save')}
          </button>
          <button onClick={onClose} style={{ padding:'9px 16px', borderRadius:'7px', border:`1px solid ${C.border}`, cursor:'pointer', fontSize:'13px', background:'transparent', color:C.muted, fontFamily:'Inter,sans-serif' }}>
            {isHe?'ביטול':'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Watchlist Modal ────────────────────────────────────────────────────────────
const EMPTY_WATCH = { symbol:'', entryStage:'', targetPrice:'', alertPrice:'', alertDir:'above', notes:'', alertActive:true }

function WatchlistModal({ initial, onSave, onClose, isDark, isHe }) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState(() => !initial ? EMPTY_WATCH : {
    symbol:      initial.symbol      || '',
    entryStage:  initial.entryStage  || '',
    targetPrice: initial.targetPrice != null ? String(initial.targetPrice) : '',
    alertPrice:  initial.alertPrice  != null ? String(initial.alertPrice)  : '',
    alertDir:    initial.alertDir    || 'above',
    notes:       initial.notes       || '',
    alertActive: initial.alertActive !== false,
  })
  const [err, setErr] = useState('')
  const C = mkC(isDark)

  const inp = { padding:'7px 10px', borderRadius:'6px', fontSize:'13px', background:C.bg, color:C.text, border:`1px solid ${C.border}`, outline:'none', fontFamily:'Inter,sans-serif', width:'100%', boxSizing:'border-box' }
  const lbl = { fontSize:'11px', fontWeight:700, color:C.muted, fontFamily:'Inter,sans-serif', marginBottom:'4px', display:'block', textTransform:'uppercase', letterSpacing:'0.05em' }

  function submit() {
    if (!form.symbol) { setErr(isHe?'סימול המניה הוא שדה חובה':'Symbol is required'); return }
    const targetPrice = form.targetPrice ? parseFloat(form.targetPrice) : null
    const alertPrice  = form.alertPrice  ? parseFloat(form.alertPrice)  : null
    if (form.alertPrice && isNaN(alertPrice)) { setErr(isHe?'מחיר התראה לא תקין':'Invalid alert price'); return }
    onSave({ symbol:form.symbol.toUpperCase().trim(), entryStage:form.entryStage.trim(), targetPrice, alertPrice, alertDir:form.alertDir, notes:form.notes.trim(), alertActive:form.alertActive })
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'12px', padding:'24px', width:'100%', maxWidth:'460px', display:'flex', flexDirection:'column', gap:'16px', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h2 style={{ margin:0, fontSize:'16px', fontWeight:700, color:C.text, fontFamily:'Inter,sans-serif' }}>
            {isEdit?(isHe?'✏️ ערוך מעקב':'✏️ Edit Watchlist Item'):(isHe?'+ הוסף למעקב':'+ Add to Watchlist')}
          </h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:C.muted }}>×</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          <div><label style={lbl}>{isHe?'מניה / סימול':'Symbol'}</label>
            <input type="text" value={form.symbol} placeholder="AAPL" onChange={e=>setForm(f=>({...f,symbol:e.target.value.toUpperCase()}))} style={inp} /></div>
          <div><label style={lbl}>{isHe?'מחיר כניסה מטרה':'Target Entry ($)'}</label>
            <input type="number" min="0.01" step="0.01" value={form.targetPrice} placeholder="0.00" onChange={e=>setForm(f=>({...f,targetPrice:e.target.value}))} style={inp} /></div>
        </div>

        <div><label style={lbl}>{isHe?'שלב כניסה / תנאי':'Entry Stage / Condition'}</label>
          <input type="text" value={form.entryStage} placeholder={isHe?'פריצת רמת 150, חזרה לתמיכה...':'Breakout of 150, bounce from support...'} onChange={e=>setForm(f=>({...f,entryStage:e.target.value}))} style={inp} /></div>

        {/* Alert section */}
        <div style={{ border:`1px solid ${C.border}`, borderRadius:'8px', padding:'14px', display:'flex', flexDirection:'column', gap:'12px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#f59e0b', fontFamily:'Inter,sans-serif', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              🔔 {isHe?'התראת פריצה':'Breakout Alert'}
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'12px', color:C.muted, fontFamily:'Inter,sans-serif' }}>
              <input type="checkbox" checked={form.alertActive} onChange={e=>setForm(f=>({...f,alertActive:e.target.checked}))} />
              {isHe?'פעיל':'Active'}
            </label>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div><label style={lbl}>{isHe?'מחיר פריצה ($)':'Alert Price ($)'}</label>
              <input type="number" min="0.01" step="0.01" value={form.alertPrice} placeholder="0.00" onChange={e=>setForm(f=>({...f,alertPrice:e.target.value}))} style={inp} /></div>
            <div>
              <label style={lbl}>{isHe?'כיוון':'Direction'}</label>
              <div style={{ display:'flex', gap:'6px' }}>
                {['above','below'].map(d=>(
                  <button key={d} onClick={()=>setForm(f=>({...f,alertDir:d}))}
                    style={{ flex:1, padding:'7px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:700, fontFamily:'Inter,sans-serif',
                      background:form.alertDir===d?(d==='above'?C.green:C.red):C.bg,
                      color:form.alertDir===d?'#fff':C.muted }}>
                    {d==='above'?(isHe?'↑ מעל':'↑ Above'):(isHe?'↓ מתחת':'↓ Below')}
                  </button>))}
              </div>
            </div>
          </div>

          <div style={{ fontSize:'11px', color:C.muted, fontFamily:'Heebo,sans-serif', lineHeight:1.5 }}>
            {isHe
              ? `התראה תופעל כאשר ${form.symbol||'המניה'} ${form.alertDir==='above'?'תעבור מעל':'תרד מתחת ל'} ${form.alertPrice?'$'+form.alertPrice:'מחיר הפריצה'}`
              : `Alert fires when ${form.symbol||'symbol'} ${form.alertDir==='above'?'crosses above':'drops below'} ${form.alertPrice?'$'+form.alertPrice:'the alert price'}`
            }
          </div>
        </div>

        <div><label style={lbl}>{isHe?'הערות':'Notes'}</label>
          <textarea value={form.notes} rows={2} placeholder={isHe?'אסטרטגיה, קטלוג, הנחות...':'Strategy, catalyst, assumptions...'}
            onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
            style={{...inp, height:'56px', resize:'vertical'}} /></div>

        {err && <p style={{margin:0,fontSize:'12px',color:C.red,fontFamily:'Inter,sans-serif'}}>{err}</p>}
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={submit} style={{ flex:1, padding:'9px', borderRadius:'7px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:700, background:C.accent, color:'#fff', fontFamily:'Inter,sans-serif' }}>
            {isEdit?(isHe?'עדכן':'Update'):(isHe?'הוסף':'Add')}
          </button>
          <button onClick={onClose} style={{ padding:'9px 16px', borderRadius:'7px', border:`1px solid ${C.border}`, cursor:'pointer', fontSize:'13px', background:'transparent', color:C.muted, fontFamily:'Inter,sans-serif' }}>
            {isHe?'ביטול':'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Open Positions Donut ───────────────────────────────────────────────────────
function OpenPositionsDonut({ positions, isDark, isHe }) {
  const C = mkC(isDark)
  const open = positions.filter(p => p.sellPrice == null)
  if (!open.length) return null

  const bySymbol = open.reduce((acc, p) => {
    acc[p.symbol] = (acc[p.symbol] || 0) + p.buyPrice * p.quantity
    return acc
  }, {})
  const symbols = Object.keys(bySymbol)
  const values  = symbols.map(s => bySymbol[s])
  const total   = values.reduce((s,v) => s+v, 0)

  const opts = {
    chart:  { type:'donut', background:'transparent', toolbar:{show:false}, animations:{enabled:false} },
    theme:  { mode: isDark?'dark':'light' },
    labels: symbols,
    colors: CHART_COLORS.slice(0, symbols.length),
    dataLabels: { enabled:false },
    legend: { show:false },
    plotOptions: { pie: { donut: { size:'68%', labels:{ show:true, total:{ show:true, showAlways:true,
      label: isHe?'מושקע':'Invested', color:C.muted, fontSize:'11px', fontFamily:'Inter,sans-serif',
      formatter: () => fmtMoney(total) } } } } },
    stroke: { width:2, colors:[C.card] },
    tooltip: { y:{ formatter: (v) => `${fmtMoney(v)} (${(v/total*100).toFixed(1)}%)` } },
  }

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'16px' }}>
      <div style={{ fontSize:'11px', fontWeight:700, color:C.muted, fontFamily:'Inter,sans-serif', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'12px' }}>
        🍩 {isHe?'חלוקת תיק פתוח':'Open Portfolio Allocation'}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'180px 1fr', gap:'16px', alignItems:'center' }}>
        <ReactApexChart type="donut" series={values} options={opts} height={180} />
        <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
          {symbols.map((sym, i) => (
            <div key={sym} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ width:'10px', height:'10px', borderRadius:'3px', background:CHART_COLORS[i % CHART_COLORS.length], flexShrink:0 }} />
              <span style={{ fontSize:'13px', fontWeight:700, color:C.text, fontFamily:'Inter,sans-serif', flex:1 }}>{sym}</span>
              <span style={{ fontSize:'12px', color:C.muted, fontFamily:'Inter,sans-serif' }}>{fmtMoney(bySymbol[sym])}</span>
              <span style={{ fontSize:'11px', color:C.muted, fontFamily:'Inter,sans-serif', minWidth:'36px', textAlign:'right' }}>
                {(bySymbol[sym]/total*100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Position Row ───────────────────────────────────────────────────────────────
function PositionRow({ pos, onEdit, onDelete, onAddSell, isDark, isHe, striped }) {
  const C   = mkC(isDark)
  const pnl = calcPnl(pos)
  const [hov, setHov] = useState(false)
  const isClosed = pos.sellPrice != null
  const rr       = calcRR(pos.direction, pos.buyPrice, pos.stopLoss, pos.targetPrice)
  const outcome  = planOutcome(pos)
  const rrColor  = rr == null ? C.muted : rr >= 2 ? C.green : rr >= 1 ? '#f59e0b' : C.red

  return (
    <tr onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:hov?C.hover:striped?(isDark?'#0d111760':'#f8faff'):'transparent', transition:'background 0.12s' }}>
      <td style={{ padding:'9px 10px', fontSize:'12px', color:C.muted, fontFamily:'Inter,sans-serif', whiteSpace:'nowrap', borderBottom:`1px solid ${C.border}` }}>{pos.buyDate}</td>
      <td style={{ padding:'9px 10px', fontSize:'14px', fontWeight:700, color:C.text, fontFamily:'Inter,sans-serif', borderBottom:`1px solid ${C.border}` }}>{pos.symbol}</td>
      <td style={{ padding:'9px 10px', textAlign:'center', borderBottom:`1px solid ${C.border}` }}>
        <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:'4px', fontSize:'11px', fontWeight:700, fontFamily:'Inter,sans-serif',
          background:pos.direction==='long'?'#2563EB22':`${C.orange}22`,
          color:pos.direction==='long'?'#2563EB':C.orange }}>
          {pos.direction==='long'?(isHe?'לונג':'LONG'):(isHe?'שורט':'SHORT')}
        </span>
      </td>
      <td style={{ padding:'9px 10px', fontSize:'13px', color:C.text, fontFamily:'Inter,sans-serif', textAlign:'right', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>${pos.buyPrice.toFixed(2)}</td>
      <td style={{ padding:'9px 10px', fontSize:'13px', color:C.text, fontFamily:'Inter,sans-serif', textAlign:'right', borderBottom:`1px solid ${C.border}` }}>{pos.quantity}</td>
      <td style={{ padding:'9px 10px', fontSize:'13px', fontWeight:600, color:C.text, fontFamily:'Inter,sans-serif', textAlign:'right', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>{fmtMoney(pos.buyPrice*pos.quantity)}</td>
      <td style={{ padding:'9px 10px', fontSize:'12px', fontFamily:'Inter,sans-serif', textAlign:'right', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap', lineHeight:1.4 }}>
        {(pos.stopLoss != null || pos.targetPrice != null) ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'1px' }}>
            <span style={{ color:C.red }}>SL {pos.stopLoss != null ? `$${pos.stopLoss.toFixed(2)}` : '—'}</span>
            <span style={{ color:C.green }}>TP {pos.targetPrice != null ? `$${pos.targetPrice.toFixed(2)}` : '—'}</span>
          </div>
        ) : <span style={{ color:C.muted, fontSize:'11px' }}>—</span>}
      </td>
      <td style={{ padding:'9px 10px', fontSize:'12px', fontFamily:'Inter,sans-serif', textAlign:'center', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap', lineHeight:1.4 }}>
        {rr != null ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
            <span style={{ color:rrColor, fontWeight:700 }}>{rr.toFixed(2)}:1</span>
            {outcome === 'followed' && (
              <span style={{ fontSize:'10px', color:C.green, fontWeight:600 }} title={isHe?'עקבתי אחרי התוכנית':'Followed plan'}>
                ✅ {isHe?'תוכנית':'Plan'}
              </span>
            )}
            {outcome === 'deviated' && (
              <span style={{ fontSize:'10px', color:C.orange, fontWeight:600 }} title={isHe?'סטיתי מהתוכנית':'Deviated'}>
                ⚠️ {isHe?'סטייה':'Deviated'}
              </span>
            )}
          </div>
        ) : <span style={{ color:C.muted, fontSize:'11px' }}>—</span>}
      </td>
      <td style={{ padding:'9px 10px', fontSize:'13px', fontFamily:'Inter,sans-serif', textAlign:'right', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>
        {isClosed ? <span style={{color:C.text}}>${pos.sellPrice.toFixed(2)}</span> : <span style={{color:C.muted,fontSize:'11px'}}>—</span>}
      </td>
      <td style={{ padding:'9px 10px', fontSize:'13px', fontWeight:700, fontFamily:'Inter,sans-serif', textAlign:'right', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>
        {pnl != null
          ? <span style={{color:pnl>=0?C.green:C.red}}>{pnl>=0?'▲ ':'▼ '}{fmtMoney(pnl)}</span>
          : <span style={{color:C.muted,fontSize:'11px',fontWeight:400}}>{isHe?'פתוח':'Open'}</span>}
      </td>
      <td style={{ padding:'9px 10px', fontSize:'12px', color:C.muted, fontFamily:isHe?'Heebo,sans-serif':'Inter,sans-serif', borderBottom:`1px solid ${C.border}`, maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {pos.notes || '—'}
      </td>
      <td style={{ padding:'9px 8px', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>
        <div style={{ display:'flex', gap:'2px', justifyContent:'center', opacity:hov?1:0.4, transition:'opacity 0.15s' }}>
          {!isClosed && <button onClick={()=>onAddSell(pos)} title={isHe?'הוסף מכירה':'Add sell'} style={{ background:'none', border:'none', cursor:'pointer', color:C.red, fontSize:'15px', padding:'2px 4px' }}>📉</button>}
          <button onClick={()=>onEdit(pos)} title={isHe?'ערוך':'Edit'} style={{ background:'none', border:'none', cursor:'pointer', color:'#f59e0b', fontSize:'14px', padding:'2px 4px' }}>✏️</button>
          <button onClick={()=>onDelete(pos.id)} title={isHe?'מחק':'Delete'} style={{ background:'none', border:'none', cursor:'pointer', color:C.red, fontSize:'16px', padding:'2px 4px', fontWeight:700 }}>×</button>
        </div>
      </td>
    </tr>
  )
}

// ── Month Section ──────────────────────────────────────────────────────────────
function MonthSection({ monthKey, positions, onEdit, onDelete, onAddSell, onAddNew, isDark, isHe, defaultOpen }) {
  const [expanded, setExpanded] = useState(defaultOpen)
  const C = mkC(isDark)
  const [yr, mo] = monthKey.split('-').map(Number)
  const monthName = isHe ? MONTH_NAMES_HE[mo-1] : MONTH_NAMES_EN[mo-1]
  const closedPnls = positions.map(calcPnl).filter(x=>x!=null)
  const totalPnl   = closedPnls.reduce((s,x)=>s+x, 0)
  const wins       = closedPnls.filter(x=>x>0).length
  const losses     = closedPnls.filter(x=>x<0).length
  const openCount  = positions.filter(p=>p.sellPrice==null).length

  const thS = { padding:'8px 10px', fontSize:'11px', fontWeight:700, color:C.muted, fontFamily:'Inter,sans-serif', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap', background:isDark?'#0d1117':'#f0f2f5', borderBottom:`1px solid ${C.border}` }

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'10px', overflow:'hidden' }}>
      <div onClick={()=>setExpanded(v=>!v)}
        style={{ padding:'11px 16px', display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', background:C.hdr, userSelect:'none' }}>
        <span style={{ fontSize:'14px', fontWeight:700, color:C.text, fontFamily:'Inter,sans-serif', minWidth:'90px' }}>{monthName} {yr}</span>
        <span style={{ fontSize:'12px', color:C.muted, fontFamily:'Inter,sans-serif' }}>{positions.length} {isHe?'פוזיציות':'positions'}{openCount>0?` · ${openCount} ${isHe?'פתוחות':'open'}`:''}</span>
        {closedPnls.length>0 && <>
          <span style={{ fontSize:'13px', fontWeight:700, fontFamily:'Inter,sans-serif', color:totalPnl>=0?C.green:C.red }}>{totalPnl>=0?'▲':'▼'} {fmtMoney(totalPnl)}</span>
          {(wins>0||losses>0) && <span style={{ fontSize:'11px', color:C.muted, fontFamily:'Inter,sans-serif' }}>✅{wins} ❌{losses}</span>}
        </>}
        <button onClick={e=>{e.stopPropagation();onAddNew()}}
          style={{ marginLeft:'auto', padding:'4px 12px', borderRadius:'6px', border:'none', background:C.accent, color:'#fff', cursor:'pointer', fontSize:'12px', fontWeight:700, fontFamily:'Inter,sans-serif', flexShrink:0 }}>
          + {isHe?'פוזיציה':'Position'}
        </button>
        <span style={{ fontSize:'12px', color:C.muted }}>{expanded?'▲':'▼'}</span>
      </div>
      {expanded && (
        <>
          {/* Desktop: scrollable table */}
          <div className="portfolio-table-wrap" style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'1000px' }}>
              <thead><tr>
                {[{l:isHe?'תאריך':'Date',a:'left'},{l:isHe?'מניה':'Symbol',a:'left'},{l:isHe?'כיוון':'Dir',a:'center'},
                  {l:isHe?'מחיר קנייה':'Buy Price',a:'right'},{l:isHe?'כמות':'Qty',a:'right'},{l:isHe?'עלות':'Cost',a:'right'},
                  {l:isHe?'סטופ / יעד':'Stop / Target',a:'right'},{l:'R:R',a:'center'},
                  {l:isHe?'מחיר מכירה':'Sell',a:'right'},{l:isHe?'רווח/הפסד':'P&L',a:'right'},{l:isHe?'הערות':'Notes',a:'left'},{l:'',a:'center'}
                ].map((h,i)=><th key={i} style={{...thS, textAlign:h.a}}>{h.l}</th>)}
              </tr></thead>
              <tbody>
                {positions.map((pos,i)=>(
                  <PositionRow key={pos.id} pos={pos} striped={i%2===1}
                    onEdit={onEdit} onDelete={onDelete} onAddSell={onAddSell}
                    isDark={isDark} isHe={isHe} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="portfolio-cards-wrap" style={{ flexDirection:'column', gap:'8px', padding:'10px' }}>
            {positions.map(pos => {
              const pnl = calcPnl(pos)
              const rr  = calcRR(pos.direction, pos.buyPrice, pos.stopLoss, pos.targetPrice)
              return (
                <div key={pos.id} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:'8px', padding:'12px', display:'flex', flexDirection:'column', gap:'6px' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontWeight:700, fontSize:'16px', color:C.text, fontFamily:'Inter,sans-serif' }}>{pos.symbol}</span>
                    <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'4px', fontWeight:700, fontFamily:'Inter,sans-serif',
                      background:pos.direction==='long'?'#2563EB22':'#D9770622',
                      color:pos.direction==='long'?'#2563EB':'#D97706' }}>
                      {pos.direction==='long'?(isHe?'לונג':'LONG'):(isHe?'שורט':'SHORT')}
                    </span>
                  </div>
                  {[
                    [isHe?'תאריך':'Date', pos.buyDate],
                    [isHe?'מחיר קנייה':'Buy', `$${pos.buyPrice.toFixed(2)}`],
                    [isHe?'כמות':'Qty', pos.quantity],
                    [isHe?'עלות':'Cost', `$${(pos.buyPrice*pos.quantity).toFixed(2)}`],
                    pos.stopLoss    != null ? [isHe?'סטופ':'Stop', `$${pos.stopLoss.toFixed(2)}`]       : null,
                    pos.targetPrice != null ? [isHe?'יעד':'Target', `$${pos.targetPrice.toFixed(2)}`]   : null,
                    rr  != null             ? ['R:R', `${rr.toFixed(2)}:1`]                             : null,
                    pos.sellPrice   != null ? [isHe?'מכירה':'Sell', `$${pos.sellPrice.toFixed(2)}`]     : null,
                    pos.notes ? [isHe?'הערות':'Notes', pos.notes]                                        : null,
                  ].filter(Boolean).map(([label, val]) => (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', fontFamily:'Inter,sans-serif' }}>
                      <span style={{ color:C.muted }}>{label}</span>
                      <span style={{ color:C.text, fontWeight:600 }}>{val}</span>
                    </div>
                  ))}
                  {pnl != null && (
                    <div style={{ marginTop:'4px', paddingTop:'6px', borderTop:`1px solid ${C.border}`, fontWeight:700, fontSize:'14px', fontFamily:'Inter,sans-serif', color:pnl>=0?C.green:C.red, textAlign:'center' }}>
                      {pnl>=0?'▲ ':'▼ '}${Math.abs(pnl).toFixed(2)}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'4px' }}>
                    {pos.sellPrice==null && <button onClick={()=>onAddSell(pos)} style={{ background:'none', border:'none', cursor:'pointer', color:C.red, fontSize:'14px' }}>📉</button>}
                    <button onClick={()=>onEdit(pos)} style={{ background:'none', border:'none', cursor:'pointer', color:'#f59e0b', fontSize:'13px' }}>✏️</button>
                    <button onClick={()=>onDelete(pos.id)} style={{ background:'none', border:'none', cursor:'pointer', color:C.red, fontSize:'15px', fontWeight:700 }}>×</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Watchlist Section ──────────────────────────────────────────────────────────
function WatchlistSection({ watchlist, priceMap, onEdit, onDelete, onResetAlert, onAddNew, isDark, isHe }) {
  const C = mkC(isDark)

  const thS = { padding:'9px 12px', fontSize:'11px', fontWeight:700, color:C.muted, fontFamily:'Inter,sans-serif', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap', background:isDark?'#0d1117':'#f0f2f5', borderBottom:`1px solid ${C.border}`, textAlign:'left' }

  if (!watchlist.length) return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'52px', textAlign:'center', color:C.muted, fontFamily:'Heebo,sans-serif' }}>
      <div style={{ fontSize:'32px', marginBottom:'12px' }}>👁️</div>
      <div style={{ fontSize:'15px', marginBottom:'16px' }}>{isHe?'אין מניות במעקב':'No stocks on watchlist'}</div>
      <button onClick={onAddNew}
        style={{ padding:'9px 22px', borderRadius:'7px', border:'none', background:C.accent, color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:700, fontFamily:'Inter,sans-serif' }}>
        {isHe?'+ הוסף מניה ראשונה':'+ Add First Stock'}
      </button>
    </div>
  )

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'10px', overflow:'hidden' }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'760px' }}>
          <thead><tr>
            {[isHe?'מניה':'Symbol', isHe?'שלב כניסה':'Entry Stage', isHe?'מחיר כניסה':'Target', isHe?'מחיר נוכחי':'Current', isHe?'מחיר פריצה':'Alert', isHe?'מרחק':'Distance', isHe?'הערות':'Notes', isHe?'התראה':'Alert', '']
              .map((h,i)=><th key={i} style={{...thS, textAlign:i>=2&&i<=5?'right':'left'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {watchlist.map((item, i) => {
              const current = priceMap[item.symbol]
              const distPct = (current && item.alertPrice)
                ? ((item.alertPrice - current) / current * 100).toFixed(2)
                : null
              const distAbs = (current && item.alertPrice)
                ? Math.abs(item.alertPrice - current).toFixed(2)
                : null
              const [hov, setHov] = useState(false)

              return (
                <tr key={item.id}
                  onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
                  style={{ background:hov?C.hover:i%2===1?(isDark?'#0d111760':'#f8faff'):'transparent', transition:'background 0.12s', borderTop:`1px solid ${C.border}` }}>
                  <td style={{ padding:'10px 12px', fontFamily:'Inter,sans-serif', borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:'14px', fontWeight:700, color:C.text }}>{item.symbol}</span>
                  </td>
                  <td style={{ padding:'10px 12px', fontSize:'12px', color:C.muted, fontFamily:isHe?'Heebo,sans-serif':'Inter,sans-serif', borderBottom:`1px solid ${C.border}`, maxWidth:'160px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {item.entryStage || '—'}
                  </td>
                  <td style={{ padding:'10px 12px', fontSize:'13px', color:C.text, fontFamily:'Inter,sans-serif', textAlign:'right', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>
                    {item.targetPrice ? `$${item.targetPrice.toFixed(2)}` : '—'}
                  </td>
                  <td style={{ padding:'10px 12px', fontSize:'13px', fontWeight:600, color:C.text, fontFamily:'Inter,sans-serif', textAlign:'right', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>
                    {current ? `$${current.toFixed(2)}` : <span style={{color:C.muted,fontSize:'11px'}}>—</span>}
                  </td>
                  <td style={{ padding:'10px 12px', fontSize:'13px', color:C.text, fontFamily:'Inter,sans-serif', textAlign:'right', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>
                    {item.alertPrice ? (
                      <span>
                        {item.alertDir==='above'?'↑ ':'↓ '}${item.alertPrice.toFixed(2)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding:'10px 12px', fontSize:'12px', fontFamily:'Inter,sans-serif', textAlign:'right', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>
                    {distPct != null ? (
                      <span style={{ color: Math.abs(distPct) < 2 ? '#f59e0b' : C.muted }}>
                        {distPct > 0 ? '+' : ''}{distPct}% (${distAbs})
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding:'10px 12px', fontSize:'12px', color:C.muted, fontFamily:isHe?'Heebo,sans-serif':'Inter,sans-serif', borderBottom:`1px solid ${C.border}`, maxWidth:'140px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {item.notes || '—'}
                  </td>
                  <td style={{ padding:'10px 12px', textAlign:'left', borderBottom:`1px solid ${C.border}` }}>
                    {!item.alertPrice ? (
                      <span style={{ fontSize:'11px', color:C.muted, fontFamily:'Inter,sans-serif' }}>—</span>
                    ) : item.alertTriggered ? (
                      <button onClick={()=>onResetAlert(item.id)}
                        style={{ padding:'3px 8px', borderRadius:'5px', border:`1px solid ${C.green}44`, background:`${C.green}18`, color:C.green, cursor:'pointer', fontSize:'11px', fontWeight:700, fontFamily:'Inter,sans-serif', whiteSpace:'nowrap' }}>
                        ✅ {isHe?'הופעלה – אפס':'Triggered – Reset'}
                      </button>
                    ) : item.alertActive ? (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', fontSize:'11px', color:'#f59e0b', fontFamily:'Inter,sans-serif', fontWeight:600 }}>
                        <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#f59e0b', display:'inline-block', animation:'pulse 1.5s infinite' }} />
                        {isHe?'מחכה':'Watching'}
                      </span>
                    ) : (
                      <span style={{ fontSize:'11px', color:C.muted, fontFamily:'Inter,sans-serif' }}>{isHe?'כבויה':'Disabled'}</span>
                    )}
                  </td>
                  <td style={{ padding:'10px 8px', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>
                    <div style={{ display:'flex', gap:'2px', justifyContent:'center', opacity:hov?1:0.4, transition:'opacity 0.15s' }}>
                      <button onClick={()=>onEdit(item)} title={isHe?'ערוך':'Edit'} style={{ background:'none', border:'none', cursor:'pointer', color:'#f59e0b', fontSize:'14px', padding:'2px 4px' }}>✏️</button>
                      <button onClick={()=>onDelete(item.id)} title={isHe?'מחק':'Delete'} style={{ background:'none', border:'none', cursor:'pointer', color:C.red, fontSize:'16px', padding:'2px 4px', fontWeight:700 }}>×</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Annual Summary ─────────────────────────────────────────────────────────────
function AnnualSummary({ positions, year, isDark, isHe }) {
  const C = mkC(isDark)
  const yearPos  = positions.filter(p => p.buyDate.startsWith(String(year)))
  const allPnls  = yearPos.map(calcPnl).filter(x=>x!=null)
  const totalPnl = allPnls.reduce((s,x)=>s+x, 0)
  const wins     = allPnls.filter(x=>x>0).length
  const losses   = allPnls.filter(x=>x<0).length
  const winRate  = allPnls.length > 0 ? Math.round(wins/allPnls.length*100) : 0
  const openCount= yearPos.filter(p=>p.sellPrice==null).length

  const monthlyPnl = Array.from({length:12},(_,m) => {
    const mo = String(m+1).padStart(2,'0')
    return yearPos.filter(p=>p.buyDate.startsWith(`${year}-${mo}`)).map(calcPnl).filter(x=>x!=null).reduce((s,x)=>s+x,0)
  })

  const stats = [
    {label:isHe?'רווח/הפסד כולל':'Total P&L', value:allPnls.length?(totalPnl>=0?'▲ ':'▼ ')+fmtMoney(totalPnl):'—', color:totalPnl>=0?C.green:C.red},
    {label:isHe?'פוזיציות':'Positions', value:yearPos.length},
    {label:isHe?'סגורות':'Closed', value:allPnls.length},
    {label:isHe?'פתוחות':'Open', value:openCount},
    {label:isHe?'הצלחות':'Wins', value:wins, color:C.green},
    {label:isHe?'כישלונות':'Losses', value:losses, color:C.red},
    {label:isHe?'אחוז הצלחה':'Win Rate', value:allPnls.length?`${winRate}%`:'—', color:winRate>=50?C.green:C.red},
  ]

  const analytics = computeTradeAnalytics(yearPos)

  const chartOpts = {
    chart:{type:'bar',background:'transparent',toolbar:{show:false},animations:{enabled:false}},
    theme:{mode:isDark?'dark':'light'},
    plotOptions:{bar:{distributed:true,columnWidth:'60%',borderRadius:4}},
    colors:monthlyPnl.map(v=>v>=0?'#26a65b':'#DC2626'),
    dataLabels:{enabled:false},
    xaxis:{categories:(isHe?MONTH_NAMES_HE:MONTH_NAMES_EN).map(m=>m.slice(0,3)), labels:{style:{fontSize:'10px',colors:Array(12).fill(C.muted),fontFamily:'Inter,sans-serif'}}},
    yaxis:{labels:{formatter:v=>v===0?'$0':'$'+Math.abs(v).toFixed(0), style:{fontSize:'10px',colors:[C.muted],fontFamily:'Inter,sans-serif'}}},
    grid:{borderColor:C.border,strokeDashArray:3},
    legend:{show:false},
    tooltip:{y:{formatter:v=>(v>=0?'+':'')+fmtMoney(v)}},
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
      <h3 style={{margin:0,fontSize:'14px',fontWeight:700,color:C.text,fontFamily:'Inter,sans-serif'}}>
        {isHe?`📊 סיכום שנה ${year}`:`📊 ${year} Annual Summary`}
      </h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'10px'}}>
        {stats.map((s,i)=>(
          <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:'8px',padding:'12px'}}>
            <div style={{fontSize:'10px',fontWeight:600,color:C.muted,fontFamily:'Inter,sans-serif',textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.label}</div>
            <div style={{fontSize:'18px',fontWeight:700,color:s.color||C.text,fontFamily:'Inter,sans-serif',marginTop:'4px'}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Trade Analytics card */}
      {analytics && (
        <div style={{background:C.card, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'16px'}}>
          <div style={{fontSize:'11px', fontWeight:700, color:C.muted, fontFamily:'Inter,sans-serif', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'12px'}}>
            🧠 {isHe?'ניתוח עסקאות':'Trade Analytics'}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))', gap:'10px'}}>
            {[
              { l:isHe?'רווח ממוצע':'Avg Win',         v:analytics.avgWin>0?'+'+fmtMoney(analytics.avgWin):'—',                 c:C.green },
              { l:isHe?'הפסד ממוצע':'Avg Loss',         v:analytics.avgLoss<0?fmtMoney(analytics.avgLoss):'—',                   c:C.red   },
              { l:isHe?'הרווח הגדול ביותר':'Largest Win',  v:analytics.largestWin>0?'+'+fmtMoney(analytics.largestWin):'—',        c:C.green },
              { l:isHe?'ההפסד הגדול ביותר':'Largest Loss', v:analytics.largestLoss<0?fmtMoney(analytics.largestLoss):'—',          c:C.red   },
              { l:isHe?'גורם רווח':'Profit Factor',
                v: analytics.profitFactor === Infinity ? '∞' : (analytics.profitFactor > 0 ? analytics.profitFactor.toFixed(2) : '—'),
                c: analytics.profitFactor >= 1.5 ? C.green : analytics.profitFactor >= 1 ? '#f59e0b' : C.red },
              { l:isHe?'ימי החזקה ממוצע':'Avg Holding', v:`${Math.round(analytics.avgHolding)} ${isHe?'ימים':'days'}` },
              { l:isHe?'מניה הכי טובה':'Best Symbol',   v:analytics.bestSymbol  ? `${analytics.bestSymbol[0]} (${analytics.bestSymbol[1]>=0?'+':''}${fmtMoney(analytics.bestSymbol[1])})`  : '—', c:C.green },
              { l:isHe?'מניה הכי גרועה':'Worst Symbol', v:analytics.worstSymbol ? `${analytics.worstSymbol[0]} (${fmtMoney(analytics.worstSymbol[1])})` : '—', c:C.red   },
              { l:isHe?'רצף הצלחות':'Win Streak',       v:analytics.maxWinStreak,  c:C.green },
              { l:isHe?'רצף הפסדים':'Loss Streak',      v:analytics.maxLossStreak, c:C.red   },
              { l:isHe?'לונג':'Long',
                v: analytics.longCount  ? `${analytics.longCount}× → ${analytics.longTotal>=0?'+':''}${fmtMoney(analytics.longTotal)}`   : '—',
                c: analytics.longTotal  >= 0 ? C.green : C.red },
              { l:isHe?'שורט':'Short',
                v: analytics.shortCount ? `${analytics.shortCount}× → ${analytics.shortTotal>=0?'+':''}${fmtMoney(analytics.shortTotal)}` : '—',
                c: analytics.shortTotal >= 0 ? C.green : C.red },
            ].map((s,i)=>(
              <div key={i} style={{background:C.bg, borderRadius:'8px', padding:'10px 12px'}}>
                <div style={{fontSize:'10px', fontWeight:600, color:C.muted, fontFamily:'Inter,sans-serif', textTransform:'uppercase', letterSpacing:'0.04em'}}>{s.l}</div>
                <div style={{fontSize:'14px', fontWeight:700, color:s.c||C.text, fontFamily:'Inter,sans-serif', marginTop:'3px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SPY benchmark chart */}
      <PortfolioVsSpyChart positions={positions} year={year} isDark={isDark} isHe={isHe} />

      {monthlyPnl.some(v=>v!==0) && (
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:'10px',padding:'16px'}}>
          <div style={{fontSize:'11px',fontWeight:700,color:C.muted,fontFamily:'Inter,sans-serif',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>
            {isHe?'רווח/הפסד חודשי':'Monthly P&L'}
          </div>
          <ReactApexChart type="bar" series={[{name:isHe?'רווח/הפסד':'P&L',data:monthlyPnl}]} options={chartOpts} height={160} />
        </div>
      )}
      {yearPos.length>0 && (
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:'10px',overflow:'hidden'}}>
          <div style={{padding:'10px 14px',background:C.hdr,fontSize:'11px',fontWeight:700,color:C.muted,fontFamily:'Inter,sans-serif',textTransform:'uppercase',letterSpacing:'0.05em'}}>
            {isHe?'פירוט חודשי':'Monthly Breakdown'}
          </div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr>
              {[isHe?'חודש':'Month',isHe?'פוזיציות':'Positions',isHe?'סגורות':'Closed',isHe?'הצלחות':'Wins',isHe?'כישלונות':'Losses',isHe?'רווח/הפסד':'P&L']
                .map((h,i)=><th key={i} style={{padding:'7px 12px',fontSize:'11px',fontWeight:700,color:C.muted,fontFamily:'Inter,sans-serif',textAlign:i>0?'right':'left',borderBottom:`1px solid ${C.border}`,textTransform:'uppercase',letterSpacing:'0.04em'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {Array.from({length:12},(_,m)=>{
                const mo=String(m+1).padStart(2,'0')
                const mPos=yearPos.filter(p=>p.buyDate.startsWith(`${year}-${mo}`))
                if(!mPos.length) return null
                const mPnls=mPos.map(calcPnl).filter(x=>x!=null)
                const mTotal=mPnls.reduce((s,x)=>s+x,0)
                return (
                  <tr key={m}>
                    <td style={{padding:'7px 12px',fontSize:'13px',color:C.text,fontFamily:'Inter,sans-serif',borderBottom:`1px solid ${C.border}`}}>{isHe?MONTH_NAMES_HE[m]:MONTH_NAMES_EN[m]}</td>
                    <td style={{padding:'7px 12px',fontSize:'13px',color:C.text,fontFamily:'Inter,sans-serif',textAlign:'right',borderBottom:`1px solid ${C.border}`}}>{mPos.length}</td>
                    <td style={{padding:'7px 12px',fontSize:'13px',color:C.text,fontFamily:'Inter,sans-serif',textAlign:'right',borderBottom:`1px solid ${C.border}`}}>{mPnls.length}</td>
                    <td style={{padding:'7px 12px',fontSize:'13px',color:C.green,fontFamily:'Inter,sans-serif',textAlign:'right',fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{mPnls.filter(x=>x>0).length}</td>
                    <td style={{padding:'7px 12px',fontSize:'13px',color:C.red,fontFamily:'Inter,sans-serif',textAlign:'right',fontWeight:600,borderBottom:`1px solid ${C.border}`}}>{mPnls.filter(x=>x<0).length}</td>
                    <td style={{padding:'7px 12px',fontSize:'13px',fontWeight:700,fontFamily:'Inter,sans-serif',textAlign:'right',borderBottom:`1px solid ${C.border}`,color:mTotal>=0?C.green:C.red}}>
                      {mPnls.length?(mTotal>=0?'▲ ':'▼ ')+fmtMoney(mTotal):'—'}
                    </td>
                  </tr>
                )
              }).filter(Boolean)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const { theme, lang } = useApp()
  const { user }        = useAuth()
  const isLoggedIn      = !!user
  const isDark = theme === 'dark'
  const isHe   = lang  === 'he'
  const C = mkC(isDark)

  // ── Multi-portfolio ──────────────────────────────────────────────────────────
  const [portfolios,   setPortfolios]  = useState(loadPortfolios)
  const [pfNameEdit,   setPfNameEdit]  = useState(null) // id being renamed
  const [pfNameInput,  setPfNameInput] = useState('')

  const activeId  = portfolios.active
  const activePf  = portfolios.portfolios.find(p => p.id === activeId) || portfolios.portfolios[0]
  // Keep downstream code unchanged — derive posData from active portfolio
  const posData = { positions: activePf?.positions || [] }

  const [posModal,  setPosModal]  = useState(null)

  // Watchlist
  const [watchlist, setWatchlist] = useState(loadWatchlist)
  const [wlModal,   setWlModal]   = useState(null)

  // Alerts
  const [activeAlerts, setActiveAlerts] = useState([])

  // UI
  const [viewYear,  setViewYear]  = useState(new Date().getFullYear())
  const [tab,       setTab]       = useState('trades')

  // ── Load from server when logged in ──────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) { setPortfolios(loadPortfolios()); return }
    apiFetch('/portfolio')
      .then(data => {
        if (!data.portfolios?.length) return
        setPortfolios({
          active: data.active || data.portfolios[0].id,
          portfolios: data.portfolios.map(pf => ({ id: pf.id, name: pf.name, positions: pf.positions })),
        })
      })
      .catch(() => setPortfolios(loadPortfolios()))
  }, [isLoggedIn]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist helpers ──────────────────────────────────────────────────────────
  function persistPos(d) {
    const updated = {
      ...portfolios,
      portfolios: portfolios.portfolios.map(p =>
        p.id === activeId ? { ...p, positions: d.positions } : p
      ),
    }
    setPortfolios(updated)
    if (!isLoggedIn) savePortfolios(updated)
  }
  function persistWL(d)  { setWatchlist(d); saveWatchlist(d) }

  // ── Portfolio CRUD ────────────────────────────────────────────────────────────
  function addPortfolio(name) {
    const id = uid()
    const updated = { ...portfolios, active: id, portfolios: [...portfolios.portfolios, { id, name, positions: [] }] }
    setPortfolios(updated)
    if (!isLoggedIn) { savePortfolios(updated); return }
    apiFetch('/portfolio/list', { method: 'POST', body: JSON.stringify({ portfolioId: id, portfolioName: name }) }).catch(() => {})
  }
  function switchPortfolio(id) {
    const updated = { ...portfolios, active: id }
    setPortfolios(updated)
    if (!isLoggedIn) savePortfolios(updated)
  }
  function renamePortfolio(id, name) {
    const updated = { ...portfolios, portfolios: portfolios.portfolios.map(p => p.id === id ? { ...p, name } : p) }
    setPortfolios(updated)
    if (!isLoggedIn) { savePortfolios(updated) } else {
      apiFetch(`/portfolio/list/${id}/name`, { method: 'PUT', body: JSON.stringify({ portfolioName: name }) }).catch(() => {})
    }
    setPfNameEdit(null)
  }
  function deletePortfolio(id) {
    if (portfolios.portfolios.length <= 1) return
    const remaining = portfolios.portfolios.filter(p => p.id !== id)
    const newActive = id === activeId ? remaining[0].id : activeId
    const updated = { active: newActive, portfolios: remaining }
    setPortfolios(updated)
    if (!isLoggedIn) { savePortfolios(updated) } else {
      apiFetch(`/portfolio/list/${id}`, { method: 'DELETE' }).catch(() => {})
    }
  }

  // ── Positions CRUD ───────────────────────────────────────────────────────────
  async function handlePosSave(form) {
    if (posModal.mode === 'add') {
      const newPos = { ...form, id: uid() }
      if (isLoggedIn) {
        try {
          const data = await apiFetch('/portfolio/position', {
            method: 'POST',
            body: JSON.stringify({ portfolioId: activeId, portfolioName: activePf?.name || 'ראשי', position: newPos }),
          })
          newPos._dbId = data.id
        } catch {}
      }
      persistPos({ ...posData, positions: [...posData.positions, newPos] })
    } else {
      const updated = { ...posModal.initial, ...form, id: posModal.initial.id, _dbId: posModal.initial._dbId }
      if (isLoggedIn && updated._dbId) {
        apiFetch(`/portfolio/position/${updated._dbId}`, {
          method: 'PUT',
          body: JSON.stringify({ position: updated }),
        }).catch(() => {})
      }
      persistPos({ ...posData, positions: posData.positions.map(p => p.id === posModal.initial.id ? updated : p) })
    }
    setPosModal(null)
  }
  function handlePosDelete(id) {
    if (!window.confirm(isHe ? 'למחוק פוזיציה זו?' : 'Delete this position?')) return
    const pos = posData.positions.find(p => p.id === id)
    if (isLoggedIn && pos?._dbId) {
      apiFetch(`/portfolio/position/${pos._dbId}`, { method: 'DELETE' }).catch(() => {})
    }
    persistPos({ ...posData, positions: posData.positions.filter(p => p.id !== id) })
  }
  function handleAddSell(pos) {
    setPosModal({ mode:'edit', initial: { ...pos, sellDate: new Date().toISOString().slice(0,10) } })
  }

  // ── Watchlist CRUD ───────────────────────────────────────────────────────────
  function handleWLSave(form) {
    if (wlModal.mode === 'add') {
      persistWL([...watchlist, { ...form, id: uid(), alertTriggered: false, createdAt: new Date().toISOString().slice(0,10) }])
    } else {
      persistWL(watchlist.map(w => w.id === wlModal.initial.id ? { ...w, ...form, id: w.id, alertTriggered: w.alertTriggered } : w))
    }
    setWlModal(null)
  }
  function handleWLDelete(id) {
    persistWL(watchlist.filter(w => w.id !== id))
  }
  function handleResetAlert(id) {
    persistWL(watchlist.map(w => w.id === id ? { ...w, alertTriggered: false, alertActive: true } : w))
  }
  const dismissAlert = useCallback((alertId) => {
    setActiveAlerts(prev => prev.filter(a => a.id !== alertId))
  }, [])

  // ── Price polling for watchlist ──────────────────────────────────────────────
  const wlSymbols = useMemo(() =>
    [...new Set(watchlist.map(w => w.symbol).filter(Boolean))],
    [watchlist]
  )

  const { data: wlPrices = [] } = useQuery({
    queryKey: ['wl-prices', wlSymbols.join(',')],
    queryFn:  () => wlSymbols.length ? client.get(`/quotes?symbols=${wlSymbols.join(',')}`) : [],
    refetchInterval: 30000,
    enabled: wlSymbols.length > 0,
  })

  const priceMap = useMemo(() =>
    Object.fromEntries(wlPrices.map(p => [p.symbol, p.regularMarketPrice])),
    [wlPrices]
  )

  // ── Alert check on every price update ────────────────────────────────────────
  useEffect(() => {
    if (!wlPrices.length) return
    let changed = false
    const updated = watchlist.map(w => {
      if (!w.alertActive || w.alertTriggered || !w.alertPrice) return w
      const cur = priceMap[w.symbol]
      if (!cur) return w
      const triggered = w.alertDir === 'above' ? cur >= w.alertPrice : cur <= w.alertPrice
      if (!triggered) return w
      changed = true
      setActiveAlerts(prev => [
        ...prev,
        { id: uid(), symbol: w.symbol, currentPrice: cur, alertPrice: w.alertPrice, dir: w.alertDir, entryStage: w.entryStage }
      ])
      return { ...w, alertTriggered: true }
    })
    if (changed) persistWL(updated)
  }, [wlPrices]) // eslint-disable-line

  // ── Grouping ─────────────────────────────────────────────────────────────────
  const currentYYMM = new Date().toISOString().slice(0, 7)

  const years = useMemo(() => {
    const ys = new Set(posData.positions.map(p => parseInt(p.buyDate.slice(0,4))))
    ys.add(new Date().getFullYear())
    return [...ys].sort((a,b) => b-a)
  }, [posData.positions])

  const monthGroups = useMemo(() => {
    const groups = {}
    posData.positions.filter(p => p.buyDate.startsWith(String(viewYear))).forEach(p => {
      const key = p.buyDate.slice(0,7)
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    })
    Object.values(groups).forEach(arr => arr.sort((a,b) => b.buyDate.localeCompare(a.buyDate)))
    return groups
  }, [posData.positions, viewYear])

  const sortedMonths = Object.keys(monthGroups).sort((a,b) => b.localeCompare(a))

  const TABS = [
    { key:'trades',    label: isHe?'יומן מסחר':'Trade Journal' },
    { key:'watchlist', label: isHe?'רשימת מעקב':'Watchlist' },
    { key:'summary',   label: isHe?'סיכום שנתי':'Annual Summary' },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background:C.bg }}>
      <TopBar />

      {/* Alerts */}
      <AlertToast alerts={activeAlerts} onDismiss={dismissAlert} isHe={isHe} />

      {/* Position modal */}
      {posModal && <PositionModal initial={posModal.initial} onSave={handlePosSave} onClose={()=>setPosModal(null)} isDark={isDark} isHe={isHe} />}

      {/* Watchlist modal */}
      {wlModal && <WatchlistModal initial={wlModal.initial} onSave={handleWLSave} onClose={()=>setWlModal(null)} isDark={isDark} isHe={isHe} />}

      <main style={{ maxWidth:'1400px', width:'100%', margin:'0 auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:'16px' }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
          <h1 style={{ margin:0, fontSize:'20px', fontWeight:700, color:C.text, fontFamily:'Inter,sans-serif' }}>
            💼 {isHe?'תיק השקעות':'Portfolio'}
          </h1>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {tab === 'trades' && (
              <>
                <button
                  onClick={() => exportPositionsCsv(posData.positions, viewYear)}
                  title={isHe?`ייצא עסקאות שנת ${viewYear} ל-CSV`:`Export ${viewYear} trades to CSV`}
                  style={{ padding:'7px 14px', borderRadius:'6px', border:`1px solid ${C.border}`, background:C.card, color:C.muted, cursor:'pointer', fontSize:'12px', fontWeight:600, fontFamily:'Inter,sans-serif' }}>
                  ⬇️ {isHe?'ייצא CSV':'Export CSV'}
                </button>
                <button onClick={()=>setPosModal({ mode:'add', initial:{ buyDate: new Date().toISOString().slice(0,10) } })}
                  style={{ padding:'7px 16px', borderRadius:'6px', border:'none', background:C.accent, color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:700, fontFamily:'Inter,sans-serif' }}>
                  + {isHe?'פוזיציה חדשה':'New Position'}
                </button>
              </>
            )}
            {tab === 'watchlist' && (
              <button onClick={()=>setWlModal({ mode:'add' })}
                style={{ padding:'7px 16px', borderRadius:'6px', border:'none', background:'#f59e0b', color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:700, fontFamily:'Inter,sans-serif' }}>
                + {isHe?'הוסף למעקב':'Add to Watchlist'}
              </button>
            )}
          </div>
        </div>

        {/* ── Donut (shown when there are open positions) ── */}
        {posData.positions.some(p => p.sellPrice == null) && (tab === 'trades' || tab === 'summary') && (
          <OpenPositionsDonut positions={posData.positions} isDark={isDark} isHe={isHe} />
        )}

        {/* ── Portfolio selector ── */}
        <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
          {portfolios.portfolios.map(pf => (
            <div key={pf.id} style={{ display:'flex', alignItems:'center', gap:'2px' }}>
              {pfNameEdit === pf.id ? (
                <form onSubmit={e => { e.preventDefault(); if (pfNameInput.trim()) renamePortfolio(pf.id, pfNameInput.trim()) }}
                  style={{ display:'flex', gap:'4px', alignItems:'center' }}>
                  <input
                    autoFocus value={pfNameInput}
                    onChange={e => setPfNameInput(e.target.value)}
                    onBlur={() => setPfNameEdit(null)}
                    style={{ padding:'4px 8px', borderRadius:'6px', border:`1px solid ${C.accent}`, background:C.card, color:C.text, fontSize:'12px', fontFamily:'Inter,sans-serif', width:'90px', outline:'none' }}
                  />
                </form>
              ) : (
                <button
                  onClick={() => switchPortfolio(pf.id)}
                  onDoubleClick={() => { setPfNameEdit(pf.id); setPfNameInput(pf.name) }}
                  title={isHe ? 'לחץ פעמיים לשינוי שם' : 'Double-click to rename'}
                  style={{
                    padding:'5px 14px', borderRadius:'6px', border:`1px solid ${pf.id === activeId ? C.accent : C.border}`,
                    background: pf.id === activeId ? C.accent+'22' : 'transparent',
                    color: pf.id === activeId ? C.accent : C.muted,
                    cursor:'pointer', fontSize:'12px', fontWeight:600, fontFamily:'Inter,sans-serif',
                  }}>
                  {pf.name}
                </button>
              )}
              {portfolios.portfolios.length > 1 && pf.id !== activeId && (
                <button onClick={() => { if (window.confirm(isHe ? `למחוק את התיק "${pf.name}"?` : `Delete portfolio "${pf.name}"?`)) deletePortfolio(pf.id) }}
                  style={{ background:'transparent', border:'none', cursor:'pointer', color:C.muted, fontSize:'12px', padding:'2px 4px', lineHeight:1 }}>×</button>
              )}
            </div>
          ))}
          <button
            onClick={() => { const n = window.prompt(isHe ? 'שם התיק החדש:' : 'New portfolio name:'); if (n?.trim()) addPortfolio(n.trim()) }}
            style={{ padding:'5px 12px', borderRadius:'6px', border:`1px dashed ${C.border}`, background:'transparent', color:C.muted, cursor:'pointer', fontSize:'12px', fontFamily:'Inter,sans-serif' }}>
            + {isHe ? 'תיק חדש' : 'New Portfolio'}
          </button>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:'flex', gap:0, background:C.card, border:`1px solid ${C.border}`, borderRadius:'8px', overflow:'hidden', width:'fit-content' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={()=>setTab(t.key)}
              style={{ padding:'8px 22px', fontSize:'13px', fontWeight:600, fontFamily:'Inter,sans-serif', border:'none', cursor:'pointer',
                background: tab===t.key ? C.accent : 'transparent',
                color:      tab===t.key ? '#fff'    : C.muted }}>
              {t.label}
              {t.key === 'watchlist' && watchlist.filter(w=>w.alertActive&&!w.alertTriggered&&w.alertPrice).length > 0 && (
                <span style={{ marginLeft:'6px', background:'#f59e0b', color:'#fff', borderRadius:'10px', padding:'0px 6px', fontSize:'10px', fontWeight:700 }}>
                  {watchlist.filter(w=>w.alertActive&&!w.alertTriggered&&w.alertPrice).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Year nav (trades + summary) ── */}
        {(tab === 'trades' || tab === 'summary') && (
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
            <button onClick={()=>setViewYear(y=>y-1)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'6px', padding:'4px 10px', cursor:'pointer', color:C.text, fontFamily:'Inter,sans-serif' }}>←</button>
            {years.map(y=>(
              <button key={y} onClick={()=>setViewYear(y)}
                style={{ padding:'4px 14px', borderRadius:'6px', border:`1px solid ${y===viewYear?C.accent:C.border}`,
                  background:y===viewYear?C.accent+'22':'transparent', color:y===viewYear?C.accent:C.muted,
                  cursor:'pointer', fontSize:'13px', fontWeight:600, fontFamily:'Inter,sans-serif' }}>
                {y}
              </button>
            ))}
            <button onClick={()=>setViewYear(y=>y+1)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'6px', padding:'4px 10px', cursor:'pointer', color:C.text, fontFamily:'Inter,sans-serif' }}>→</button>
          </div>
        )}

        {/* ── Tab content ── */}

        {tab === 'trades' && (
          sortedMonths.length === 0 ? (
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'52px', textAlign:'center', color:C.muted, fontFamily:'Heebo,sans-serif' }}>
              <div style={{ fontSize:'32px', marginBottom:'12px' }}>📭</div>
              <div style={{ fontSize:'15px', marginBottom:'16px' }}>{isHe?`אין פוזיציות בשנת ${viewYear}`:`No positions in ${viewYear}`}</div>
              <button onClick={()=>setPosModal({ mode:'add', initial:{ buyDate:`${viewYear}-01-01` } })}
                style={{ padding:'9px 22px', borderRadius:'7px', border:'none', background:C.accent, color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:700, fontFamily:'Inter,sans-serif' }}>
                {isHe?'+ הוסף פוזיציה ראשונה':'+ Add First Position'}
              </button>
            </div>
          ) : sortedMonths.map(mk => (
            <MonthSection key={mk} monthKey={mk} positions={monthGroups[mk]}
              onEdit={pos=>setPosModal({mode:'edit',initial:pos})}
              onDelete={handlePosDelete}
              onAddSell={handleAddSell}
              onAddNew={()=>setPosModal({mode:'add',initial:{buyDate:mk+'-'+new Date().toISOString().slice(8,10)}})}
              isDark={isDark} isHe={isHe} defaultOpen={mk===currentYYMM} />
          ))
        )}

        {tab === 'watchlist' && (
          <WatchlistSection
            watchlist={watchlist}
            priceMap={priceMap}
            onEdit={item=>setWlModal({mode:'edit',initial:item})}
            onDelete={handleWLDelete}
            onResetAlert={handleResetAlert}
            onAddNew={()=>setWlModal({mode:'add'})}
            isDark={isDark}
            isHe={isHe}
          />
        )}

        {tab === 'summary' && (
          <AnnualSummary positions={posData.positions} year={viewYear} isDark={isDark} isHe={isHe} />
        )}

      </main>

      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }

        /* ── Mobile responsive – portfolio tables ──────────────────────── */
        @media (max-width: 768px) {
          .portfolio-table-wrap { display: none !important; }
          .portfolio-cards-wrap { display: flex !important; }
        }
        @media (min-width: 769px) {
          .portfolio-cards-wrap { display: none !important; }
        }
      `}</style>
    </div>
  )
}
