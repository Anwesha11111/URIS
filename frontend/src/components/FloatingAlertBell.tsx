/**
 * FloatingAlertBell — reads from the shared alertStore (no local fetch/poll).
 * Rings + swing when unread > 0. Calm when all clear.
 * Interns only — returns null for admins.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing, Bell } from 'lucide-react'
import { useAuthStore, selectIsAdmin } from '../store/authStore'
import { useAlertStore } from '../store/alertStore'

export default function FloatingAlertBell() {
  const navigate = useNavigate()
  const isAdmin  = useAuthStore(selectIsAdmin)
  const { unread, hasCrit } = useAlertStore()
  const [showTip, setShowTip] = useState(false)

  // Show for both interns and admins
  const hasAlerts   = unread > 0
  const ringColor   = hasCrit ? '#f87171' : '#c9a84c'
  const glowColor   = hasCrit ? 'rgba(248,113,113,0.4)' : 'rgba(201,168,76,0.4)'
  const bgColor     = hasAlerts ? (hasCrit ? 'rgba(248,113,113,0.12)' : 'rgba(201,168,76,0.1)') : 'rgba(255,255,255,0.03)'
  const borderColor = hasAlerts ? (hasCrit ? 'rgba(248,113,113,0.4)' : 'rgba(201,168,76,0.3)') : 'rgba(255,255,255,0.07)'
  const boxShadow   = hasAlerts ? `0 0 20px ${glowColor}, 0 6px 24px rgba(0,0,0,0.5)` : '0 2px 12px rgba(0,0,0,0.3)'

  return (
    <div className="fixed bottom-6 right-6 z-[500] flex flex-col items-end gap-1.5" style={{ pointerEvents: 'auto' }}>

      {/* Tooltip */}
      <AnimatePresence>
        {(hasAlerts || showTip) && (
          <motion.div key="tip"
            initial={{ opacity: 0, y: 4, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1   }}
            exit={{   opacity: 0, y: 4, scale: 0.92 }}
            transition={{ duration: 0.15 }}
            className="px-2.5 py-1 rounded-sm whitespace-nowrap"
            style={{ background: 'rgba(7,8,15,0.94)', border: `1px solid ${hasAlerts ? borderColor : 'rgba(255,255,255,0.07)'}`, backdropFilter: 'blur(14px)' }}>
            <p className="nav-label text-[0.5rem]" style={{ color: hasAlerts ? ringColor : 'rgba(184,212,240,0.3)' }}>
              {hasAlerts ? `${unread} UNREAD SIGNAL${unread > 1 ? 'S' : ''}` : 'NO ACTIVE SIGNALS'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bell */}
      <div className="relative">
        {/* Radar rings — only when unread > 0 */}
        <AnimatePresence>
          {hasAlerts && [0, 0.6, 1.2].map(delay => (
            <motion.span key={delay}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ border: `1.5px solid ${ringColor}` }}
              initial={{ opacity: 0.75, scale: 1 }}
              animate={{ opacity: 0,    scale: 2.9 }}
              exit={{   opacity: 0 }}
              transition={{ duration: 2.4, delay, repeat: Infinity, ease: 'easeOut' }} />
          ))}
        </AnimatePresence>

        <motion.button
          onClick={() => navigate(isAdmin ? '/alerts' : '/notifications')}
          onMouseEnter={() => !hasAlerts && setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
          className="relative flex items-center justify-center w-10 h-10 rounded-full"
          style={{ background: bgColor, border: `1.5px solid ${borderColor}`, boxShadow, backdropFilter: 'blur(12px)' }}
          animate={hasAlerts ? { rotate: [0, 13, -13, 9, -9, 5, -5, 0] } : { rotate: 0 }}
          transition={hasAlerts ? { duration: 1.1, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' } : { duration: 0.3 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          aria-label={hasAlerts ? `${unread} unread notifications` : 'No notifications'}
        >
          {hasAlerts
            ? <BellRing size={16} style={{ color: ringColor }} />
            : <Bell     size={16} style={{ color: 'rgba(184,212,240,0.2)' }} />}
        </motion.button>

        {/* Badge */}
        <AnimatePresence>
          {hasAlerts && (
            <motion.span key={unread}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              exit={{   scale: 0.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full flex items-center justify-center font-black text-[0.46rem] z-10"
              style={{ background: hasCrit ? '#f87171' : '#c9a84c', color: hasCrit ? '#fff' : '#0d0f1c', boxShadow: `0 0 8px ${glowColor}`, border: '1.5px solid rgba(7,8,15,0.9)' }}>
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
