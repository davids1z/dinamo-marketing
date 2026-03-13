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
  // Impersonation
  impersonating: boolean
  impersonate: (token: string, user: AuthUser) => void
  stopImpersonating: () => void
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
  impersonating: false,
  impersonate: () => {},
  stopImpersonating: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'))
  // Only show loading spinner if there's a token to validate;
  // when no token exists, skip the spinner → immediate redirect to /login
  const [loading, setLoading] = useState(() => !!localStorage.getItem('auth_token'))

  // Impersonation state
  const [impersonating, setImpersonating] = useState(() => !!localStorage.getItem('original_token'))

  useEffect(() => {
    if (token) {
      api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => setUser(res.data))
        .catch(() => {
          setToken(null)
          localStorage.removeItem('auth_token')
          // If impersonation token expired, fall back to original
          const originalToken = localStorage.getItem('original_token')
          if (originalToken) {
            localStorage.removeItem('original_token')
            localStorage.removeItem('original_user')
            setImpersonating(false)
            setToken(originalToken)
            localStorage.setItem('auth_token', originalToken)
          }
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
    // Clear any impersonation state on fresh login
    localStorage.removeItem('original_token')
    localStorage.removeItem('original_user')
    setImpersonating(false)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('current_client_id')
    localStorage.removeItem('current_project_id')
    localStorage.removeItem('original_token')
    localStorage.removeItem('original_user')
    setImpersonating(false)
  }, [])

  const impersonate = useCallback((newToken: string, newUser: AuthUser) => {
    // Save original admin token
    const currentToken = localStorage.getItem('auth_token')
    const currentUser = user
    if (currentToken && currentUser) {
      localStorage.setItem('original_token', currentToken)
      localStorage.setItem('original_user', JSON.stringify(currentUser))
    }

    // Switch to impersonated user
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('auth_token', newToken)
    localStorage.removeItem('current_client_id')
    localStorage.removeItem('current_project_id')
    setImpersonating(true)
  }, [user])

  const stopImpersonating = useCallback(() => {
    const originalToken = localStorage.getItem('original_token')
    const originalUserStr = localStorage.getItem('original_user')

    if (originalToken && originalUserStr) {
      const originalUser = JSON.parse(originalUserStr) as AuthUser
      setToken(originalToken)
      setUser(originalUser)
      localStorage.setItem('auth_token', originalToken)
      localStorage.removeItem('original_token')
      localStorage.removeItem('original_user')
      localStorage.removeItem('current_client_id')
      localStorage.removeItem('current_project_id')
      setImpersonating(false)
    }
  }, [])

  return (
    <AuthContext.Provider value={{
      user, token,
      isAuthenticated: !!token && !!user,
      isAdmin: user?.is_superadmin ?? false,
      canApprove: user?.is_superadmin || user?.role === 'admin' || user?.role === 'editor',
      login, logout, loading,
      impersonating, impersonate, stopImpersonating,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
