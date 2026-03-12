import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import api from '../api/client'
import type { ClientMembership } from './ClientContext'

interface AuthUser {
  id: string
  email: string
  full_name: string
  role: string
  is_superadmin: boolean
  clients: ClientMembership[]
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  canApprove: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isAdmin: false,
  canApprove: false,
  login: async () => {},
  logout: () => {},
  loading: true,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => setUser(res.data))
        .catch(() => {
          setToken(null)
          localStorage.removeItem('auth_token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const { access_token, user: userData } = res.data
    setToken(access_token)
    setUser(userData)
    localStorage.setItem('auth_token', access_token)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('current_client_id')
    localStorage.removeItem('current_project_id')
  }, [])

  return (
    <AuthContext.Provider value={{
      user, token,
      isAuthenticated: !!token && !!user,
      isAdmin: user?.is_superadmin ?? false,
      canApprove: user?.is_superadmin || user?.role === 'admin' || user?.role === 'editor',
      login, logout, loading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
