import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useClient } from '../../contexts/ClientContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const { clients, currentClient } = useClient()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // No clients at all (freshly registered user) → onboarding to create organization
  if (
    clients.length === 0 &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />
  }

  // Multiple clients, no saved selection (first login or cleared storage)
  // → workspace selector so user explicitly picks a client
  if (
    clients.length > 1 &&
    !localStorage.getItem('current_client_id') &&
    location.pathname !== '/workspace'
  ) {
    return <Navigate to="/workspace" replace />
  }

  // Client exists but onboarding not completed → redirect to onboarding
  if (
    currentClient &&
    currentClient.onboarding_completed === false &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
