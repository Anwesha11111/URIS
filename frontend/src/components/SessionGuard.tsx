/**
 * SessionGuard
 *
 * Mounts the inactivity timeout logic and renders the "session expiring soon"
 * warning modal. Place this once inside the authenticated layout — it is a
 * no-op when the user is not logged in.
 *
 * Warning modal behaviour:
 *  • Appears 2 minutes before auto-logout
 *  • Shows a live countdown
 *  • "Stay logged in" resets the inactivity timer and closes the modal
 *  • Letting the countdown reach 0 calls logout() and redirects to /login
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ShieldAlert } from 'lucide-react'
import { useAuthStore, selectIsAuthenticated } from '../store/authStore'
import { useSessionTimeout } from '../hooks/useSessionTimeout'
import { recordActivity } from '../services/activity.service'

// ── Constants ─────────────────────────────────────────────────────────────────

/** Must match WARNING_BEFORE_MS in useSessionTimeout (seconds). */
const WARNING_DURATION_S = 2 * 60   // 2 minutes

// ── Component ─────────────────────────────────────────────────────────────────

export default function SessionGuard() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const logout          = useAuthStore(s => s.logout)
  const navigate        = useNavigate()

  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown]     = useState(WARNING_DURATION_S)
  const countdownRef                  = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Countdown ticker ───────────────────────────────────────────────────────

  const startCountdown = useCallback((): void => {
    setCountdown(WARNING_DURATION_S)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1_000)
  }, [])

  const stopCountdown = useCallback((): void => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    setCountdown(WARNING_DURATION_S)
  }, [])

  // ── Session timeout callbacks ──────────────────────────────────────────────

  const handleWarn = useCallback((): void => {
    setShowWarning(true)
    startCountdown()
  }, [startCountdown])

  const handleWarnDismiss = useCallback((): void => {
    setShowWarning(false)
    stopCountdown()
    // Record the idle period — WARNING_DURATION_S minus remaining countdown
    const idleSeconds = WARNING_DURATION_S
    void recordActivity('IDLE', idleSeconds).catch(() => { /* non-fatal */ })
  }, [stopCountdown])

  const handleExpire = useCallback((): void => {
    setShowWarning(false)
    stopCountdown()
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate, stopCountdown])

  // ── Mount the timeout hook ─────────────────────────────────────────────────

  useSessionTimeout({
    onWarn:        handleWarn,
    onWarnDismiss: handleWarnDismiss,
    onExpire:      handleExpire,
  })

  // ── "Stay logged in" handler ───────────────────────────────────────────────

  const handleStayLoggedIn = useCallback((): void => {
    // Dismiss the modal — the activity event from clicking the button will
    // automatically reset the inactivity timer via the hook's event listeners.
    setShowWarning(false)
    stopCountdown()
  }, [stopCountdown])

  // ── Logout now handler ─────────────────────────────────────────────────────

  const handleLogoutNow = useCallback((): void => {
    setShowWarning(false)
    stopCountdown()
    logout()
    navigate('/login', { replace: true })
  }, [logout, navigate, stopCountdown])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => () => stopCountdown(), [stopCountdown])

  // Don't render anything if not authenticated
  if (!isAuthenticated) return null

  // ── Format countdown ───────────────────────────────────────────────────────

  const mins = Math.floor(countdown / 60)
  const secs = countdown % 60
  const countdownLabel = `${mins}:${String(secs).padStart(2, '0')}`
  const urgency = countdown <= 30   // last 30 seconds — turn red

  return (
    <AnimatePresence>
      {showWarning && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
            style={{ background: 'rgba(7,8,15,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={handleStayLoggedIn}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.92, y: 24  }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-[101] flex items-center justify-center px-4 pointer-events-none"
          >
            <div
              className="glass-card rounded-sm p-8 w-full max-w-sm pointer-events-auto"
              style={{ border: `1px solid ${urgency ? 'rgba(248,113,113,0.35)' : 'rgba(201,168,76,0.25)'}` }}
            >
              {/* Icon */}
              <div className="flex justify-center mb-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    background: urgency ? 'rgba(248,113,113,0.1)' : 'rgba(201,168,76,0.1)',
                    border:     urgency ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(201,168,76,0.25)',
                  }}>
                  {urgency
                    ? <ShieldAlert size={24} style={{ color: '#f87171' }} />
                    : <Clock      size={24} style={{ color: '#c9a84c' }} />}
                </div>
              </div>

              {/* Heading */}
              <h2 className="font-display font-black text-xl text-frost text-center mb-1">
                Session Expiring
              </h2>
              <p className="font-body text-sm text-ice/40 text-center mb-6">
                You've been inactive. Your session will end in:
              </p>

              {/* Countdown */}
              <div className="flex justify-center mb-6">
                <motion.span
                  key={countdown}
                  initial={{ scale: 1.15, opacity: 0.6 }}
                  animate={{ scale: 1,    opacity: 1   }}
                  className="font-display font-black text-5xl tabular-nums"
                  style={{ color: urgency ? '#f87171' : '#c9a84c' }}
                >
                  {countdownLabel}
                </motion.span>
              </div>

              {/* Progress bar */}
              <div className="progress-bar mb-6">
                <motion.div
                  animate={{ width: `${(countdown / WARNING_DURATION_S) * 100}%` }}
                  transition={{ duration: 0.9, ease: 'linear' }}
                  style={{
                    height:     '100%',
                    borderRadius: 2,
                    background: urgency
                      ? 'linear-gradient(90deg, #f8717155, #f87171)'
                      : 'linear-gradient(90deg, #c9a84c55, #c9a84c)',
                  }}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStayLoggedIn}
                  className="btn-gold flex-1 py-3 rounded-sm text-sm"
                >
                  STAY LOGGED IN
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogoutNow}
                  className="btn-outline px-5 rounded-sm text-sm"
                  style={{ color: 'rgba(248,113,113,0.7)', borderColor: 'rgba(248,113,113,0.2)' }}
                >
                  LOG OUT
                </motion.button>
              </div>

              <p className="nav-label text-[0.5rem] text-ice/20 text-center mt-4">
                Any activity will keep your session active.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
