import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useAuth } from './AuthContext'

export interface ProjectInfo {
  project_id: string
  project_name: string
  project_slug: string
}

export interface ClientMembership {
  client_id: string
  client_name: string
  client_slug: string
  client_logo_url: string
  role: 'viewer' | 'moderator' | 'admin' | 'superadmin'
  onboarding_completed: boolean
  projects: ProjectInfo[]
}

interface ClientContextType {
  clients: ClientMembership[]
  currentClient: ClientMembership | null
  switchClient: (clientId: string) => void
  clientRole: string | null
  isClientAdmin: boolean
  canModerate: boolean
  isViewer: boolean
  recentClientIds: string[]
}

const MAX_RECENT = 5

function getRecentClientIds(): string[] {
  try {
    const raw = localStorage.getItem('recent_client_ids')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecentClientId(clientId: string) {
  const recent = getRecentClientIds().filter(id => id !== clientId)
  recent.unshift(clientId)
  localStorage.setItem('recent_client_ids', JSON.stringify(recent.slice(0, MAX_RECENT)))
}

const ClientContext = createContext<ClientContextType>({
  clients: [],
  currentClient: null,
  switchClient: () => {},
  clientRole: null,
  isClientAdmin: false,
  canModerate: false,
  isViewer: true,
  recentClientIds: [],
})

export function ClientProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [currentClientId, setCurrentClientId] = useState<string | null>(
    () => localStorage.getItem('current_client_id')
  )
  const [recentClientIds, setRecentClientIds] = useState<string[]>(getRecentClientIds)

  const clients = user?.clients || []

  const currentClient = clients.find(c => c.client_id === currentClientId) || clients[0] || null

  // Sync current client with available clients
  useEffect(() => {
    const first = clients[0]
    if (first && !clients.find(c => c.client_id === currentClientId)) {
      // Current client not in list, select first one
      setCurrentClientId(first.client_id)
      localStorage.setItem('current_client_id', first.client_id)
    } else if (currentClient && currentClientId !== currentClient.client_id) {
      setCurrentClientId(currentClient.client_id)
      localStorage.setItem('current_client_id', currentClient.client_id)
    }
  }, [clients, currentClientId, currentClient])

  // Track current client in recent list
  useEffect(() => {
    if (currentClient) {
      saveRecentClientId(currentClient.client_id)
      setRecentClientIds(getRecentClientIds())
    }
  }, [currentClient])

  const switchClient = useCallback((clientId: string) => {
    setCurrentClientId(clientId)
    localStorage.setItem('current_client_id', clientId)
    // Track in recent
    saveRecentClientId(clientId)
    // Reload the page to refresh all data for the new client
    window.location.reload()
  }, [])

  const clientRole = currentClient?.role || null
  const isClientAdmin = clientRole === 'admin' || clientRole === 'superadmin'
  const canModerate = clientRole === 'moderator' || clientRole === 'admin' || clientRole === 'superadmin'
  const isViewer = clientRole === 'viewer'

  return (
    <ClientContext.Provider value={{
      clients, currentClient, switchClient, clientRole, isClientAdmin, canModerate, isViewer,
      recentClientIds,
    }}>
      {children}
    </ClientContext.Provider>
  )
}

export const useClient = () => useContext(ClientContext)
