import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, AlertOctagon, Bell, Clock, Check, X } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Starfield from '../components/Starfield'

type Alert = {
  id: string; type: 'stale'|'blocker'|'credibility'|'availability'|'capacity'|'overreliance'
  message: string; severity: 'critical'|'warning'|'info'
  intern: string; time: string; resolved: boolean
}

const INIT_ALERTS: Alert[] = [
  { id: 'A1', type: 'blocker',      severity: 'critical', intern: 'Karthik Suresh', time: '2h ago',    resolved: false, message: 'Blocker unresolved 96h — Code Review pending on CapacityScore Engine task' },
  { id: 'A2', type: 'stale',        severity: 'critical', intern: 'Arjun Mehta',    time: '4h ago',    resolved: false, message: 'Task stale 3 days — Plane.so API Integration. Deadline in 2 days.' },
  { id: 'A3', type: 'credibility',  severity: 'critical', intern: 'Karthik Suresh', time: '6h ago',    resolved: false, message: 'Low credibility score (41) for 2 consecutive weeks. Check-in recommended.' },
  { id: 'A4', type: 'availability', severity: 'warning',  intern: 'Riya Nair',      time: '8h ago',    resolved: false, message: 'Availability not submitted for current week. Monday 11AM deadline passed.' },
  { id: 'A5', type: 'availability', severity: 'warning',  intern: 'Arjun Mehta',    time: '8h ago',    resolved: false, message: 'Availability not submitted for current week.' },
  { id: 'A6', type: 'capacity',     severity: 'warning',  intern: 'Karthik Suresh', time: '1d ago',    resolved: false, message: 'CapacityScore dropped below 30. Reassignment recommendation triggered.' },
  { id: 'A7', type: 'overreliance', severity: 'info',     intern: 'Priya Verma',    time: '2d ago',    resolved: false, message: 'Over-reliance flag: received 38% of team tasks in rolling 4-week window.' },
]

const TYPE_META = {
  blocker:      { icon: AlertOctagon, label: 'BLOCKER',      color: '#f87171' },
  stale:        { icon: Clock,        label: 'STALE TASK',   color: '#f59e0b' },
  credibility:  { icon: AlertTriangle,label: 'CREDIBILITY',  color: '#f87171' },
  availability: { icon: Bell,         label: 'AVAILABILITY', color: '#f59e0b' },
  capacity:     { icon: AlertTriangle,label: 'CAPACITY',     color: '#f59e0b' },
  overreliance: { icon: Bell,         label: 'OVER-RELIANCE',color: '#b8d4f0' },
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>(INIT_ALERTS)
  const [filter, setFilter] = useState<'all'|'critical'|'warning'|'resolved'>('all')

  const resolve = (id: string) => setAlerts(a => a.map(al => al.id === id ? { ...al, resolved: true } : al))
  const dismiss = (id: string) => setAlerts(a => a.filter(al => al.id !== id))

  const filtered = alerts.filter(a =>
    filter === 'all' ? !a.resolved
    : filter === 'resolved' ? a.resolved
    : !a.resolved && a.severity === filter
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

          {/* Count pills */}
          <div className="flex gap-3 mb-6">
            {[
              { key: 'all',      label: 'All Active', val: counts.critical + counts.warning, c: '#c9a84c' },
              { key: 'critical', label: 'Critical',   val: counts.critical,                  c: '#f87171' },
              { key: 'warning',  label: 'Warning',    val: counts.warning,                   c: '#f59e0b' },
              { key: 'resolved', label: 'Resolved',   val: counts.resolved,                  c: '#4ade80' },
            ].map(p => (
              <motion.button key={p.key} whileTap={{ scale: 0.96 }}
                onClick={() => setFilter(p.key as any)}
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
                const meta = TYPE_META[alert.type]
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
                      {/* Icon */}
                      <div className="flex-shrink-0 w-9 h-9 rounded-sm flex items-center justify-center mt-0.5"
                        style={{ background: `${c}12`, border: `1px solid ${c}30` }}>
                        <meta.icon size={15} style={{ color: c }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="nav-label text-[0.5rem] px-1.5 py-0.5 rounded-sm"
                            style={{ background: `${c}15`, color: c }}>{meta.label}</span>
                          <span className="nav-label text-[0.5rem] text-ice/30">{alert.intern}</span>
                          <span className="nav-label text-[0.5rem] text-ice/20 ml-auto">{alert.time}</span>
                        </div>
                        <p className="font-body text-sm text-frost/75 leading-snug">{alert.message}</p>
                      </div>

                      {/* Actions */}
                      {!alert.resolved && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <motion.button whileHover={{ scale: 1.1 }} onClick={() => resolve(alert.id)}
                            className="w-7 h-7 rounded-sm flex items-center justify-center transition-colors"
                            style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}
                            title="Mark resolved">
                            <Check size={12} className="text-signal" />
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} onClick={() => dismiss(alert.id)}
                            className="w-7 h-7 rounded-sm flex items-center justify-center transition-colors hover:bg-red-400/10"
                            style={{ border: '1px solid rgba(248,113,113,0.15)' }}
                            title="Dismiss">
                            <X size={12} className="text-red-400/60" />
                          </motion.button>
                        </div>
                      )}
                      {alert.resolved && (
                        <span className="nav-label text-[0.5rem] text-signal flex-shrink-0">RESOLVED</span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}
