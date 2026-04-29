/**
 * AnomalyAlertPanel
 *
 * Shows an intern's own performance anomaly alerts (low_performance, spike).
 * Uses the exact same glass-card, nav-label, and alert-row pattern as
 * Alerts.tsx — no new colors or styles introduced.
 *
 * Color mapping follows the existing system:
 *   critical → #f87171  (red-400)
 *   warning  → #f59e0b  (amber-500)
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Bell, Check, Loader2 } from 'lucide-react'
import { getMyAnomalyAlerts, type Alert, type AlertSeverity } from '../services/alerts.service'
import { extractErrorMessage } from '../services/error'

// ── Constants — mirrors the existing color system exactly ─────────────────────

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  critical: '#f87171',   // same as Alerts.tsx critical
  warning:  '#f59e0b',   // same as Alerts.tsx warning
  info:     '#b8d4f0',   // same as Alerts.tsx info
}

const TYPE_META = {
  low_performance: { icon: AlertTriangle, label: 'LOW PERFORMANCE' },
  spike:           { icon: Bell,          label: 'SCORE SPIKE'     },
} as const

type AnomalyType = keyof typeof TYPE_META

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso?: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const h    = Math.floor(diff / 3_600_000)
  if (h < 1)  return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AnomalyAlertPanel() {
  const [alerts, setAlerts]   = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [filter, setFilter]   = useState<'all' | 'critical' | 'warning'>('all')

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const data = await getMyAnomalyAlerts()
        setAlerts(data)
      } catch (err) {
        setError(extractErrorMessage(err, 'Could not load performance alerts.'))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const filtered = alerts.filter(a =>
    filter === 'all' ? true : a.severity === filter
  )

  const counts = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning:  alerts.filter(a => a.severity === 'warning').length,
  }

  // Don't render the panel at all if there are no alerts and loading is done
  if (!loading && !error && alerts.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-card rounded-sm mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
        <div>
          <p className="nav-label text-[0.55rem] text-gold/40 mb-0.5">PERFORMANCE SIGNALS</p>
          <h2 className="font-display text-lg text-frost">Anomaly Alerts</h2>
        </div>
        {!loading && alerts.length > 0 && (
          <span className="nav-label text-[0.55rem] px-2 py-0.5 rounded-full text-red-400 bg-red-400/10">
            {alerts.length} ACTIVE
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={18} className="text-gold animate-spin" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-2 py-3">
            <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
            <p className="font-body text-sm text-ice/40">{error}</p>
          </div>
        )}

        {/* Filter pills — same pattern as Alerts.tsx count pills */}
        {!loading && !error && alerts.length > 0 && (
          <>
            <div className="flex gap-2 mb-4">
              {([
                { key: 'all',      label: 'All',      val: alerts.length,    c: '#c9a84c' },
                { key: 'critical', label: 'Critical',  val: counts.critical,  c: '#f87171' },
                { key: 'warning',  label: 'Warning',   val: counts.warning,   c: '#f59e0b' },
              ] as const).map(p => (
                <motion.button key={p.key} whileTap={{ scale: 0.96 }}
                  onClick={() => setFilter(p.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-all duration-200"
                  style={{
                    background: filter === p.key ? `${p.c}15` : 'rgba(13,15,28,0.6)',
                    border: `1px solid ${filter === p.key ? `${p.c}44` : 'rgba(201,168,76,0.1)'}`,
                  }}>
                  <span className="font-display font-black text-sm" style={{ color: p.c }}>{p.val}</span>
                  <span className="nav-label text-[0.5rem] text-ice/40">{p.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Alert rows — identical structure to Alerts.tsx */}
            <div className="space-y-2">
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="py-4 text-center">
                    <Check size={16} className="text-signal mx-auto mb-2" />
                    <p className="font-body text-sm text-ice/30">No {filter} alerts.</p>
                  </motion.div>
                ) : filtered.map((alert, i) => {
                  const anomalyType = (alert.type in TYPE_META ? alert.type : 'low_performance') as AnomalyType
                  const meta        = TYPE_META[anomalyType]
                  const c           = SEVERITY_COLOR[alert.severity] ?? SEVERITY_COLOR.warning

                  return (
                    <motion.div key={alert.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex gap-3 p-3 rounded-sm"
                      style={{ background: `${c}08`, border: `1px solid ${c}22` }}>

                      {/* Icon — same size/shape as Alerts.tsx */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-sm flex items-center justify-center mt-0.5"
                        style={{ background: `${c}12`, border: `1px solid ${c}30` }}>
                        <meta.icon size={13} style={{ color: c }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {/* Type badge */}
                          <span className="nav-label text-[0.5rem] px-1.5 py-0.5 rounded-sm"
                            style={{ background: `${c}15`, color: c }}>
                            {meta.label}
                          </span>
                          {/* Severity badge */}
                          <span className="nav-label text-[0.5rem] px-1.5 py-0.5 rounded-sm"
                            style={{
                              background: alert.severity === 'critical'
                                ? 'rgba(248,113,113,0.1)'
                                : 'rgba(245,158,11,0.1)',
                              color: c,
                            }}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="nav-label text-[0.5rem] text-ice/20 ml-auto">
                            {formatTime(alert.createdAt)}
                          </span>
                        </div>
                        <p className="font-body text-sm leading-snug"
                          style={{ color: `${c}cc` }}>
                          {alert.message}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
