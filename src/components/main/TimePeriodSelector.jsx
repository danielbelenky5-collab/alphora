import { TIME_PERIODS } from '../../constants/timePeriods'
import { useApp } from '../../contexts/AppContext'

export default function TimePeriodSelector({ selected, onChange }) {
  const { lang } = useApp()
  return (
    <div className="flex items-center gap-1 p-1 bg-surface-card border border-surface-border rounded-lg w-fit">
      {TIME_PERIODS.map(p => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={`period-tab ${selected === p.id ? 'period-tab-active' : 'period-tab-inactive'}`}
        >
          {lang === 'he' ? p.labelHe : p.labelEn}
        </button>
      ))}
    </div>
  )
}
