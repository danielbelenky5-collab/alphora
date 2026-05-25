import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/layout/Logo'
import SearchBar from '../components/layout/SearchBar'
import MarketIndicator from '../components/landing/MarketIndicator'
import TopMoversCard   from '../components/landing/TopMoversCard'

import RegisterModal from '../components/auth/RegisterModal'
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal'
import { useQuotes } from '../hooks/useQuotes'
import { useSparklines } from '../hooks/useSparklines'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

const MARKET_SYMBOLS = ['^GSPC', '^NDX', 'BTC-USD']
const MARKET_LABELS_HE = ['S&P 500', 'נאסד"ק', 'ביטקויין']
const MARKET_LABELS_EN = ['S&P 500', 'NASDAQ', 'Bitcoin']

export default function LandingPage() {
  const { theme, toggleTheme, lang, toggleLang, t } = useApp()
  const { user, login, logout } = useAuth()
  const isHe = lang === 'he'

  const [loginUser, setLoginUser]   = useState('')
  const [loginPass, setLoginPass]   = useState('')
  const [loginErr,  setLoginErr]    = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [showForgot,   setShowForgot]   = useState(false)

  const handleLogin = async e => {
    e.preventDefault()
    if (!loginUser || !loginPass) return
    setLoginErr('')
    setLoginLoading(true)
    try {
      await login(loginUser, loginPass)
    } catch {
      setLoginErr(isHe ? 'שם משתמש או סיסמא שגויים' : 'Invalid credentials')
    } finally {
      setLoginLoading(false)
    }
  }

  // Poll quotes every 10 s — server cache is 10 s → combined lag ≤ 20 s
  const { data: quotes, isLoading, dataUpdatedAt } = useQuotes(MARKET_SYMBOLS, { refetchInterval: 10_000 })
  const { sparkMap, isLoading: sparkLoading } = useSparklines(MARKET_SYMBOLS)

  const quoteMap = {}
  if (Array.isArray(quotes)) {
    quotes.forEach(q => { quoteMap[q.symbol] = q })
  }

  const labels = lang === 'he' ? MARKET_LABELS_HE : MARKET_LABELS_EN

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-10 relative">
      {/* Top nav */}
      <nav className="absolute top-0 right-0 left-0 flex items-center justify-between px-6 py-4" dir={isHe ? 'rtl' : 'ltr'}>
        <div /> {/* spacer */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <Link to="/journal" className="btn-ghost text-sm font-heebo">
            {t('journal')}
          </Link>

          {/* Auth section */}
          {user ? (
            /* Logged-in chip */
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{ background: 'var(--color-brand-500,#3b6ff5)22', border: '1px solid var(--color-brand-500,#3b6ff5)44' }}>
                <svg className="w-3.5 h-3.5 text-tx-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                <span className="text-xs font-semibold font-inter text-tx-primary">{user.username}</span>
              </div>
              <button onClick={logout} className="btn-ghost text-xs font-heebo px-2 py-1">
                {isHe ? 'התנתק' : 'Logout'}
              </button>
            </div>
          ) : (
            /* Login form + register button */
            <form onSubmit={handleLogin} className="flex items-center gap-1.5">
              <input
                type="text"
                value={loginUser}
                onChange={e => { setLoginUser(e.target.value); setLoginErr('') }}
                placeholder={isHe ? 'שם משתמש' : 'Username'}
                className="topbar-input"
                style={{ width: 108 }}
              />
              <input
                type="password"
                value={loginPass}
                onChange={e => { setLoginPass(e.target.value); setLoginErr('') }}
                placeholder={isHe ? 'סיסמא' : 'Password'}
                className="topbar-input"
                style={{ width: 90 }}
              />
              <button
                type="submit"
                disabled={loginLoading}
                className="btn-primary text-xs px-3 font-heebo whitespace-nowrap"
                style={{ height: 30 }}
              >
                {loginLoading ? '...' : (isHe ? 'התחבר' : 'Login')}
              </button>
              <button
                type="button"
                onClick={() => setShowRegister(true)}
                className="btn-ghost text-xs px-3 font-heebo whitespace-nowrap"
                style={{ height: 30 }}
              >
                {isHe ? 'הירשם' : 'Register'}
              </button>
              {loginErr && (
                <span className="text-xs text-red-400 font-heebo hidden lg:block">{loginErr}</span>
              )}
            </form>
          )}
          {!user && (
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-xs font-heebo"
              style={{ color: 'var(--color-tx-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isHe ? 'שכחתי סיסמא' : 'Forgot password?'}
            </button>
          )}

          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className="btn-icon text-xs font-bold font-inter min-w-[2.5rem] flex items-center justify-center"
          >
            {lang === 'he' ? 'EN' : 'HE'}
          </button>
          {/* Theme toggle */}
          <button onClick={toggleTheme} className="btn-icon">
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </nav>

      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
      {showForgot   && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      <style>{`
        .topbar-input {
          background: var(--color-surface-alt, #161b22);
          border: 1px solid var(--color-surface-border, #30363d);
          border-radius: 7px;
          padding: 5px 9px;
          font-size: 12px;
          color: var(--color-tx-primary, #e6edf3);
          outline: none;
          height: 30px;
          transition: border-color 0.15s;
          font-family: Heebo, Inter, sans-serif;
        }
        .topbar-input:focus { border-color: var(--color-brand-500, #3b6ff5); }
        .topbar-input::placeholder { color: var(--color-tx-muted, #8b949e); }
      `}</style>

      {/* Logo + Search bar — grouped as a unit */}
      <div className="flex flex-col items-center gap-5 w-full max-w-xl">
        <Logo size="lg" linkTo={null} />

        <div className="w-full">
          <SearchBar mode="landing" />
          <p className="text-center text-xs text-tx-muted mt-2 font-heebo">
            {t('searchHint')}
          </p>
        </div>
      </div>

      {/* Market indicators with sparklines */}
      <div className="flex flex-wrap justify-center gap-4">
        {MARKET_SYMBOLS.map((sym, i) => (
          <MarketIndicator
            key={sym}
            symbol={sym}
            label={labels[i]}
            quote={quoteMap[sym]}
            sparkData={sparkMap[sym]}
            loading={isLoading || sparkLoading}
            updatedAt={dataUpdatedAt}
          />
        ))}
      </div>

      {/* Top movers (gainers / losers / most active) */}
      <TopMoversCard />

      {/* Footer */}
      <p className="absolute bottom-6 text-xs text-tx-muted">
        {t('realtimeData')}
      </p>
    </div>
  )
}
