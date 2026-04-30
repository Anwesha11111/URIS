/**
 * Auth store — single source of truth for authentication state.
 *
 * Uses zustand/middleware `persist` so the session survives page refreshes
 * without any manual localStorage reads in components or interceptors.
 *
 * Public API
 * ──────────
 *  State:   token, user, isAuthenticated
 *  Actions: login(token, user)  — replaces setAuth
 *           logout()            — replaces clearAuth
 *           setUser(user)       — patch user fields without re-login
 *  Helpers: isAdmin()           — true when role is 'admin'
 *
 * Backward-compat aliases (kept so existing call-sites don't break):
 *   setAuth  → login
 *   clearAuth → logout
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = 'intern' | 'admin'

export interface AuthUser {
  id:    string
  name:  string
  email: string
  role:  UserRole
}

interface AuthState {
  // ── State ──────────────────────────────────────────────────────────────────
  token:           string | null
  user:            AuthUser | null
  isAuthenticated: boolean

  // ── Primary actions ────────────────────────────────────────────────────────
  /** Called after a successful login or register API response. */
  login:   (token: string, user: AuthUser) => void
  /** Clears all auth state and removes the persisted session. */
  logout:  () => void
  /** Patch user fields (e.g. after a profile update) without re-login. */
  setUser: (user: AuthUser) => void

  // ── Derived helper ─────────────────────────────────────────────────────────
  isAdmin: () => boolean

  // ── Backward-compat aliases ────────────────────────────────────────────────
  /** @deprecated Use login() */
  setAuth:   (token: string, user: AuthUser) => void
  /** @deprecated Use logout() */
  clearAuth: () => void
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ── Initial state ───────────────────────────────────────────────────────
      token:           null,
      user:            null,
      isAuthenticated: false,

      // ── Actions ─────────────────────────────────────────────────────────────
      login: (token, user) => {
        set({ token, user, isAuthenticated: true })
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false })
        // Clear team context on logout — dynamic import avoids circular deps
        import('../store/teamStore')
          .then(({ useTeamStore }) => useTeamStore.getState().clearTeams())
          .catch(() => { /* non-fatal */ })
      },

      setUser: (user) => {
        set({ user })
      },

      // ── Derived ─────────────────────────────────────────────────────────────
      isAdmin: () => {
        const role = get().user?.role
        return role === 'admin'
      },

      // ── Aliases ─────────────────────────────────────────────────────────────
      setAuth:   (token, user) => get().login(token, user),
      clearAuth: ()            => get().logout(),
    }),
    {
      name:    'uris_auth',          // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist the data fields — actions are recreated on hydration
      partialize: (state) => ({
        token:           state.token,
        user:            state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Rehydrate isAuthenticated from the persisted token
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.token
        }
      },
    }
  )
)

// ── Typed selectors (use these in components for minimal re-renders) ──────────

/** Returns the raw JWT string, or null if not authenticated. */
export const selectToken           = (s: AuthState): string | null  => s.token
/** Returns the full user object, or null. */
export const selectUser            = (s: AuthState): AuthUser | null => s.user
/** Returns true when a valid session exists. */
export const selectIsAuthenticated = (s: AuthState): boolean        => s.isAuthenticated
/** Returns true when the user has admin role. */
export const selectIsAdmin         = (s: AuthState): boolean        => s.isAdmin()
