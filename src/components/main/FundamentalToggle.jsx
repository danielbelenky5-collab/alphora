import { useApp } from '../../contexts/AppContext'

export default function FundamentalToggle({ view, onChange }) {
  const { t } = useApp()
  return (
    <div className="flex items-center gap-0 p-0.5 bg-surface-card border border-surface-border rounded-lg w-fit">
      {['technical', 'fundamental'].map(v => {
        const isActive = view === v
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors font-heebo ${
              isActive ? 'bg-brand-500 text-white shadow-sm' : 'text-tx-muted hover:text-tx-primary'
            }`}
          >
            {v === 'technical' ? t('technical') : t('fundamental')}
          </button>
        )
      })}
    </div>
  )
}
