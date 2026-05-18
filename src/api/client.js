import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

client.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.error || err.message || 'Network error'
    return Promise.reject(new Error(msg))
  }
)

export default client
