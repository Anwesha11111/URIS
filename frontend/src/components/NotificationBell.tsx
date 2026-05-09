/**
 * NotificationBell — navbar bell that reads from the shared alertStore.
 * No local fetch, no local poll. One source of truth.
 */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Bell, BellRing, X, CheckCircle2, ChevronRight,
  ClipboardList, Pause, Flag, Star, Clock, AlertTriangle, ShieldAlert,
} from 'lucide-react'
import { useAuthStore, selectIsAdmin } from '../store/authStore'
import { useAlertStore } from '../store/alertStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function alertIcon(type: string) {
  const s = 'flex-shrink-0'
  switch (type) {
    case 'task_assigned':         return <ClipboardList size={12} className={`${s} text-gold`} />
    case 'task_paused':           return <Pause         size={12} className={`${s} text-amber-400`} />
    case 'blocker_reported':      return <Flag          size={12} className={`${s} text-red-400`} />
    case 'review_submitted':      return <Star          size={12} className={`${s} text-green-400`} />
    case 'deadline_approaching':  return <Clock         size={12} className={`${s} text-red-400`} />
    case 'availability_reminder': return <Bell          size={12} className={`${s} text-gold`} />
    case 'stale_task':            return <Clock         size={12} className={`${s} text-amber-400`} />
    case 'overload':              return <ShieldAlert   size={12} className={`${s} text-red-400`} />
    default:                      return <AlertTriangle size={12} className={`${s} text-amber-400`} />
  }
}

