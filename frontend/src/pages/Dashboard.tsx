import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Users, AlertTriangle, CheckCircle2, TrendingUp, Clock, ChevronRight } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Starfield from '../components/Starfield'
import { dashboardAPI } from '../api/endpoints'

type InternRow = {
  id: string; name: string; capacityScore: number; tli: number
  rpi: number; credibilityScore: number; availability: string; taskCount: number
}

type AlertItem = { type: string; message: string; severity: 'critical' | 'warning' }

type Overview = {
  totalInterns: number; activeTasks: number; openAlerts: number; completedLast30: number
  interns: InternRow[]; alerts: AlertItem[]
}

function BandDot({ score }: { score: number }) {
  const c = score > 70 ? '#4ade80' : score > 40 ? '#f59e0b' : '#f87171'
  return <span className="status-dot" style={{ background: c, boxShadow: `0 0 5px ${c}55` }} />
}

function ScoreBar({ val }: { val: number }) {
  const c = val > 70 ? '#4ade80' : val > 40 ? '#f59e0b' : '#f87171'
  return (
    <div className="progress-bar w-full mt-1">
      <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        style={{ height: '100%', background: `linear-gradient(90deg, ${c}88, ${c})`, borderRadius: 2 }} />
    </div>
  )
}

// Fallback mock data when backend is offline
const MOCK: Overview = {
  totalInterns: 6, activeTasks: 14, openAlerts: 4, completedLast30: 31,
  interns: [
    { id: '1', name: 'Ananya Seeta',   capacityScore: 82, tli: 4.2, rpi: 4.3, credibilityScore: 88, availability: 'Available', taskCount: 2 },
    { id: '2', name: 'Riya Nair',      capacityScore: 67, tli: 7.8, rpi: 3.8, credibilityScore: 71, availability: 'Partial',   taskCount: 4 },
    { id: '3', name: 'Arjun Mehta',    capacityScore: 55, tli: 9.1, rpi: 3.1, credibilityScore: 62, availability: 'Partial',   taskCount: 5 },
    { id: '4', name: 'Priya Verma',    capacityScore: 91, tli: 2.0, rpi: 4.8, credibilityScore: 94, availability: 'Available', taskCount: 1 },
    { id: '5', name: 'Karthik Suresh', capacityScore: 28, tli: 13.4, rpi: 2.2, credibilityScore: 41, availability: 'Occupied', taskCount: 7 },
    { id: '6', name: 'Meghna Das',     capacityScore: 73, tli: 5.9, rpi: 4.0, credibilityScore: 79, availability: 'Available', taskCount: 3 },
  ],
  alerts: [
    { type: 'stale',   message: 'API Integration task stale — Arjun Mehta (3d, deadline in 2d)', severity: 'critical' },
    { type: 'blocker', message: 'Blocker unresolved 96h — Karthik Suresh · Code Review pending', severity: 'critical' },
    { type: 'credit',  message: 'Low credibility score (2nd week) — Karthik Suresh',            severity: 'warning' },
    { type: 'avail',   message: 'Availability not submitted — Riya Nair, Arjun Mehta',          severity: 'warning' },
  ],
}

