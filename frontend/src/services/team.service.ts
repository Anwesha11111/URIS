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
  createdAt:   string
  members:     Array<{
    id:       string
    userId:   string
    role:     string
    joinedAt: string
    user:     { id: string; email: string; role: string }
  }>
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
export async function listAllTeams() {
  const res = await api.get<{ success: boolean; data: TeamDetail[] }>('/teams')
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