function alertColor(type: string, severity: string): string {
  if (severity === 'critical')                                 return '#f87171'
  if (type === 'task_assigned' || type === 'review_submitted') return '#4ade80'
  if (type === 'availability_reminder')                        return '#c9a84c'
  return '#f59e0b'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function RadarRing({ delay, color }: { delay: number; color: string }) {
  return (
    <motion.span
      className="absolute inset-0 rounded-full pointer-events-none"
      style={{ border: `1.5px solid ${color}` }}
      initial={{ opacity: 0.8, scale: 1 }}
      animate={{ opacity: 0,   scale: 2.6 }}
      transition={{ duration: 2, delay, repeat: Infinity, ease: 'easeOut' }}
    />
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const isAdmin  = useAuthStore(selectIsAdmin)
  const navigate = useNavigate()

  // Single source of truth — shared store
  const { alerts, unread, hasCrit, resolve: storeResolve, refresh } = useAlertStore()

  const [open, setOpen] = useState(false)
  const panelRef        = useRef<HTMLDivElement>(null)
  const buttonRef       = useRef<HTMLButtonElement>(null)

  // Refresh when panel opens so it's always fresh
  useEffect(() => { if (open) void refresh() }, [open, refresh])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Dismiss a single alert from the dropdown
  const dismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await storeResolve(id)
  }

  const goToAlerts = () => {
    setOpen(false)
    navigate(isAdmin ? '/alerts' : '/notifications')
  }

  const ringColor = hasCrit ? '#f87171' : '#c9a84c'
  const preview   = alerts.slice(0, 5)

  return (
    <div className="relative">

      {/* Bell button */}
      <motion.button
        ref={buttonRef}
        whileTap={{ scale: 0.88 }}
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full transition-all"
        style={{
          background: open ? 'rgba(201,168,76,0.14)' : unread > 0 ? 'rgba(201,168,76,0.07)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'rgba(201,168,76,0.4)' : unread > 0 ? 'rgba(201,168,76,0.25)' : 'rgba(201,168,76,0.1)'}`,
        }}
        aria-label="Notifications"
      >
        {/* Radar rings */}
        {unread > 0 && !open && (
          <>
            <RadarRing delay={0}   color={ringColor} />
            <RadarRing delay={0.7} color={ringColor} />
            <RadarRing delay={1.4} color={ringColor} />
          </>
        )}

        {unread > 0
          ? <BellRing size={14} className="text-gold relative z-10" />
          : <Bell     size={14} className="text-ice/40 relative z-10" />}

        {/* Badge */}
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key={unread}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              exit={{   scale: 0.5, opacity: 0 }}
              className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center font-bold text-[0.48rem] z-20"
              style={{
                background: hasCrit ? '#f87171' : '#c9a84c',
                color:      hasCrit ? '#fff'    : '#0d0f1c',
                boxShadow:  `0 0 8px ${hasCrit ? '#f8717188' : '#c9a84c88'}`,
              }}
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: -8, scale: 0.96  }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 top-11 w-[320px] z-[300] rounded-sm overflow-hidden"
            style={{
              background:     'rgba(7,8,15,0.98)',
              border:         `1px solid ${hasCrit ? 'rgba(248,113,113,0.25)' : 'rgba(201,168,76,0.2)'}`,
              backdropFilter: 'blur(24px)',
              boxShadow:      '0 20px 60px rgba(0,0,0,0.7)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
              <div className="flex items-center gap-2">
                <div className="relative w-2 h-2">
                  <span className="absolute inset-0 rounded-full" style={{ background: hasCrit ? '#f87171' : '#c9a84c' }} />
                  <motion.span className="absolute inset-0 rounded-full"
                    style={{ background: hasCrit ? '#f87171' : '#c9a84c' }}
                    animate={{ scale: [1, 2.2, 1], opacity: [0.8, 0, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity }} />
                </div>
                <div>
                  <p className="nav-label text-[0.48rem] text-gold/40 leading-none mb-0.5">SIGNAL FEED</p>
                  <h3 className="font-display text-sm text-frost leading-none">
                    {unread > 0 ? `${unread} unread signal${unread > 1 ? 's' : ''}` : 'All clear'}
                  </h3>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-ice/20 hover:text-ice/60 transition-colors">
                <X size={12} />
              </button>
            </div>

            {/* Alert list */}
            <div className="max-h-[300px] overflow-y-auto">
              {preview.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="relative w-8 h-8">
                    <CheckCircle2 size={18} className="text-green-400/40 absolute inset-0 m-auto" />
                    {[0, 0.6].map(d => (
                      <motion.div key={d} className="absolute inset-0 rounded-full"
                        style={{ border: '1px solid rgba(74,222,128,0.3)' }}
                        initial={{ opacity: 0.5, scale: 1 }}
                        animate={{ opacity: 0, scale: 2 }}
                        transition={{ duration: 2, delay: d, repeat: Infinity }} />
                    ))}
                  </div>
                  <p className="font-body text-xs text-ice/25">No active signals</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.03]">
                  {preview.map((alert, i) => {
                    const c = alertColor(alert.type, alert.severity)
                    return (
                      <motion.div key={alert.id}
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-2.5 px-4 py-2.5 group hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={goToAlerts}
                      >
                        <div className="w-0.5 self-stretch rounded-full flex-shrink-0" style={{ background: c, opacity: 0.7 }} />
                        <div className="mt-0.5 flex-shrink-0">{alertIcon(alert.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-[0.72rem] leading-snug line-clamp-2" style={{ color: `${c}cc` }}>
                            {alert.message}
                          </p>
                          <p className="nav-label text-[0.46rem] text-ice/20 mt-0.5">{timeAgo(alert.createdAt)}</p>
                        </div>
                        <button
                          onClick={e => dismiss(e, alert.id)}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-ice/20 hover:text-ice/60 transition-all mt-0.5"
                          aria-label="Dismiss"
                        >
                          <X size={10} />
                        </button>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <motion.button
              whileHover={{ background: 'rgba(201,168,76,0.06)' }}
              onClick={goToAlerts}
              className="w-full flex items-center justify-between px-4 py-2.5 transition-colors"
              style={{ borderTop: '1px solid rgba(201,168,76,0.08)' }}
            >
              <span className="nav-label text-[0.55rem] text-gold/50">VIEW ALL NOTIFICATIONS</span>
              <ChevronRight size={11} className="text-gold/40" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
