/**
 * Team service — fetch team memberships and team-specific contribution stats.
 */
import api from './api'
import type { TeamMembership } from '../store/teamStore'

export interface TeamContribution {
  tasksCompleted: number
  tasksActive:    number
  latestScore:    number | null
}

export interface TeamDetail {
  id:          string
  name:        string
  description: string | null
  status:      string
  createdAt:   string
  _count?:     { members: number }
  members:     Array<{
    id:       string
    userId:   string
    role:     string
    joinedAt: string
    leftAt:   string | null
    user:     { id: string; email: string; role: string; name?: string }
  }>
}

export interface CreateTeamPayload {
  name: string
  description?: string
}

export interface UpdateTeamPayload {
  name?: string
  description?: string
  status?: string
}

/** Fetch all teams the current user actively belongs to. */
export async function getMyTeams(): Promise<TeamMembership[]> {
  const res = await api.get<{
    success: boolean
    data: Array<{
      id:       string
      teamId:   string
      role:     string
      joinedAt: string
      team:     { id: string; name: string }
    }>
  }>('/teams/my')

  return res.data.data.map(m => ({
    id:       m.id,
    teamId:   m.teamId,
    teamName: m.team.name,
    role:     m.role,
    joinedAt: m.joinedAt,
  }))
}

/** Fetch all available teams (for admin or join flow). */
export async function listAllTeams(includeArchived = false) {
  const url = includeArchived ? '/teams?status=ALL' : '/teams'
  const res = await api.get<{ success: boolean; data: TeamDetail[] }>(url)
  return res.data.data
}

/** Fetch team-specific contribution stats for the current user. */
export async function getTeamContribution(teamId: string): Promise<TeamContribution> {
  const res = await api.get<{ success: boolean; data: TeamContribution }>(
    `/teams/${teamId}/contribution`
  )
  return res.data.data
}

/** Join a team. */
export async function joinTeam(teamId: string): Promise<void> {
  await api.post(`/teams/${teamId}/join`)
}

/** Leave a team. */
export async function leaveTeam(teamId: string): Promise<void> {
  await api.post(`/teams/${teamId}/leave`)
}

// ── Admin Functions ──────────────────────────────────────────────────────────

export async function createTeam(payload: CreateTeamPayload): Promise<TeamDetail> {
  const res = await api.post<{ success: boolean; data: TeamDetail }>('/teams', payload)
  return res.data.data
}

export async function updateTeam(teamId: string, payload: UpdateTeamPayload): Promise<TeamDetail> {
  const res = await api.patch<{ success: boolean; data: TeamDetail }>(`/teams/${teamId}`, payload)
  return res.data.data
}

export async function archiveTeam(teamId: string): Promise<void> {
  await api.post(`/teams/${teamId}/archive`)
}

export async function restoreTeam(teamId: string): Promise<void> {
  await api.post(`/teams/${teamId}/restore`)
}

export async function adminAddMember(teamId: string, userId: string, role: 'MEMBER' | 'LEAD'): Promise<void> {
  await api.post(`/teams/${teamId}/members`, { userId, role })
}

export async function adminRemoveMember(teamId: string, userId: string): Promise<void> {
  await api.delete(`/teams/${teamId}/members/${userId}`)
}
