import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, TrendingUp, X, Check, UserCheck } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Starfield from '../components/Starfield'
import { adminAPI, assignmentAPI, tasksAPI, dashboardAPI } from '../api/endpoints'

type InternRow = {
  id: string; name: string; capacityScore: number; tli: number
  rpi: number; credibilityScore: number; availability: string; taskCount: number
}

type Task = { id: string; title: string; assignee?: string; status: string }

const MOCK_INTERNS: InternRow[] = [
  { id: '1', name: 'Ananya Seeta',   capacityScore: 82, tli: 4.2,  rpi: 4.3, credibilityScore: 88, availability: 'Available', taskCount: 2 },
  { id: '2', name: 'Riya Nair',      capacityScore: 67, tli: 7.8,  rpi: 3.8, credibilityScore: 71, availability: 'Partial',   taskCount: 4 },
  { id: '3', name: 'Arjun Mehta',    capacityScore: 55, tli: 9.1,  rpi: 3.1, credibilityScore: 62, availability: 'Partial',   taskCount: 5 },
  { id: '4', name: 'Priya Verma',    capacityScore: 91, tli: 2.0,  rpi: 4.8, credibilityScore: 94, availability: 'Available', taskCount: 1 },
  { id: '5', name: 'Karthik Suresh', capacityScore: 28, tli: 13.4, rpi: 2.2, credibilityScore: 41, availability: 'Occupied',  taskCount: 7 },
  { id: '6', name: 'Meghna Das',     capacityScore: 73, tli: 5.9,  rpi: 4.0, credibilityScore: 79, availability: 'Available', taskCount: 3 },
]

const MOCK_TASKS: Task[] = [
  { id: 'T001', title: 'Frontend Dashboard — Heatmap',       assignee: 'Ananya Seeta',  status: 'under_review' },
  { id: 'T002', title: 'Credibility Analyzer',               assignee: 'Riya Nair',     status: 'in_progress_mid' },
  { id: 'T003', title: 'Plane.so API Integration',           assignee: 'Arjun Mehta',   status: 'in_progress_early' },
  { id: 'T005', title: 'CapacityScore Engine',               assignee: undefined,       status: 'backlog' },
  { id: 'T006', title: 'OpenProject Gantt Sync',             assignee: 'Meghna Das',    status: 'in_progress_mid' },
]

