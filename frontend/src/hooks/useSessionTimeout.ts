/**
 * useSessionTimeout
 *
 * Tracks user inactivity and triggers a warning before automatically
 * logging out. Integrates with the Zustand auth store.
 *
 * Timeline (defaults):
 *   0 ─────────────────────── 28 min ──── 30 min
 *   │  user active, timer resets          │
 *   │                          │          └─ auto logout
 *   │                          └─ warning modal shown
 *
 * Activity events that reset the timer:
 *   mousemove, mousedown, keydown, touchstart, scroll, click
 *
 * The hook is a no-op when the user is not authenticated — timers are
 * only started when isAuthenticated is true.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore, selectIsAuthenticated } from '../store/authStore'

// ── Constants ─────────────────────────────────────────────────────────────────

/** Total inactivity time before auto-logout (ms). Default: 30 minutes. */
const TIMEOUT_MS = 30 * 60 * 1_000

/** How long before logout to show the warning modal (ms). Default: 2 minutes. */
const WARNING_BEFORE_MS = 2 * 60 * 1_000

/** Throttle activity events to avoid resetting the timer on every pixel. */
const THROTTLE_MS = 1_000

/** DOM events that count as user activity. */
const ACTIVITY_EVENTS: ReadonlyArray<keyof DocumentEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface UseSessionTimeoutOptions {
  /** Override the inactivity timeout in ms. */
  timeoutMs?:       number
  /** Override the warning lead time in ms. */
  warningBeforeMs?: number
  /** Called when the warning window opens. */
  onWarn:           () => void
  /** Called when the warning window closes (user stayed active). */
  onWarnDismiss:    () => void
  /** Called when the session actually expires. */
  onExpire:         () => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSessionTimeout({
  timeoutMs       = TIMEOUT_MS,
  warningBeforeMs = WARNING_BEFORE_MS,
  onWarn,
  onWarnDismiss,
  onExpire,
}: UseSessionTimeoutOptions): void {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  // Use refs for timers so changes don't trigger re-renders
  const logoutTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const isWarningRef    = useRef<boolean>(false)

  const clearTimers = useCallback((): void => {
    if (logoutTimerRef.current)  clearTimeout(logoutTimerRef.current)
    if (warnTimerRef.current)    clearTimeout(warnTimerRef.current)
    logoutTimerRef.current = null
    warnTimerRef.current   = null
  }, [])

  const startTimers = useCallback((): void => {
    clearTimers()

    // Warning fires (timeoutMs - warningBeforeMs) after last activity
    warnTimerRef.current = setTimeout(() => {
      isWarningRef.current = true
      onWarn()
    }, timeoutMs - warningBeforeMs)

    // Logout fires timeoutMs after last activity
    logoutTimerRef.current = setTimeout(() => {
      isWarningRef.current = false
      onExpire()
    }, timeoutMs)
  }, [clearTimers, timeoutMs, warningBeforeMs, onWarn, onExpire])

  // Throttled activity handler — resets timers at most once per THROTTLE_MS
  const handleActivity = useCallback((): void => {
    const now = Date.now()
    if (now - lastActivityRef.current < THROTTLE_MS) return
    lastActivityRef.current = now

    // If warning was showing, dismiss it
    if (isWarningRef.current) {
      isWarningRef.current = false
      onWarnDismiss()
    }

    startTimers()
  }, [startTimers, onWarnDismiss])

  useEffect(() => {
    // Only run when the user is authenticated
    if (!isAuthenticated) {
      clearTimers()
      return
    }

    // Start the initial timers
    startTimers()

    // Attach activity listeners to the document (not window — avoids
    // issues with iframes and avoids re-attaching on every render)
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      clearTimers()
      ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [isAuthenticated, startTimers, clearTimers, handleActivity])
}