export default function Dashboard() {
  const [data, setData] = useState<Overview>(MOCK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardAPI.getAdminOverview()
      .then(res => setData(res.data))
      .catch(() => setData(MOCK))
      .finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: 'Active Interns',    val: data.totalInterns,    sub: 'Currently onboarded',   icon: Users,        color: '#c9a84c' },
    { label: 'Tasks In Progress', val: data.activeTasks,     sub: 'Across all interns',    icon: BarChart3,    color: '#b8d4f0' },
    { label: 'Open Alerts',       val: data.openAlerts,      sub: 'Require attention',      icon: AlertTriangle,color: '#f87171' },
    { label: 'Completed (30d)',   val: data.completedLast30, sub: 'Tasks delivered',        icon: CheckCircle2, color: '#4ade80' },
  ]

  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI']

  return (
    <div className="min-h-screen bg-navy-950 text-frost">
      <Starfield />
      <Sidebar />

      <main className="ml-52 pt-14 min-h-screen relative z-10">
        <div className="px-8 py-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-end justify-between mb-8">
            <div>
              <p className="nav-label text-[0.55rem] text-gold/40 tracking-ultra mb-1">OPERATIONS CENTRE</p>
              <h1 className="font-display font-black text-3xl md:text-4xl text-ice-gradient">Command Dashboard</h1>
              <div className="gold-rule w-16 mt-2" />
            </div>
            <div className="signal-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse-slow" />
              <span className="nav-label text-[0.6rem] text-ice/50">LIVE · 15m SYNC</span>
            </div>
          </motion.div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }} whileHover={{ y: -3, borderColor: 'rgba(201,168,76,0.3)' }}
                className="glass-card p-5 rounded-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="nav-label text-[0.55rem] text-ice/40">{s.label}</p>
                  <s.icon size={13} style={{ color: s.color }} />
                </div>
                <p className="font-display font-black text-3xl mb-1" style={{ color: s.color }}>
                  {loading ? '—' : s.val}
                </p>
                <p className="font-body text-xs text-ice/30">{s.sub}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Capacity Table */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }} className="glass-card rounded-sm xl:col-span-2">
              <div className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
                <div>
                  <p className="nav-label text-[0.55rem] text-gold/40 mb-0.5">WEEKLY INTELLIGENCE</p>
                  <h2 className="font-display text-lg text-frost">Who Is Free This Week</h2>
                </div>
                <TrendingUp size={14} className="text-gold/40" />
              </div>
              <div className="overflow-x-auto">
                <table className="uris-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Intern</th>
                      <th className="text-center">Availability</th>
                      <th className="text-center">Capacity</th>
                      <th className="text-center">TLI</th>
                      <th className="text-center">RPI</th>
                      <th className="text-center">Cred.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.interns.map((intern, i) => (
                      <motion.tr key={intern.id} initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.06 }}>
                        <td>
                          <div className="flex items-center gap-2">
                            <BandDot score={intern.capacityScore} />
                            <span className="font-body text-sm text-frost/80">{intern.name}</span>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="nav-label text-[0.55rem] px-2 py-0.5 rounded-full"
                            style={{
                              background: intern.availability === 'Available' ? 'rgba(74,222,128,0.12)' : intern.availability === 'Partial' ? 'rgba(245,158,11,0.12)' : 'rgba(248,113,113,0.12)',
                              color: intern.availability === 'Available' ? '#4ade80' : intern.availability === 'Partial' ? '#f59e0b' : '#f87171',
                            }}>
                            {intern.availability}
                          </span>
                        </td>
                        <td className="text-center min-w-[80px]">
                          <span className="font-mono text-sm"
                            style={{ color: intern.capacityScore > 70 ? '#4ade80' : intern.capacityScore > 40 ? '#f59e0b' : '#f87171' }}>
                            {intern.capacityScore}
                          </span>
                          <ScoreBar val={intern.capacityScore} />
                        </td>
                        <td className="text-center font-mono text-sm"
                          style={{ color: intern.tli <= 6 ? '#4ade80' : intern.tli <= 12 ? '#f59e0b' : '#f87171' }}>
                          {intern.tli?.toFixed(1)}
                        </td>
                        <td className="text-center font-mono text-sm text-ice/60">{intern.rpi?.toFixed(1)}</td>
                        <td className="text-center font-mono text-sm text-ice/60">{intern.credibilityScore}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Alerts panel */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }} className="glass-card rounded-sm">
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
                <div>
                  <p className="nav-label text-[0.55rem] text-gold/40 mb-0.5">SYSTEM ALERTS</p>
                  <h2 className="font-display text-lg text-frost">Active Signals</h2>
                </div>
                <span className="nav-label text-[0.55rem] px-2 py-0.5 rounded-full text-red-400 bg-red-400/10">
                  {data.alerts.length} ACTIVE
                </span>
              </div>
              <div className="p-4 space-y-3">
                {data.alerts.map((a, i) => {
                  const c = a.severity === 'critical' ? '#f87171' : '#f59e0b'
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.08 }} whileHover={{ x: 2 }}
                      className="flex gap-3 p-3 rounded-sm cursor-pointer"
                      style={{ background: `${c}08`, border: `1px solid ${c}22` }}>
                      <div className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-slow"
                        style={{ background: c }} />
                      <p className="font-body text-sm leading-snug" style={{ color: `${c}cc` }}>{a.message}</p>
                    </motion.div>
                  )
                })}
                <button className="w-full flex items-center justify-between px-3 py-2 mt-2 rounded-sm text-gold/50 hover:text-gold transition-colors"
                  style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}>
                  <span className="nav-label text-[0.6rem]">VIEW ALL ALERTS</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            </motion.div>
          </div>

          {/* Heatmap */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }} className="glass-card rounded-sm mt-6 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="nav-label text-[0.55rem] text-gold/40 mb-0.5">AVAILABILITY HEATMAP</p>
                <h2 className="font-display text-lg text-frost">Team Capacity by Day</h2>
              </div>
              <Clock size={13} className="text-gold/40" />
            </div>
            <div className="grid grid-cols-5 gap-3">
              {days.map((day, di) => (
                <div key={day}>
                  <p className="nav-label text-[0.55rem] text-ice/40 text-center mb-2">{day}</p>
                  <div className="space-y-1">
                    {data.interns.map((intern, ii) => {
                      const seed = (di * 7 + ii * 3) % 5
                      const v = Math.max(15, Math.min(95, intern.capacityScore + (seed - 2) * 12))
                      return (
                        <motion.div key={intern.id}
                          initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }}
                          transition={{ delay: 0.7 + di * 0.04 + ii * 0.02 }}
                          title={`${intern.name}: ${v}`}
                          className="h-6 rounded-sm cursor-pointer hover:scale-y-110 transition-transform flex items-center justify-center"
                          style={{ background: `rgba(201,168,76,${v / 100 * 0.5 + 0.05})`, border: '1px solid rgba(201,168,76,0.1)' }}>
                          <span className="nav-label text-[0.45rem] text-gold/70">{v}</span>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 justify-end">
              {[{ label: 'HIGH', c: 'rgba(201,168,76,0.6)' }, { label: 'MED', c: 'rgba(201,168,76,0.3)' }, { label: 'LOW', c: 'rgba(201,168,76,0.1)' }].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: l.c }} />
                  <span className="nav-label text-[0.5rem] text-ice/30">{l.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
