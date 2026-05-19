/**
 * useLogout — canonical logout hook for Phase 4.
 *
 * Single source of truth for all logout flows in the app.
 * Replaces the ad-hoc `logout(); nav('/login')` pattern scattered across
 * Navbar, Sidebar, and SessionGuard.
 *
 * What it does (in order):
 *   1. Calls POST /auth/logout to write the server-side audit log entry.
 *      Fire-and-forget — a network failure must never block the client logout.
 *   2. Stops the alert polling interval (prevents stale 401 loops).
 *   3. Clears auth state (token, user, isAuthenticated) via authStore.logout().
 *      This also clears the persisted localStorage entry and team state.
 *   4. Closes the mobile sidebar drawer if open.
 *   5. Navigates to the landing page "/" (not /login) for user-initiated logouts,
 *      or to "/login" for session-expiry logouts.
 *
 * Usage:
 *   const logout = useLogout()
 *   <button onClick={() => logout()}>Sign Out</button>
 *   <button onClick={() => logout({ reason: 'inactivity_timeout', redirectTo: '/login' })}>...</button>
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useAlertStore } from '../store/alertStore'
import { useMobileNavStore } from '../store/mobileNavStore'
import api from '../services/api'

interface LogoutOptions {
  /**
   * Where to redirect after logout.
   * Defaults to '/' (landing page) for user-initiated logouts.
   * Use '/login' for session-expiry or forced logouts.
   */
  redirectTo?: string
  /**
   * Reason string passed as route state — can be read by the landing/login
   * page to show a contextual message (e.g. "Your session expired").
   */
  reason?: string
}

export function useLogout() {
  const authLogout      = useAuthStore(s => s.logout)
  const stopPolling     = useAlertStore(s => s.stopPolling)
  const closeMobileNav  = useMobileNavStore(s => s.close)
  const navigate        = useNavigate()

  const logout = useCallback((options: LogoutOptions = {}): void => {
    const { redirectTo = '/', reason = 'user_initiated' } = options

    // 1. Fire-and-forget server-side audit log.
    //    Must happen BEFORE clearing the token (the request needs the JWT).
    //    We intentionally do not await — a network failure must never block logout.
    void api.post('/auth/logout').catch(() => { /* non-fatal */ })

    // 2. Stop alert polling immediately — prevents stale 401 loops after logout.
    stopPolling()

    // 3. Clear all auth state (token, user, isAuthenticated, team state).
    //    The persist middleware removes the localStorage entry synchronously.
    authLogout()

    // 4. Close mobile sidebar drawer if open.
    closeMobileNav()

    // 5. Navigate to the target page.
    //    Use replace:true so the back button doesn't return to a protected page.
    navigate(redirectTo, { replace: true, state: { reason } })
  }, [authLogout, stopPolling, closeMobileNav, navigate])

  return logout
}
