import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useApp } from '../contexts/AppContext'

function fmtDate(unix) {
  if (!unix) return '—'
  return new Date(unix * 1000).toLocaleString('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminPage() {
  const { user, logout } = useAuth()
  const { theme, lang }  = useApp()
  const isDark = theme === 'dark'
  const isHe   = lang === 'he'

  const [users,   setUsers]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [deleting, setDeleting] = useState(null)

  // Redirect non-admins
  if (!user)          return <Navigate to="/" replace />
  if (!user.isAdmin)  return <Navigate to="/" replace />

  const token = localStorage.getItem('alphora_token')

  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get('/api/auth/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(res.data.users)
      setTotal(res.data.total)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleDelete = async (id, username) => {
    if (!confirm(isHe ? `למחוק את "${username}"?` : `Delete "${username}"?`)) return
    setDeleting(id)
    try {
      await axios.delete(`/api/auth/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(u => u.filter(u => u.id !== id))
      setTotal(t => t - 1)
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting user')
    } finally {
      setDeleting(null)
    }
  }

  const bg      = isDark ? '#0d1117' : '#f6f8fa'
  const card    = isDark ? '#161b22' : '#ffffff'
  const border  = isDark ? '#30363d' : '#d0d7de'
  const txPri   = isDark ? '#e6edf3' : '#1f2328'
  const txMuted = isDark ? '#8b949e' : '#656d76'
  const brand   = '#3b6ff5'

  return (
    <div style={{ minHeight: '100vh', background: bg, color: txPri, fontFamily: 'Inter, Heebo, sans-serif' }}
      dir={isHe ? 'rtl' : 'ltr'}>

      {/* Header bar */}
      <div style={{ background: card, borderBottom: `1px solid ${border}`, padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: brand, letterSpacing: '-0.5px' }}>ALPHORA</span>
          <span style={{ fontSize: 11, fontWeight: 700, background: brand + '22', color: brand, border: `1px solid ${brand}44`, borderRadius: 6, padding: '2px 8px', letterSpacing: '0.08em' }}>
            ADMIN
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: txMuted, fontFamily: 'Heebo, sans-serif' }}>
            {isHe ? `מחובר כ: ` : 'Logged in as: '}<strong style={{ color: txPri }}>{user.username}</strong>
          </span>
          <button onClick={logout}
            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: `1px solid ${border}`, background: 'transparent', color: txMuted, cursor: 'pointer', fontFamily: 'Heebo, sans-serif' }}>
            {isHe ? 'התנתק' : 'Logout'}
          </button>
          <a href="/" style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: `1px solid ${brand}44`, background: brand + '11', color: brand, textDecoration: 'none', fontFamily: 'Heebo, sans-serif' }}>
            {isHe ? '← חזור לאתר' : '← Back to site'}
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: isHe ? 'סה"כ משתמשים' : 'Total Users', value: total, color: brand },
            { label: isHe ? 'אדמינים'       : 'Admins',      value: users.filter(u => u.is_admin).length, color: '#f59e0b' },
            { label: isHe ? 'משתמשים רגילים' : 'Regular',    value: users.filter(u => !u.is_admin).length, color: '#22c55e' },
          ].map(card => (
            <div key={card.label} style={{ background: isDark ? '#161b22' : '#fff', border: `1px solid ${border}`, borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: card.color, fontFamily: 'Inter, sans-serif', tabularNums: true }}>{loading ? '—' : card.value}</div>
              <div style={{ fontSize: 12, color: txMuted, marginTop: 4, fontFamily: 'Heebo, sans-serif' }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Users table */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ padding: '16px 24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'Heebo, sans-serif' }}>
              {isHe ? 'רשימת משתמשים' : 'Users List'}
            </h2>
            <button onClick={fetchUsers}
              style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: `1px solid ${border}`, background: 'transparent', color: txMuted, cursor: 'pointer' }}>
              {isHe ? 'רענן' : 'Refresh'}
            </button>
          </div>

          {error && (
            <div style={{ padding: '16px 24px', color: '#ef4444', fontSize: 13 }}>{error}</div>
          )}

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: txMuted, fontSize: 14 }}>
              {isHe ? 'טוען...' : 'Loading...'}
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: txMuted, fontSize: 14 }}>
              {isHe ? 'אין משתמשים' : 'No users found'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}`, background: isDark ? '#0d1117' : '#f6f8fa' }}>
                  {['#', isHe ? 'שם משתמש' : 'Username', isHe ? 'תפקיד' : 'Role', isHe ? 'תאריך הצטרפות' : 'Joined', isHe ? 'פעולות' : 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: isHe ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: txMuted, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? `1px solid ${border}` : 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = isDark ? '#0d1117' : '#f6f8fa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: txMuted, fontFamily: 'Inter, sans-serif' }}>{u.id}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: brand + '22', border: `1px solid ${brand}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: brand }}>
                          {u.username[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: txPri, fontFamily: 'Inter, sans-serif' }}>
                          {u.username}
                          {u.id === user?.id && (
                            <span style={{ fontSize: 10, color: txMuted, marginInlineStart: 6, fontWeight: 400 }}>({isHe ? 'אתה' : 'you'})</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: u.is_admin ? '#f59e0b22' : '#22c55e22',
                        color: u.is_admin ? '#f59e0b' : '#22c55e',
                        border: `1px solid ${u.is_admin ? '#f59e0b44' : '#22c55e44'}`,
                        fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em'
                      }}>
                        {u.is_admin ? (isHe ? 'אדמין' : 'ADMIN') : (isHe ? 'משתמש' : 'USER')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: txMuted, fontFamily: 'Inter, sans-serif' }}>
                      {fmtDate(u.created_at)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.id !== user?.id && !u.is_admin && (
                        <button
                          onClick={() => handleDelete(u.id, u.username)}
                          disabled={deleting === u.id}
                          style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #ef444444', background: '#ef444411', color: '#ef4444', cursor: 'pointer', fontFamily: 'Heebo, sans-serif' }}>
                          {deleting === u.id ? '...' : (isHe ? 'מחק' : 'Delete')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', fontSize: 12, color: txMuted, marginTop: 32, fontFamily: 'Heebo, sans-serif' }}>
          {isHe
            ? 'דף זה גלוי רק למשתמש האדמין. המשתמש הראשון שנרשם הוא אדמין אוטומטית.'
            : 'This page is only visible to the admin user. The first registered user is auto-assigned as admin.'}
        </p>
      </div>
    </div>
  )
}
