import api from './client'

export interface TeamMember {
  user_id: string
  email: string
  full_name: string
  role: 'viewer' | 'moderator' | 'admin'
  is_active: boolean
}

export interface InviteResponse {
  invite_url: string
  email: string
  role: string
  expires_in_hours: number
}

export const teamApi = {
  /** List all members of the current client */
  getMembers: (clientId: string) =>
    api.get<TeamMember[]>(`/clients/${clientId}/members`),

  /** Invite a new member by email with a role */
  inviteMember: (clientId: string, email: string, role: string) =>
    api.post<InviteResponse>(`/clients/${clientId}/members/invite`, { email, role }),

  /** Update a member's role */
  updateMemberRole: (clientId: string, userId: string, role: string) =>
    api.put(`/clients/${clientId}/members/${userId}`, { role }),

  /** Remove a member from the client */
  removeMember: (clientId: string, userId: string) =>
    api.delete(`/clients/${clientId}/members/${userId}`),
}
