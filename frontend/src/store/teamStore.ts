/**
 * teamStore — persisted Zustand store for multi-team context.
 *
 * Tracks which team the user is currently "viewing" (active context).
 * Switching teams does not affect global performance data — it only
 * changes which team-specific contribution stats are shown.
 *
 * Persisted to localStorage so the active team survives page refreshes.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface TeamMembership {
  id:       string   // UserTeam.id
  teamId:   string
  teamName: string
  role:     string   // 'member' | 'lead'
  joinedAt: string
}

interface TeamState {
  /** All teams the user currently belongs to. */
  teams:      TeamMembership[]
  /** The team currently selected for context display. null = global view. */
  activeTeam: TeamMembership | null

  setTeams:      (teams: TeamMembership[]) => void
  setActiveTeam: (team: TeamMembership | null) => void
  clearTeams:    () => void
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set) => ({
      teams:      [],
      activeTeam: null,

      setTeams: (teams) => set({ teams }),

      setActiveTeam: (team) => set({ activeTeam: team }),

      clearTeams: () => set({ teams: [], activeTeam: null }),
    }),
    {
      name:    'uris_team',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        teams:      state.teams,
        activeTeam: state.activeTeam,
      }),
    }
  )
)

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectTeams      = (s: TeamState): TeamMembership[]       => s.teams
export const selectActiveTeam = (s: TeamState): TeamMembership | null  => s.activeTeam
