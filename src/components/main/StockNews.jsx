import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApp } from '../../contexts/AppContext'
import client from '../../api/client'

function timeAgo(isoDate, isHe) {
  const diff = (Date.now() - new Date(isoDate)) / 1000
  if (diff < 60)    return isHe ? 'הרגע'                         : 'just now'
  if (diff < 3600)  return isHe ? `לפני ${Math.floor(diff/60)}ד` : `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return isHe ? `לפני ${Math.floor(diff/3600)}ש` : `${Math.floor(diff/3600)}h ago`
  return isHe ? `לפני ${Math.floor(diff/86400)}י`                : `${Math.floor(diff/86400)}d ago`
}

const SOURCE_COLORS = {
  yahoo:       '#7C3AED',
  cnbc:        '#DC2626',
  marketwatch: '#059669',
  reuters:     '#2563EB',
}
const SOURCE_LABELS = {
  yahoo: 'Yahoo Finance', cnbc: 'CNBC', marketwatch: 'MarketWatch', reuters: 'Reuters',
}

export default function StockNews({ symbol }) {
  const { theme, lang } = useApp()
  const isDark = theme === 'dark'
  const isHe   = lang === 'he'
  const [open, setOpen] = useState(false)

  const C = {
    card:   isDark ? '#161b22' : '#ffffff',
    border: isDark ? '#30363d' : '#d0d7de',
    text:   isDark ? '#e6edf3' : '#1c2128',
    muted:  isDark ? '#8b949e' : '#57606a',
    accent: '#3b6ff5',
    hdr:    isDark ? '#21262d' : '#eaeef2',
  }

  const { data: news = [], isLoading } = useQuery({
    queryKey: ['stock-news', symbol],
    queryFn:  () => client.get(`/news?symbol=${symbol}`),
    staleTime: 300000,
    enabled:   open,   // only fetch when expanded
  })

  const articles = news.slice(0, 5)

  return (
    <div style={{ border:`1px solid ${C.border}`, borderRadius:'10px', overflow:'hidden', marginTop:'2px' }}>
      {/* Header — click to expand */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', background:C.hdr, userSelect:'none' }}
      >
        <span style={{ fontSize:'14px', fontWeight:700, color:C.text, fontFamily:'Inter,sans-serif', flex:1 }}>
          📰 {isHe ? `חדשות ${symbol}` : `${symbol} News`}
        </span>
        <span style={{ fontSize:'12px', color:C.muted }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ background:C.card, display:'flex', flexDirection:'column', gap:'0' }}>
          {isLoading ? (
            <div style={{ padding:'24px', textAlign:'center', color:C.muted, fontFamily:'Inter,sans-serif', fontSize:'13px' }}>
              {isHe ? 'טוען חדשות...' : 'Loading news...'}
            </div>
          ) : articles.length === 0 ? (
            <div style={{ padding:'24px', textAlign:'center', color:C.muted, fontFamily:'Inter,sans-serif', fontSize:'13px' }}>
              {isHe ? 'לא נמצאו חדשות' : 'No news found'}
            </div>
          ) : articles.map((item, i) => {
            const color  = SOURCE_COLORS[item.source] || '#6B7280'
            const srcLbl = SOURCE_LABELS[item.source] || item.source
            return (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display:'block', padding:'12px 16px',
                  borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
                  textDecoration:'none',
                  transition:'background 0.12s',
                }}
                onMouseOver={e  => e.currentTarget.style.background = isDark?'#1c2128':'#f0f6ff'}
                onMouseOut={e   => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'5px' }}>
                  <span style={{ fontSize:'10px', fontWeight:700, padding:'2px 7px', borderRadius:'4px',
                    background:color+'22', color, fontFamily:'Inter,sans-serif', whiteSpace:'nowrap' }}>
                    {srcLbl}
                  </span>
                  <span style={{ fontSize:'11px', color:C.muted, fontFamily:'Inter,sans-serif', marginLeft:'auto', whiteSpace:'nowrap' }}>
                    {timeAgo(item.pubDate, isHe)}
                  </span>
                </div>
                <p style={{ margin:0, fontSize:'13px', fontWeight:600, color:C.text, fontFamily:'Inter,sans-serif', lineHeight:1.45 }}>
                  {item.title}
                </p>
                {item.description && (
                  <p style={{ margin:'4px 0 0', fontSize:'11px', color:C.muted, fontFamily:'Inter,sans-serif', lineHeight:1.5 }}>
                    {item.description.slice(0, 120)}{item.description.length > 120 ? '…' : ''}
                  </p>
                )}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
