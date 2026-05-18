import { useQuery } from '@tanstack/react-query'
import client from '../../api/client'
import { useApp } from '../../contexts/AppContext'

const DAY_HE = {
  Sunday: 'ראשון', Monday: 'שני', Tuesday: 'שלישי',
  Wednesday: 'רביעי', Thursday: 'חמישי', Friday: 'שישי', Saturday: 'שבת',
}

function formatDate(dateStr, lang) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export default function TradingCalendarTable({ exchange }) {
  const { lang, t } = useApp()

  const { data, isLoading, error } = useQuery({
    queryKey: ['calendar', exchange],
    queryFn: () => client.get(`/calendar/${exchange}`),
    staleTime: 3600000,
  })

  if (isLoading) {
    return (
      <div className="card overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-surface-border">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-4 w-32" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6 text-center text-red-400 text-sm font-heebo">
        {t('loadingError')}
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border bg-surface">
            <th className="px-4 py-3 text-start text-xs font-medium text-tx-muted font-heebo">{t('day')}</th>
            <th className="px-4 py-3 text-start text-xs font-medium text-tx-muted font-heebo">{t('date')}</th>
            <th className="px-4 py-3 text-start text-xs font-medium text-tx-muted font-heebo">{t('event')}</th>
            <th className="px-4 py-3 text-start text-xs font-medium text-tx-muted font-heebo">{t('status')}</th>
          </tr>
        </thead>
        <tbody>
          {data?.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-tx-muted font-heebo">
                {t('noUpcoming')}
              </td>
            </tr>
          )}
          {data?.map((row, i) => (
            <tr key={i} className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors">
              <td className="px-4 py-3 text-tx-secondary font-heebo">
                {lang === 'he' ? (DAY_HE[row.day] || row.day) : row.day}
              </td>
              <td className="px-4 py-3 text-tx-secondary font-inter tabular-nums text-xs">
                {formatDate(row.date, lang)}
              </td>
              <td className="px-4 py-3 text-tx-primary font-heebo">{row.label}</td>
              <td className="px-4 py-3">
                {row.status === 'closed' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-heebo bg-red-500/15 text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    {t('closed')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-heebo bg-amber-500/15 text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {t('earlyClose')} {row.closeTime}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
