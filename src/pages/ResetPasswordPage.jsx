import { useState, useEffect } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function checkPassword(pw) {
  const rules = [
    { id: 'len',   label: 'לפחות 8 תווים',            en: 'At least 8 characters',  ok: pw.length >= 8 },
    { id: 'upper', label: 'אות גדולה (A-Z)',            en: 'Uppercase letter (A-Z)', ok: /[A-Z]/.test(pw) },
    { id: 'lower', label: 'אות קטנה (a-z)',             en: 'Lowercase letter (a-z)', ok: /[a-z]/.test(pw) },
    { id: 'num',   label: 'מספר או תו מיוחד (!@#...)',  en: 'Number or special char', ok: /[\d\W_]/.test(pw) },
  ]
  return { rules, score: rules.filter(r => r.ok).length }
}

export default function ResetPasswordPage() {
  const [params]   = useSearchParams()
  const token      = params.get('token')
  const navigate   = useNavigate()
  const { resetPassword } = useAuth()

  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)

  const { rules, score } = checkPassword(password)
  const allOk = score === 4

  useEffect(() => {
    if (!token) navigate('/', { replace: true })
  }, [token])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!allOk)               return setError('הסיסמא לא עומדת בדרישות')
    if (password !== confirm) return setError('הסיסמאות אינן תואמות')

    setError('')
    setLoading(true)
    try {
      await resetPassword(token, password)
      setSuccess(true)
    } catch (err) {
      const msg = err.response?.data?.error || 'שגיאה באיפוס הסיסמא'
      setError(msg === 'Invalid or expired reset link' ? 'הקישור לא תקין או שפג תוקפו' : msg)
    } finally {
      setLoading(false)
    }
  }

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e']

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0d1117', fontFamily: 'Heebo, Inter, sans-serif', padding: 24
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d', borderRadius: 16,
        padding: '48px 40px', maxWidth: 420, width: '100%',
      }} dir="rtl">

        <div style={{ fontSize: 24, fontWeight: 900, color: '#3b6ff5', letterSpacing: '-1px', marginBottom: 32, textAlign: 'center' }}>
          ALPHORA
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔐</div>
            <h1 style={{ color: '#e6edf3', fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>
              הסיסמא עודכנה בהצלחה!
            </h1>
            <p style={{ color: '#8b949e', fontSize: 14, margin: '0 0 32px' }}>
              כעת תוכל להתחבר עם הסיסמא החדשה שלך.
            </p>
            <Link to="/" style={{
              display: 'inline-block', background: '#3b6ff5', color: '#fff',
              textDecoration: 'none', padding: '12px 32px', borderRadius: 8, fontWeight: 700
            }}>
              חזור להתחברות ←
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ color: '#e6edf3', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
              🔑 איפוס סיסמא
            </h1>
            <p style={{ color: '#8b949e', fontSize: 13, margin: '0 0 28px' }}>
              בחר סיסמא חדשה לחשבון שלך
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#8b949e' }}>סיסמא חדשה</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="צור סיסמא חזקה..."
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: '#0d1117', border: '1px solid #30363d', borderRadius: 8,
                      padding: '9px 40px 9px 12px', color: '#e6edf3', fontSize: 14,
                      outline: 'none', fontFamily: 'inherit'
                    }}
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e' }}>
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>

                {/* Strength bar */}
                {password.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                    {[0,1,2,3].map(i => (
                      <div key={i} style={{
                        height: 4, flex: 1, borderRadius: 4,
                        background: i < score ? colors[score - 1] : '#30363d',
                        transition: 'background 0.3s'
                      }} />
                    ))}
                  </div>
                )}

                {/* Rules */}
                {password.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                    {rules.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: r.ok ? '#22c55e' : '#6b7280', fontSize: 11 }}>{r.ok ? '✓' : '○'}</span>
                        <span style={{ fontSize: 12, color: r.ok ? '#22c55e' : '#6b7280' }}>{r.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#8b949e' }}>אימות סיסמא</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError('') }}
                  placeholder="הזן סיסמא שוב..."
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#0d1117', borderRadius: 8, padding: '9px 12px', color: '#e6edf3',
                    fontSize: 14, outline: 'none', fontFamily: 'inherit',
                    border: `1px solid ${confirm && confirm !== password ? '#ef4444' : '#30363d'}`
                  }}
                />
                {confirm && confirm !== password && (
                  <span style={{ fontSize: 12, color: '#ef4444' }}>הסיסמאות אינן תואמות</span>
                )}
              </div>

              {error && (
                <div style={{ background: '#ef444411', border: '1px solid #ef444433', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13, textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <button type="submit"
                disabled={loading || !allOk || password !== confirm}
                style={{
                  background: loading || !allOk || password !== confirm ? '#30363d' : '#3b6ff5',
                  color: '#fff', border: 'none', borderRadius: 8, padding: '12px',
                  fontSize: 15, fontWeight: 700, cursor: loading || !allOk || password !== confirm ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', transition: 'background 0.2s'
                }}>
                {loading ? 'מעדכן...' : 'עדכן סיסמא'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
