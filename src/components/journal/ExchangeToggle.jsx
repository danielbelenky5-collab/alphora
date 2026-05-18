import { useApp } from '../../contexts/AppContext'

export default function ExchangeToggle({ exchange, onChange }) {
  const { t } = useApp()
  const options = [
    { id: 'US',   label: t('usMarket'), flag: '🇺🇸' },
    { id: 'TASE', label: t('taMarket'), flag: '🇮🇱' },
  ]
  return (
    <div className="flex items-center gap-1 p-0.5 bg-surface-card border border-surface-border rounded-lg w-fit">
      {options.map(e => (
        <button
          key={e.id}
          onClick={() => onChange(e.id)}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors font-heebo ${
            exchange === e.id
              ? 'bg-brand-500 text-white'
              : 'text-tx-muted hover:text-tx-primary hover:bg-surface-hover'
          }`}
        >
          <span>{e.flag}</span>
          <span>{e.label}</span>
        </button>
      ))}
    </div>
  )
}
