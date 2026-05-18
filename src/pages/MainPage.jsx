import { useState } from 'react'
import { useParams } from 'react-router-dom'
import TopBar from '../components/layout/TopBar'
import FundamentalToggle from '../components/main/FundamentalToggle'
import StockChartApex from '../components/main/StockChartApex'
import FundamentalView from '../components/main/FundamentalView'
import DashboardPanel from '../components/main/Dashboard/DashboardPanel'
import StockNews from '../components/main/StockNews'

export default function MainPage() {
  const { symbol = 'AAPL' } = useParams()
  const [view, setView] = useState('technical')

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />

      <main className="flex-1 max-w-screen-2xl w-full mx-auto px-6 py-5 flex flex-col gap-5">
        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <FundamentalToggle view={view} onChange={setView} />
        </div>

        {/* Content */}
        <div className="flex gap-5 flex-1">
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {view === 'technical' ? (
              <>
                <StockChartApex symbol={symbol} />
                <StockNews symbol={symbol} />
              </>
            ) : (
              <FundamentalView symbol={symbol} />
            )}
          </div>

          <div className="w-72 xl:w-80 flex-shrink-0">
            <DashboardPanel />
          </div>
        </div>
      </main>
    </div>
  )
}
