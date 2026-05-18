import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token    = params.get('token')

  const [status,   setStatus]   = useState('loading')  // loading | success | error
  const [username, setUsername] = useState('')
  const [message,  setMessage]  = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('קישור לא תקין')
      return
    }

    axios.get(`/api/auth/verify-email/${token}`)
      .then(res => {
        setUsername(res.data.username)
        setStatus('success')
      })
      .catch(err => {
        setStatus('error')
        setMessage(err.response?.data?.error || 'הקישור לא תקין או שפג תוקפו')
      })
  }, [token])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0d1117', fontFamily: 'Heebo, Inter, sans-serif', padding: 24
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d', borderRadius: 16,
        padding: '48px 40px', maxWidth: 440, width: '100%', textAlign: 'center'
      }}>
        {/* Logo */}
        <div style={{ fontSize: 24, fontWeight: 900, color: '#3b6ff5', letterSpacing: '-1px', marginBottom: 32 }}>
          ALPHORA
        </div>

        {status === 'loading' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <p style={{ color: '#8b949e', fontSize: 15 }}>מאמת את המייל שלך...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h1 style={{ color: '#e6edf3', fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>
              המייל אומת בהצלחה!
            </h1>
            <p style={{ color: '#8b949e', fontSize: 14, lineHeight: 1.6, margin: '0 0 32px' }}>
              שלום <strong style={{ color: '#e6edf3' }}>{username}</strong> — הכתובת שלך מאומתת.<br />
              המייל ישמש לשחזור סיסמא בעתיד.
            </p>
            <Link to="/" style={{
              display: 'inline-block', background: '#3b6ff5', color: '#fff',
              textDecoration: 'none', padding: '12px 32px', borderRadius: 8,
              fontWeight: 700, fontSize: 15
            }}>
              חזור לאתר ←
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
            <h1 style={{ color: '#e6edf3', fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>
              האימות נכשל
            </h1>
            <p style={{ color: '#8b949e', fontSize: 14, lineHeight: 1.6, margin: '0 0 32px' }}>
              {message}
            </p>
            <Link to="/" style={{
              display: 'inline-block', background: '#30363d', color: '#e6edf3',
              textDecoration: 'none', padding: '12px 32px', borderRadius: 8,
              fontWeight: 700, fontSize: 15
            }}>
              חזור לדף הבית
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