export default function AdminOverview() {
  const [interns, setInterns]     = useState<InternRow[]>(MOCK_INTERNS)
  const [tasks, setTasks]         = useState<Task[]>(MOCK_TASKS)
  const [activeTab, setActiveTab] = useState<'override'|'assign'|'status'>('assign')

  // Override score form
  const [overrideInternId, setOverrideInternId] = useState('')
  const [overrideScore, setOverrideScore]       = useState('')
  const [overrideReason, setOverrideReason]     = useState('')
  const [overrideLoading, setOverrideLoading]   = useState(false)
  const [overrideMsg, setOverrideMsg]           = useState<{ok:boolean;text:string}|null>(null)

  // Assign task form
  const [assignInternId, setAssignInternId] = useState('')
  const [assignTaskId, setAssignTaskId]     = useState('')
  const [assignLoading, setAssignLoading]   = useState(false)
  const [assignMsg, setAssignMsg]           = useState<{ok:boolean;text:string}|null>(null)

  // Update task status form
  const [statusTaskId, setStatusTaskId]   = useState('')
  const [statusValue, setStatusValue]     = useState('in_progress_early')
  const [statusProgress, setStatusProgress] = useState('25')
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusMsg, setStatusMsg]         = useState<{ok:boolean;text:string}|null>(null)

  useEffect(() => {
    dashboardAPI.getAdminOverview()
      .then(res => { if (res.data?.interns?.length) setInterns(res.data.interns) })
      .catch(() => {})
    tasksAPI.getAll()
      .then(res => { if (res.data?.length) setTasks(res.data) })
      .catch(() => {})
  }, [])

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    setOverrideLoading(true); setOverrideMsg(null)
    try {
      await adminAPI.overrideScore({ internId: overrideInternId, score: Number(overrideScore), reason: overrideReason })
      setOverrideMsg({ ok: true, text: 'Score override applied successfully.' })
      setOverrideInternId(''); setOverrideScore(''); setOverrideReason('')
    } catch (err: any) {
      setOverrideMsg({ ok: false, text: err.response?.data?.message || 'Override failed.' })
    } finally { setOverrideLoading(false) }
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    setAssignLoading(true); setAssignMsg(null)
    try {
      await assignmentAPI.assignTask({ internId: assignInternId, taskId: assignTaskId })
      setAssignMsg({ ok: true, text: `Task ${assignTaskId} assigned to intern ${assignInternId}.` })
      setAssignInternId(''); setAssignTaskId('')
    } catch (err: any) {
      setAssignMsg({ ok: false, text: err.response?.data?.message || 'Assignment failed.' })
    } finally { setAssignLoading(false) }
  }

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusLoading(true); setStatusMsg(null)
    try {
      await tasksAPI.updateStatus({ taskId: statusTaskId, status: statusValue, progress: Number(statusProgress) })
      setStatusMsg({ ok: true, text: `Task ${statusTaskId} updated to ${statusValue}.` })
      setStatusTaskId(''); setStatusProgress('25')
    } catch (err: any) {
      setStatusMsg({ ok: false, text: err.response?.data?.message || 'Status update failed.' })
    } finally { setStatusLoading(false) }
  }

  const tabs = [
    { key: 'assign',   label: 'ASSIGN TASK',      icon: UserCheck },
    { key: 'override', label: 'SCORE OVERRIDE',   icon: Shield },
    { key: 'status',   label: 'UPDATE STATUS',    icon: TrendingUp },
  ] as const

  return (
    <div className="min-h-screen bg-navy-950 text-frost">
      <Starfield />
      <Sidebar />
      <main className="ml-52 pt-14 min-h-screen relative z-10">
        <div className="px-8 py-8">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="nav-label text-[0.55rem] text-gold/40 tracking-ultra mb-1">ADMIN CONTROLS</p>
            <h1 className="font-display font-black text-3xl text-ice-gradient">Admin Overview</h1>
            <div className="gold-rule w-14 mt-2" />
            <p className="font-body text-sm text-ice/40 mt-2">Assignment engine · Score override · Task status management</p>
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Left — ASL shortlist */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }} className="glass-card rounded-sm xl:col-span-2">
              <div className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
                <div>
                  <p className="nav-label text-[0.55rem] text-gold/40 mb-0.5">ASL TRIAD SHORTLIST</p>
                  <h2 className="font-display text-lg text-frost">Ranked by Capacity Score</h2>
                </div>
                <span className="nav-label text-[0.55rem] text-ice/30">AVAILABILITY → SKILL → LOAD</span>
              </div>
              <div className="overflow-x-auto">
                <table className="uris-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Rank</th>
                      <th className="text-left">Intern</th>
                      <th className="text-center">Availability</th>
                      <th className="text-center">Capacity</th>
                      <th className="text-center">TLI</th>
                      <th className="text-center">RPI</th>
                      <th className="text-center">Cred.</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...interns]
                      .filter(i => i.availability !== 'Occupied' && i.capacityScore >= 20)
                      .sort((a, b) => b.capacityScore - a.capacityScore)
                      .map((intern, idx) => (
                        <motion.tr key={intern.id}
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + idx * 0.07 }}>
                          <td>
                            <span className="font-display font-black text-sm"
                              style={{ color: idx === 0 ? '#c9a84c' : 'rgba(184,212,240,0.3)' }}>
                              #{idx + 1}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <span className="status-dot" style={{
                                background: intern.capacityScore > 70 ? '#4ade80' : '#f59e0b',
                                boxShadow: `0 0 5px ${intern.capacityScore > 70 ? '#4ade8055' : '#f59e0b55'}`
                              }} />
                              <span className="font-body text-sm text-frost/80">{intern.name}</span>
                            </div>
                          </td>
                          <td className="text-center">
                            <span className="nav-label text-[0.5rem] px-2 py-0.5 rounded-full"
                              style={{
                                background: intern.availability === 'Available' ? 'rgba(74,222,128,0.12)' : 'rgba(245,158,11,0.12)',
                                color: intern.availability === 'Available' ? '#4ade80' : '#f59e0b',
                              }}>{intern.availability}</span>
                          </td>
                          <td className="text-center font-mono text-sm"
                            style={{ color: intern.capacityScore > 70 ? '#4ade80' : '#f59e0b' }}>
                            {intern.capacityScore}
                          </td>
                          <td className="text-center font-mono text-sm text-ice/60">{intern.tli?.toFixed(1)}</td>
                          <td className="text-center font-mono text-sm text-ice/60">{intern.rpi?.toFixed(1)}</td>
                          <td className="text-center">
                            <span className="font-mono text-sm"
                              style={{ color: intern.credibilityScore >= 50 ? 'rgba(184,212,240,0.6)' : '#f87171' }}>
                              {intern.credibilityScore}
                              {intern.credibilityScore < 50 && <span className="text-[0.5rem] ml-1">⚠</span>}
                            </span>
                          </td>
                          <td className="text-center">
                            <motion.button
                              whileHover={{ scale: 1.08 }}
                              onClick={() => setAssignInternId(intern.id)}
                              className="nav-label text-[0.55rem] px-3 py-1 rounded-sm transition-colors"
                              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#c9a84c' }}>
                              SELECT
                            </motion.button>
                          </td>
                        </motion.tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Do Not Assign section */}
              {interns.filter(i => i.capacityScore < 20 || i.availability === 'Occupied').length > 0 && (
                <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(248,113,113,0.1)' }}>
                  <p className="nav-label text-[0.55rem] text-red-400/50 mb-2">DO NOT ASSIGN — CAPACITY BELOW THRESHOLD</p>
                  <div className="flex flex-wrap gap-2">
                    {interns.filter(i => i.capacityScore < 20 || i.availability === 'Occupied').map(i => (
                      <span key={i.id} className="nav-label text-[0.55rem] px-2 py-1 rounded-sm"
                        style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                        {i.name} · {i.capacityScore}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Right — Action panel */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }} className="glass-card rounded-sm">

              {/* Tabs */}
              <div className="flex" style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
                {tabs.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className="flex-1 py-3 nav-label text-[0.55rem] transition-all duration-200 flex flex-col items-center gap-1"
                    style={{
                      background: activeTab === t.key ? 'rgba(201,168,76,0.08)' : 'transparent',
                      borderBottom: activeTab === t.key ? '2px solid #c9a84c' : '2px solid transparent',
                      color: activeTab === t.key ? '#c9a84c' : 'rgba(184,212,240,0.35)',
                    }}>
                    <t.icon size={12} />
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">

                  {/* ASSIGN TASK */}
                  {activeTab === 'assign' && (
                    <motion.form key="assign" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }} onSubmit={handleAssign} className="space-y-4">
                      <div>
                        <p className="nav-label text-[0.55rem] text-gold/40 mb-3">ASSIGN TASK TO INTERN</p>
                        <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">SELECT INTERN</label>
                        <select className="uris-input" value={assignInternId}
                          onChange={e => setAssignInternId(e.target.value)} required>
                          <option value="">Choose intern...</option>
                          {interns.map(i => (
                            <option key={i.id} value={i.id}>{i.name} (Cap: {i.capacityScore})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">SELECT TASK</label>
                        <select className="uris-input" value={assignTaskId}
                          onChange={e => setAssignTaskId(e.target.value)} required>
                          <option value="">Choose task...</option>
                          {tasks.map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))}
                        </select>
                      </div>
                      {assignMsg && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="flex items-center gap-2 p-3 rounded-sm"
                          style={{
                            background: assignMsg.ok ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                            border: `1px solid ${assignMsg.ok ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                          }}>
                          {assignMsg.ok ? <Check size={13} className="text-signal flex-shrink-0" /> : <X size={13} className="text-red-400 flex-shrink-0" />}
                          <p className="font-body text-sm" style={{ color: assignMsg.ok ? '#4ade80' : '#f87171' }}>{assignMsg.text}</p>
                        </motion.div>
                      )}
                      <motion.button type="submit" disabled={assignLoading}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="btn-gold w-full py-3 rounded-sm disabled:opacity-50">
                        {assignLoading ? 'ASSIGNING...' : 'CONFIRM ASSIGNMENT'}
                      </motion.button>
                    </motion.form>
                  )}

                  {/* SCORE OVERRIDE */}
                  {activeTab === 'override' && (
                    <motion.form key="override" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }} onSubmit={handleOverride} className="space-y-4">
                      <div>
                        <p className="nav-label text-[0.55rem] text-gold/40 mb-3">MANUAL SCORE OVERRIDE</p>
                        <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">SELECT INTERN</label>
                        <select className="uris-input" value={overrideInternId}
                          onChange={e => setOverrideInternId(e.target.value)} required>
                          <option value="">Choose intern...</option>
                          {interns.map(i => (
                            <option key={i.id} value={i.id}>{i.name} (Current: {i.capacityScore})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">NEW SCORE (0–100)</label>
                        <input type="number" min="0" max="100" className="uris-input"
                          placeholder="e.g. 65" value={overrideScore}
                          onChange={e => setOverrideScore(e.target.value)} required />
                      </div>
                      <div>
                        <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">REASON (OPTIONAL)</label>
                        <textarea className="uris-input resize-none" rows={2}
                          placeholder="Justification for manual override..."
                          value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
                      </div>
                      {overrideMsg && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="flex items-center gap-2 p-3 rounded-sm"
                          style={{
                            background: overrideMsg.ok ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                            border: `1px solid ${overrideMsg.ok ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                          }}>
                          {overrideMsg.ok ? <Check size={13} className="text-signal flex-shrink-0" /> : <X size={13} className="text-red-400 flex-shrink-0" />}
                          <p className="font-body text-sm" style={{ color: overrideMsg.ok ? '#4ade80' : '#f87171' }}>{overrideMsg.text}</p>
                        </motion.div>
                      )}
                      <motion.button type="submit" disabled={overrideLoading}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="btn-gold w-full py-3 rounded-sm disabled:opacity-50">
                        {overrideLoading ? 'APPLYING...' : 'APPLY OVERRIDE'}
                      </motion.button>
                    </motion.form>
                  )}

                  {/* UPDATE TASK STATUS */}
                  {activeTab === 'status' && (
                    <motion.form key="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }} onSubmit={handleStatusUpdate} className="space-y-4">
                      <div>
                        <p className="nav-label text-[0.55rem] text-gold/40 mb-3">UPDATE TASK STATUS</p>
                        <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">SELECT TASK</label>
                        <select className="uris-input" value={statusTaskId}
                          onChange={e => setStatusTaskId(e.target.value)} required>
                          <option value="">Choose task...</option>
                          {tasks.map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">NEW STATUS</label>
                        <select className="uris-input" value={statusValue}
                          onChange={e => setStatusValue(e.target.value)} required>
                          <option value="backlog">Backlog (0%)</option>
                          <option value="in_progress_early">In Progress — Early (25%)</option>
                          <option value="in_progress_mid">In Progress — Mid (50%)</option>
                          <option value="under_review">Under Review (75%)</option>
                          <option value="completed">Completed (100%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">PROGRESS %</label>
                        <input type="number" min="0" max="100" className="uris-input"
                          value={statusProgress} onChange={e => setStatusProgress(e.target.value)} required />
                      </div>
                      {statusMsg && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="flex items-center gap-2 p-3 rounded-sm"
                          style={{
                            background: statusMsg.ok ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                            border: `1px solid ${statusMsg.ok ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                          }}>
                          {statusMsg.ok ? <Check size={13} className="text-signal flex-shrink-0" /> : <X size={13} className="text-red-400 flex-shrink-0" />}
                          <p className="font-body text-sm" style={{ color: statusMsg.ok ? '#4ade80' : '#f87171' }}>{statusMsg.text}</p>
                        </motion.div>
                      )}
                      <motion.button type="submit" disabled={statusLoading}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="btn-gold w-full py-3 rounded-sm disabled:opacity-50">
                        {statusLoading ? 'UPDATING...' : 'UPDATE STATUS'}
                      </motion.button>
                    </motion.form>
                  )}

                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
