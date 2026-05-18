import { useApp } from '../../../contexts/AppContext'

export default function DashboardHeader() {
  const { t } = useApp()
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-surface-border">
      <div className="w-1.5 h-5 rounded-full bg-brand-500" />
      <h2 className="text-sm font-semibold text-tx-primary font-heebo">
        {t('dashboard')}
      </h2>
    </div>
  )
}
