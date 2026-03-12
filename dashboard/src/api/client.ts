import axios from 'axios'
import { API_BASE } from '../utils/constants'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT token and client ID to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const clientId = localStorage.getItem('current_client_id')
  if (clientId) {
    config.headers['X-Client-ID'] = clientId
  }
  const projectId = localStorage.getItem('current_project_id')
  if (projectId) {
    config.headers['X-Project-ID'] = projectId
  }
  return config
})

const PUBLIC_PATHS = ['/login', '/register', '/invite']

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      if (!PUBLIC_PATHS.includes(window.location.pathname)) {
        window.location.href = '/login'
      }
    }
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default api
