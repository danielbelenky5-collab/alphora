import axios from 'axios'

// In production (Render), VITE_API_URL is the API service host (e.g. alphora-api.onrender.com)
// In development, use relative /api (proxied by Vite)
const apiBase = 'https://alphora-api-4o2q.onrender.com/api'

const client = axios.create({
  baseURL: apiBase,
  timeout: 15000,
})

client.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.error || err.message || 'Network error'
    return Promise.reject(new Error(msg))
  }
)

export default client
