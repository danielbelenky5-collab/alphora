import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useApp } from '../../contexts/AppContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const { lang } = useApp()
  const navigate = useNavigate()
  const isHe = lang === 'he'

  if (loading) return null

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-bg, #0d1117)', fontFamily: 'Heebo, Inter, sans-serif', padding: 24
      }}>
        <div style={{
          background: 'var(--color-surface-alt, #161b22)',
          border: '1px solid var(--color-surface-border, #30363d)',
          borderRadius: 16, padding: '48px 40px', maxWidth: 400, width: '100%',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: 'var(--color-tx-primary, #e6edf3)', fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>
            {isHe ? 'נדרשת התחברות' : 'Login Required'}
          </h2>
          <p style={{ color: 'var(--color-tx-muted, #8b949e)', fontSize: 14, margin: '0 0 32px', lineHeight: 1.6 }}>
            {isHe
              ? 'עליך להתחבר לחשבון כדי לגשת לדף זה.'
              : 'You need to be logged in to access this page.'}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              background: '#3b6ff5', color: '#fff', border: 'none', borderRadius: 8,
              padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            {isHe ? 'עבור להתחברות ←' : 'Go to Login →'}
          </button>
        </div>
      </div>
    )
  }

  return children
}
