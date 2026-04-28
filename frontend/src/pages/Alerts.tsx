import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, AlertOctagon, Bell, Clock, Check, X, Loader2 } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Starfield from '../components/Starfield'
import { getAlerts, resolveAlert, type Alert } from '../services/alerts.service'
import { extractErrorMessage } from '../services/error'

const TYPE_META = {
  blocker:           { icon: AlertOctagon,  label: 'BLOCKER',          color: '#f87171' },
  blocker_escalation:{ icon: AlertOctagon,  label: 'BLOCKER ESC.',     color: '#f87171' },
  stale:             { icon: Clock,         label: 'STALE TASK',       color: '#f59e0b' },
  stale_task:        { icon: Clock,         label: 'STALE TASK',       color: '#f59e0b' },
  credibility:       { icon: AlertTriangle, label: 'CREDIBILITY',      color: '#f87171' },
  availability:      { icon: Bell,          label: 'AVAILABILITY',     color: '#f59e0b' },
  capacity:          { icon: AlertTriangle, label: 'CAPACITY',         color: '#f59e0b' },
  overreliance:      { icon: Bell,          label: 'OVER-RELIANCE',    color: '#b8d4f0' },
  reassignment:      { icon: AlertTriangle, label: 'REASSIGNMENT',     color: '#f59e0b' },
  low_performance:   { icon: AlertTriangle, label: 'LOW PERFORMANCE',  color: '#f87171' },
  spike:             { icon: Bell,          label: 'SCORE SPIKE',      color: '#f59e0b' },
} as const

function formatTime(iso?: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Alerts() {
  const [alerts, setAlerts]   = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [filter, setFilter]   = useState<'all' | 'critical' | 'warning' | 'resolved'>('all')
  const [resolving, setResolving] = useState<string | null>(null)

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const data = await getAlerts()
        setAlerts(data)
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to load alerts. Ensure the backend is running.'))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const handleResolve = async (id: string) => {
    setResolving(id)
    try {
      await resolveAlert(id)
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a))
    } catch {
      // silently fail — alert stays unresolved
    } finally {
      setResolving(null)
    }
  }

  const handleDismiss = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const filtered = alerts.filter(a =>
    filter === 'all'      ? !a.resolved :
    filter === 'resolved' ? a.resolved :
    !a.resolved && a.severity === filter
  )

  const counts = {
    critical: alerts.filter(a => !a.resolved && a.severity === 'critical').length,
    warning:  alerts.filter(a => !a.resolved && a.severity === 'warning').length,
    resolved: alerts.filter(a => a.resolved).length,
  }

  return (
    <div className="min-h-screen bg-navy-950 text-frost">
      <Starfield />
      <Sidebar />
      <main className="ml-52 pt-14 min-h-screen relative z-10">
        <div className="px-8 py-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-end justify-between mb-8">
            <div>
              <p className="nav-label text-[0.55rem] text-gold/40 tracking-ultra mb-1">SIGNAL MONITORING</p>
              <h1 className="font-display font-black text-3xl text-ice-gradient">System Alerts</h1>
              <div className="gold-rule w-14 mt-2" />
            </div>
            <div className="signal-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse-slow" />
              <span className="nav-label text-[0.6rem] text-ice/50">MONITORING ACTIVE</span>
            </div>
          </motion.div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="text-gold animate-spin" />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="glass-card rounded-sm p-10 text-center max-w-md mx-auto">
              <AlertTriangle size={28} className="text-red-400 mx-auto mb-3" />
              <p className="font-body text-sm text-ice/50">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Count pills */}
              <div className="flex gap-3 mb-6">
                {[
                  { key: 'all',      label: 'All Active', val: counts.critical + counts.warning, c: '#c9a84c' },
                  { key: 'critical', label: 'Critical',   val: counts.critical,                  c: '#f87171' },
                  { key: 'warning',  label: 'Warning',    val: counts.warning,                   c: '#f59e0b' },
                  { key: 'resolved', label: 'Resolved',   val: counts.resolved,                  c: '#4ade80' },
                ].map(p => (
                  <motion.button key={p.key} whileTap={{ scale: 0.96 }}
                    onClick={() => setFilter(p.key as typeof filter)}
                    className="flex items-center gap-2 px-4 py-2 rounded-sm transition-all duration-200"
                    style={{
                      background: filter === p.key ? `${p.c}15` : 'rgba(13,15,28,0.6)',
                      border: `1px solid ${filter === p.key ? `${p.c}44` : 'rgba(201,168,76,0.1)'}`,
                    }}>
                    <span className="font-display font-black text-lg" style={{ color: p.c }}>{p.val}</span>
                    <span className="nav-label text-[0.55rem] text-ice/40">{p.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Alert list */}
              <div className="space-y-3">
                <AnimatePresence>
                  {filtered.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="glass-card rounded-sm p-10 text-center">
                      <Check size={24} className="text-signal mx-auto mb-3" />
                      <p className="font-display text-xl text-frost/60">No alerts in this category</p>
                    </motion.div>
                  ) : filtered.map((alert, i) => {
                    const type = alert.type in TYPE_META ? alert.type : 'capacity'                    const meta = TYPE_META[type as keyof typeof TYPE_META]
                    const c = alert.severity === 'critical' ? '#f87171' : alert.severity === 'warning' ? '#f59e0b' : '#b8d4f0'

                    return (
                      <motion.div key={alert.id}
                        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12, height: 0 }} transition={{ delay: i * 0.06 }}
                        className="glass-card rounded-sm p-5"
                        style={{
                          opacity: alert.resolved ? 0.5 : 1,
                          borderColor: alert.resolved ? 'rgba(74,222,128,0.2)' : `${c}22`,
                        }}>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-9 h-9 rounded-sm flex items-center justify-center mt-0.5"
                            style={{ background: `${c}12`, border: `1px solid ${c}30` }}>
                            <meta.icon size={15} style={{ color: c }} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="nav-label text-[0.5rem] px-1.5 py-0.5 rounded-sm"
                                style={{ background: `${c}15`, color: c }}>{meta.label}</span>
                              {alert.intern && (
                                <span className="nav-label text-[0.5rem] text-ice/30">{alert.intern}</span>
                              )}
                              <span className="nav-label text-[0.5rem] text-ice/20 ml-auto">
                                {alert.time ?? formatTime(alert.createdAt)}
                              </span>
                            </div>
                            <p className="font-body text-sm text-frost/75 leading-snug">{alert.message}</p>
                          </div>

                          {!alert.resolved ? (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <motion.button whileHover={{ scale: 1.1 }}
                                onClick={() => handleResolve(alert.id)}
                                disabled={resolving === alert.id}
                                className="w-7 h-7 rounded-sm flex items-center justify-center transition-colors"
                                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}
                                title="Mark resolved">
                                {resolving === alert.id
                                  ? <Loader2 size={11} className="text-signal animate-spin" />
                                  : <Check size={12} className="text-signal" />}
                              </motion.button>
                              <motion.button whileHover={{ scale: 1.1 }}
                                onClick={() => handleDismiss(alert.id)}
                                className="w-7 h-7 rounded-sm flex items-center justify-center transition-colors hover:bg-red-400/10"
                                style={{ border: '1px solid rgba(248,113,113,0.15)' }}
                                title="Dismiss">
                                <X size={12} className="text-red-400/60" />
                              </motion.button>
                            </div>
                          ) : (
                            <span className="nav-label text-[0.5rem] text-signal flex-shrink-0">RESOLVED</span>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
