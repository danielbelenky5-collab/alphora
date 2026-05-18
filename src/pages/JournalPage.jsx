import { useState } from 'react'
import TopBar from '../components/layout/TopBar'
import ExchangeToggle from '../components/journal/ExchangeToggle'
import TradingCalendarTable from '../components/journal/TradingCalendarTable'
import JournalEventForm from '../components/journal/JournalEventForm'
import NewsCalendar from '../components/journal/NewsCalendar'
import { useApp } from '../contexts/AppContext'

export default function JournalPage() {
  const [exchange, setExchange] = useState('US')
  const { t } = useApp()

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-screen-xl w-full mx-auto px-6 py-6 flex flex-col gap-8">

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-xl font-bold text-tx-primary font-heebo">{t('holidayCalendar')}</h1>
            <ExchangeToggle exchange={exchange} onChange={setExchange} />
          </div>
          <TradingCalendarTable exchange={exchange} />
        </section>

        <div className="border-t border-surface-border" />

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-tx-primary font-heebo">{t('personalJournal')}</h2>
          <JournalEventForm />
        </section>

        <div className="border-t border-surface-border" />

        <section className="flex flex-col gap-4">
          <NewsCalendar />
        </section>

      </main>
    </div>
  )
}
