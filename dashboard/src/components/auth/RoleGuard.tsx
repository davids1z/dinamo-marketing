import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useClient } from '../../contexts/ClientContext'

type NavRole = 'viewer' | 'moderator' | 'admin' | 'superadmin'

const ROLE_LEVEL: Record<NavRole, number> = {
  viewer: 0,
  moderator: 1,
  admin: 2,
  superadmin: 3,
}

function hasAccess(userRole: NavRole | null, required: NavRole): boolean {
  if (!userRole) return false
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[required]
}

interface RoleGuardProps {
  requiredRole: NavRole
  children: React.ReactNode
}

export default function RoleGuard({ requiredRole, children }: RoleGuardProps) {
  const { user } = useAuth()
  const { clientRole } = useClient()

  const effectiveRole: NavRole = user?.is_superadmin
    ? 'superadmin'
    : (clientRole as NavRole) || 'viewer'

  if (!hasAccess(effectiveRole, requiredRole)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
