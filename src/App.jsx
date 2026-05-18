import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage    from './pages/LandingPage'
import MainPage       from './pages/MainPage'
import JournalPage    from './pages/JournalPage'
import NewsPage       from './pages/NewsPage'
import PortfolioPage  from './pages/PortfolioPage'
import AdminPage          from './pages/AdminPage'
import VerifyEmailPage    from './pages/VerifyEmailPage'
import ResetPasswordPage  from './pages/ResetPasswordPage'
import ProtectedRoute     from './components/auth/ProtectedRoute'
import EarningsPage      from './pages/EarningsPage'
import ScreenerPage      from './pages/ScreenerPage'
import InfoPage          from './pages/InfoPage'

export default function App() {
  return (
    <Routes>
      <Route path="/"              element={<LandingPage />} />
      <Route path="/stock/:symbol" element={<MainPage />} />
      <Route path="/journal"       element={<ProtectedRoute><JournalPage /></ProtectedRoute>} />
      <Route path="/news"          element={<NewsPage />} />
      <Route path="/earnings"      element={<EarningsPage />} />
      <Route path="/screener"      element={<ScreenerPage />} />
      <Route path="/info"          element={<InfoPage />} />
      <Route path="/portfolio"     element={<ProtectedRoute><PortfolioPage /></ProtectedRoute>} />
      <Route path="/admin"          element={<AdminPage />} />
      <Route path="/verify-email"   element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*"              element={<Navigate to="/" replace />} />
    </Routes>
  )
}
