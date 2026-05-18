import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

const TOKEN_KEY = 'alphora_token'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)   // { username } or null
  const [loading, setLoading] = useState(true)   // true while verifying saved token

  // ── Verify saved token on mount ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) { setLoading(false); return }

    axios.get('/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setUser({ username: res.data.username, isAdmin: !!res.data.is_admin }))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  // ── Register ─────────────────────────────────────────────────────────────
  const register = useCallback(async (username, password, email) => {
    const res = await axios.post('/api/auth/register', { username, password, email })
    localStorage.setItem(TOKEN_KEY, res.data.token)
    setUser({ username: res.data.username, isAdmin: !!res.data.is_admin })
    return res.data
  }, [])

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    const res = await axios.post('/api/auth/login', { username, password })
    localStorage.setItem(TOKEN_KEY, res.data.token)
    setUser({ username: res.data.username, isAdmin: !!res.data.is_admin })
    return res.data
  }, [])

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  // ── Forgot password ───────────────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    const res = await axios.post('/api/auth/forgot-password', { email })
    return res.data
  }, [])

  // ── Reset password ────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (token, password) => {
    const res = await axios.post('/api/auth/reset-password', { token, password })
    return res.data
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, forgotPassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
