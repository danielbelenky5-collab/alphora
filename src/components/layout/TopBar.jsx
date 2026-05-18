import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from './Logo'
import SearchBar from './SearchBar'
import MarketStatusBadge from './MarketStatusBadge'
import RegisterModal from '../auth/RegisterModal'
import ForgotPasswordModal from '../auth/ForgotPasswordModal'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
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

function UserIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

// ── Inline login form (shown in topbar when not logged in) ───────────────────
function AuthBar({ onOpenRegister, onOpenForgot, isHe }) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async e => {
    e.preventDefault()
    if (!username || !password) return
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch {
      setError(isHe ? 'שם משתמש או סיסמא שגויים' : 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5" dir={isHe ? 'rtl' : 'ltr'}>
      <form onSubmit={handleLogin} className="flex items-center gap-1.5">
        <input type="text" value={username}
          onChange={e => { setUsername(e.target.value); setError('') }}
          placeholder={isHe ? 'שם משתמש' : 'Username'}
          className="topbar-input" style={{ width: 108 }} autoComplete="username" />
        <input type="password" value={password}
          onChange={e => { setPassword(e.target.value); setError('') }}
          placeholder={isHe ? 'סיסמא' : 'Password'}
          className="topbar-input" style={{ width: 90 }} autoComplete="current-password" />
        <button type="submit" disabled={loading}
          className="btn-primary text-xs px-3 font-heebo whitespace-nowrap" style={{ height: 30 }}>
          {loading ? '...' : (isHe ? 'התחבר' : 'Login')}
        </button>
        <button type="button" onClick={onOpenRegister}
          className="btn-ghost text-xs px-3 font-heebo whitespace-nowrap" style={{ height: 30 }}>
          {isHe ? 'הירשם' : 'Register'}
        </button>
      </form>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-red-400 font-heebo">{error}</span>}
        <button type="button" onClick={onOpenForgot}
          className="text-xs font-heebo" style={{ color: 'var(--color-tx-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
          {isHe ? 'שכחתי סיסמא' : 'Forgot password?'}
        </button>
      </div>
    </div>
  )
}

// ── Logged-in chip ────────────────────────────────────────────────────────────
function UserChip({ username, onLogout, isHe }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
        style={{ background: 'var(--color-brand-500, #3b6ff5)22', border: '1px solid var(--color-brand-500, #3b6ff5)44' }}>
        <UserIcon />
        <span className="text-xs font-semibold font-inter text-tx-primary" style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {username}
        </span>
      </div>
      <button onClick={onLogout} className="btn-ghost text-xs font-heebo px-2 py-1" style={{ height: 30 }}>
        {isHe ? 'התנתק' : 'Logout'}
      </button>
    </div>
  )
}

export default function TopBar() {
  const { theme, toggleTheme, lang, toggleLang, t } = useApp()
  const { user, logout } = useAuth()
  const isHe = lang === 'he'

  const [menuOpen,     setMenuOpen]     = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [showForgot,   setShowForgot]   = useState(false)

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-surface-border">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 relative flex items-center">
          {/* Left side: search bar */}
          <div className="flex-1 max-w-md">
            <SearchBar mode="topbar" />
          </div>

          {/* Center: logo */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="pointer-events-auto">
              <Logo size="sm" linkTo="/" />
            </div>
          </div>

          {/* Right side */}
          <nav className="flex items-center gap-2 ms-auto">
            {/* Market status badge */}
            <div className="hidden sm:flex">
              <MarketStatusBadge />
            </div>

            {/* Desktop nav links */}
            <Link to="/news"      className="btn-ghost text-sm font-heebo hidden sm:block">{t('news') || 'News'}</Link>
            <Link to="/earnings"  className="btn-ghost text-sm font-heebo hidden sm:block">{isHe ? 'דיווחים' : 'Earnings'}</Link>
            <Link to="/screener"  className="btn-ghost text-sm font-heebo hidden sm:block">{isHe ? 'סנן' : 'Screener'}</Link>
            <Link to="/info"      className="btn-ghost text-sm font-heebo hidden sm:block">{isHe ? 'מידע' : 'Info'}</Link>
            <Link to="/portfolio" className="btn-ghost text-sm font-heebo hidden sm:block">{t('portfolio') || 'Portfolio'}</Link>
            <Link to="/journal"   className="btn-ghost text-sm font-heebo hidden sm:block">{t('journal')}</Link>
            {user?.isAdmin && (
              <Link to="/admin" className="btn-ghost text-sm font-heebo hidden sm:block" style={{ color: '#f59e0b' }}>
                {isHe ? 'ניהול' : 'Admin'}
              </Link>
            )}

            {/* Auth section — desktop only */}
            <div className="hidden sm:flex items-center gap-1.5">
              {user ? (
                <UserChip username={user.username} onLogout={logout} isHe={isHe} />
              ) : (
                <AuthBar onOpenRegister={() => setShowRegister(true)} onOpenForgot={() => setShowForgot(true)} isHe={isHe} />
              )}
            </div>

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

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="btn-icon sm:hidden"
              aria-label="Menu"
            >
              {menuOpen ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </nav>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="sm:hidden bg-surface border-t border-surface-border px-6 py-3 flex flex-col gap-2" dir={isHe ? 'rtl' : 'ltr'}>
            <div className="py-1"><MarketStatusBadge /></div>
            <Link to="/news"      onClick={() => setMenuOpen(false)} className="btn-ghost text-sm font-heebo text-start">{t('news') || 'News'}</Link>
            <Link to="/earnings"  onClick={() => setMenuOpen(false)} className="btn-ghost text-sm font-heebo text-start">{isHe ? 'דיווחים' : 'Earnings'}</Link>
            <Link to="/screener"  onClick={() => setMenuOpen(false)} className="btn-ghost text-sm font-heebo text-start">{isHe ? 'סנן מניות' : 'Screener'}</Link>
            <Link to="/info"      onClick={() => setMenuOpen(false)} className="btn-ghost text-sm font-heebo text-start">{isHe ? 'מידע' : 'Info'}</Link>
            <Link to="/portfolio" onClick={() => setMenuOpen(false)} className="btn-ghost text-sm font-heebo text-start">{t('portfolio') || 'Portfolio'}</Link>
            <Link to="/journal"   onClick={() => setMenuOpen(false)} className="btn-ghost text-sm font-heebo text-start">{t('journal')}</Link>
            {/* Auth — mobile */}
            <div className="pt-1 border-t border-surface-border">
              {user ? (
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-semibold text-tx-primary font-heebo">👤 {user.username}</span>
                  <button onClick={() => { logout(); setMenuOpen(false) }} className="btn-ghost text-xs font-heebo">
                    {isHe ? 'התנתק' : 'Logout'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <AuthBar onOpenRegister={() => { setMenuOpen(false); setShowRegister(true) }} onOpenForgot={() => { setMenuOpen(false); setShowForgot(true) }} isHe={isHe} />
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Register modal */}
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
        .topbar-input:focus {
          border-color: var(--color-brand-500, #3b6ff5);
        }
        .topbar-input::placeholder {
          color: var(--color-tx-muted, #8b949e);
        }
      `}</style>
    </>
  )
}
