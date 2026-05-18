import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'

function checkPassword(pw) {
  const rules = [
    { id: 'len',   label: 'לפחות 8 תווים',            en: 'At least 8 characters',  ok: pw.length >= 8 },
    { id: 'upper', label: 'אות גדולה (A-Z)',            en: 'Uppercase letter (A-Z)', ok: /[A-Z]/.test(pw) },
    { id: 'lower', label: 'אות קטנה (a-z)',             en: 'Lowercase letter (a-z)', ok: /[a-z]/.test(pw) },
    { id: 'num',   label: 'מספר או תו מיוחד (!@#...)',  en: 'Number or special char', ok: /[\d\W_]/.test(pw) },
  ]
  return { rules, score: rules.filter(r => r.ok).length }
}

function StrengthBar({ score }) {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e']
  return (
    <div className="flex gap-1 flex-1 mt-1">
      {[0,1,2,3].map(i => (
        <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
          style={{ background: i < score ? colors[score - 1] : 'var(--color-surface-border, #30363d)' }} />
      ))}
    </div>
  )
}

export default function RegisterModal({ onClose }) {
  const { register } = useAuth()
  const { lang }     = useApp()
  const isHe         = lang === 'he'

  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(null)   // null | { username, emailSent }
  const overlayRef = useRef(null)

  const { rules, score } = checkPassword(password)
  const allRulesOk = score === 4

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!username.trim())   return setError(isHe ? 'נא להזין שם משתמש' : 'Username required')
    if (!email.trim())      return setError(isHe ? 'נא להזין כתובת מייל' : 'Email required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(isHe ? 'כתובת מייל לא תקינה' : 'Invalid email')
    if (!allRulesOk)        return setError(isHe ? 'הסיסמא לא עומדת בדרישות' : 'Password does not meet requirements')
    if (password !== confirm) return setError(isHe ? 'הסיסמאות אינן תואמות' : 'Passwords do not match')

    setLoading(true)
    try {
      const result = await register(username.trim(), password, email.trim())
      setSuccess({ username: result.username, emailSent: result.emailSent })
    } catch (err) {
      const msg = err.response?.data?.error || (isHe ? 'שגיאה בהרשמה' : 'Registration failed')
      const heMsg = {
        'Username already taken':  'שם המשתמש כבר תפוס',
        'Email already registered': 'המייל כבר רשום במערכת',
      }
      setError(isHe ? (heMsg[msg] || msg) : msg)
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

        {/* ── Success state ── */}
        {success ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div style={{ fontSize: 48 }}>✅</div>
            <h2 className="text-lg font-bold text-tx-primary font-heebo">
              {isHe ? `ברוך הבא, ${success.username}!` : `Welcome, ${success.username}!`}
            </h2>
            {success.emailSent ? (
              <p className="text-sm text-tx-muted font-heebo leading-relaxed">
                {isHe
                  ? 'נשלח מייל אישור לכתובת שהזנת. לחץ על הקישור במייל לאימות החשבון.'
                  : 'A verification email was sent. Click the link in the email to verify your account.'}
                <br />
                <span className="text-xs opacity-60 mt-1 block">
                  {isHe ? 'המייל משמש לשחזור סיסמא בלבד.' : 'Email is used for password recovery only.'}
                </span>
              </p>
            ) : (
              <p className="text-sm text-tx-muted font-heebo leading-relaxed">
                {isHe
                  ? 'נרשמת בהצלחה! (שליחת המייל לא הוגדרה עדיין על ידי מנהל האתר)'
                  : 'Registered successfully! (Email sending not yet configured by the site admin)'}
              </p>
            )}
            <button onClick={onClose} className="btn-primary w-full font-heebo mt-2">
              {isHe ? 'המשך לאתר' : 'Continue to site'}
            </button>
          </div>
        ) : (
          /* ── Registration form ── */
          <>
            <div>
              <h2 className="text-lg font-bold text-tx-primary font-heebo">
                {isHe ? 'הירשם ל-ALPHORA' : 'Register to ALPHORA'}
              </h2>
              <p className="text-xs text-tx-muted mt-0.5 font-heebo">
                {isHe ? 'צור חשבון חינמי' : 'Create a free account'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" autoComplete="off">
              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-tx-muted font-heebo">
                  {isHe ? 'שם משתמש' : 'Username'}
                </label>
                <input type="text" value={username} onChange={e => { setUsername(e.target.value); setError('') }}
                  placeholder={isHe ? 'בחר שם משתמש...' : 'Choose a username...'}
                  className="input-field text-sm" maxLength={30} autoFocus />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-tx-muted font-heebo">
                  {isHe ? 'כתובת מייל' : 'Email address'}
                </label>
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder={isHe ? 'your@email.com' : 'your@email.com'}
                  className="input-field text-sm" />
                <span className="text-xs text-tx-muted font-heebo" style={{ opacity: 0.7 }}>
                  {isHe ? '📧 לשחזור סיסמא בלבד — לא יוצג לאחרים' : '📧 For password recovery only — not shown publicly'}
                </span>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-tx-muted font-heebo">
                  {isHe ? 'סיסמא' : 'Password'}
                </label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder={isHe ? 'צור סיסמא חזקה...' : 'Create a strong password...'}
                    className="input-field text-sm w-full pe-10" />
                  <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                    className="absolute top-1/2 -translate-y-1/2 end-2.5 text-tx-muted hover:text-tx-primary transition-colors">
                    {showPw
                      ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                  </button>
                </div>
                {password.length > 0 && <StrengthBar score={score} />}
                {password.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {rules.map(r => (
                      <div key={r.id} className="flex items-center gap-1.5">
                        <span style={{ color: r.ok ? '#22c55e' : '#6b7280', fontSize: 11 }}>{r.ok ? '✓' : '○'}</span>
                        <span className="text-xs font-heebo" style={{ color: r.ok ? '#22c55e' : '#6b7280' }}>
                          {isHe ? r.label : r.en}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-tx-muted font-heebo">
                  {isHe ? 'אימות סיסמא' : 'Confirm Password'}
                </label>
                <input type={showPw ? 'text' : 'password'} value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError('') }}
                  placeholder={isHe ? 'הזן סיסמא שוב...' : 'Repeat password...'}
                  className="input-field text-sm"
                  style={{ borderColor: confirm && confirm !== password ? '#ef4444' : undefined }} />
                {confirm && confirm !== password && (
                  <span className="text-xs text-red-400 font-heebo">
                    {isHe ? 'הסיסמאות אינן תואמות' : 'Passwords do not match'}
                  </span>
                )}
              </div>

              {error && (
                <div className="text-sm text-red-400 font-heebo text-center bg-red-500/10 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || !allRulesOk || password !== confirm}
                className="btn-primary w-full font-heebo disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? (isHe ? 'נרשם...' : 'Registering...') : (isHe ? 'הירשם' : 'Register')}
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
