import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'

export default function ForgotPasswordModal({ onClose }) {
  const { forgotPassword } = useAuth()
  const { lang } = useApp()
  const isHe = lang === 'he'

  const [email,   setEmail]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const overlayRef = useRef(null)

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!email.trim()) return setError(isHe ? 'נא להזין כתובת מייל' : 'Email required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setError(isHe ? 'כתובת מייל לא תקינה' : 'Invalid email address')

    setError('')
    setLoading(true)
    try {
      await forgotPassword(email.trim())
      setSent(true)
    } catch {
      setError(isHe ? 'שגיאה בשליחת המייל' : 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className="card w-full max-w-sm mx-4 p-6 flex flex-col gap-5 relative"
        style={{ animation: 'auth-slide-in 0.18s ease-out' }}
        dir={isHe ? 'rtl' : 'ltr'}
      >
        <button onClick={onClose} className="btn-icon absolute top-4 end-4" aria-label="Close">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {sent ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div style={{ fontSize: 48 }}>📧</div>
            <h2 className="text-lg font-bold text-tx-primary font-heebo">
              {isHe ? 'המייל נשלח!' : 'Email sent!'}
            </h2>
            <p className="text-sm text-tx-muted font-heebo leading-relaxed">
              {isHe
                ? 'אם המייל רשום במערכת, תקבל קישור לאיפוס סיסמא תוך מספר דקות. בדוק גם בתיקיית הספאם.'
                : 'If the email is registered, you will receive a reset link within a few minutes. Check your spam folder too.'}
            </p>
            <button onClick={onClose} className="btn-primary w-full font-heebo mt-2">
              {isHe ? 'סגור' : 'Close'}
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <>
            <div>
              <h2 className="text-lg font-bold text-tx-primary font-heebo">
                {isHe ? 'שכחתי סיסמא' : 'Forgot Password'}
              </h2>
              <p className="text-xs text-tx-muted mt-0.5 font-heebo">
                {isHe
                  ? 'הזן את המייל שנרשמת איתו — נשלח לך קישור לאיפוס'
                  : 'Enter the email you registered with — we will send you a reset link'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-tx-muted font-heebo">
                  {isHe ? 'כתובת מייל' : 'Email address'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="your@email.com"
                  className="input-field text-sm"
                  autoFocus
                />
              </div>

              {error && (
                <div className="text-sm text-red-400 font-heebo text-center bg-red-500/10 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="btn-primary w-full font-heebo disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? (isHe ? 'שולח...' : 'Sending...') : (isHe ? 'שלח קישור איפוס' : 'Send Reset Link')}
              </button>
            </form>
          </>
        )}
      </div>

      <style>{`
        @keyframes auth-slide-in {
          from { opacity:0; transform:scale(0.95) translateY(-8px); }
          to   { opacity:1; transform:scale(1)    translateY(0);     }
        }
        .input-field {
          background: var(--color-surface-alt, #161b22);
          border: 1px solid var(--color-surface-border, #30363d);
          border-radius: 8px; padding: 8px 12px;
          color: var(--color-tx-primary, #e6edf3);
          outline: none; width: 100%; transition: border-color 0.15s;
        }
        .input-field:focus { border-color: var(--color-brand-500, #3b6ff5); }
      `}</style>
    </div>
  )
}
