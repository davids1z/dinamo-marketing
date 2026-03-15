import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useClient } from '../../contexts/ClientContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth()
  const { clients, currentClient } = useClient()
  const location = useLocation()

  const isSuperadmin = user?.is_superadmin ?? false

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

  // Superadmin must NEVER be on onboarding — they're visitors, not owners.
  // If they ended up here (cached redirect, direct URL, stale JS), bounce to dashboard.
  if (isSuperadmin && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />
  }

  // No clients at all (freshly registered user) → onboarding to create organization
  // Superadmin always has clients (sees all), so this only hits regular users
  if (
    clients.length === 0 &&
    !isSuperadmin &&
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
  // Superadmin bypasses: they are visitors, not forced to set up someone else's org
  if (
    currentClient &&
    currentClient.onboarding_completed === false &&
    !isSuperadmin &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
