import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, AlertOctagon, Clock, Flag, Plus, X } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Starfield from '../components/Starfield'
import { tasksAPI } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'

type Task = {
  id: string; title: string; assignee?: string; internId?: string
  status: string; complexity: number; deadline?: string
  blocker?: string | null; progress?: number; planeTaskId?: string
  skill?: string; note?: string; isStale?: boolean
}

const SKILL_COLORS: Record<string, string> = {
  Frontend: '#b8d4f0', Backend: '#c9a84c', DevOps: '#4ade80',
  Testing: '#a78bfa', Documentation: '#f87171', 'AI/ML': '#fb923c', Research: '#34d399',
}

const statusPct = (s: string) =>
  s === 'backlog' || s === 'not_started' ? 0
  : s === 'in_progress_early' ? 25
  : s === 'in_progress_mid' ? 50
  : s === 'under_review' ? 75
  : s === 'completed' ? 100
  : typeof s === 'number' ? s : 0

const MOCK_TASKS: Task[] = [
  { id: 'T001', title: 'Frontend Dashboard — Availability Heatmap', internId: '1', assignee: 'Ananya Seeta', status: 'under_review',      complexity: 0.8, deadline: '2026-04-25', skill: 'Frontend', isStale: false, note: 'Integrated FullCalendar. Density shading complete.' },
  { id: 'T002', title: 'Credibility Analyzer — Signal Computation',  internId: '2', assignee: 'Riya Nair',    status: 'in_progress_mid',    complexity: 1.0, deadline: '2026-04-24', skill: 'Backend',  isStale: false, note: 'All four signals coded. Needs peer review.', blocker: 'Code Review' },
  { id: 'T003', title: 'Plane.so API Integration Middleware',         internId: '3', assignee: 'Arjun Mehta',  status: 'in_progress_early',  complexity: 0.8, deadline: '2026-04-23', skill: 'Backend',  isStale: true,  note: 'Webhook endpoint set up. No update for 3 days.' },
  { id: 'T004', title: 'Review System — RPI Rolling Average',         internId: '4', assignee: 'Priya Verma',  status: 'completed',          complexity: 0.6, deadline: '2026-04-22', skill: 'Backend',  isStale: false, note: 'Delivered and reviewed. Score: 4.2 / 5.' },
  { id: 'T005', title: 'CapacityScore Engine — Five-Signal Formula',  internId: '5', assignee: 'Karthik Suresh', status: 'backlog',          complexity: 1.0, deadline: '2026-04-26', skill: 'Backend',  isStale: false, note: 'Pending requirements clarification.', blocker: 'Unclear Requirements' },
  { id: 'T006', title: 'OpenProject Gantt Sync',                      internId: '6', assignee: 'Meghna Das',   status: 'in_progress_mid',    complexity: 0.6, deadline: '2026-04-28', skill: 'DevOps',   isStale: false, note: 'Work package API connected. Deadline sync working.' },
]

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS)
  const [expanded, setExpanded] = useState<string | null>('T001')
  const [filter, setFilter] = useState<'all'|'stale'|'blocked'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', internId: '', complexity: '0.5', status: 'backlog', planeTaskId: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const isAdmin = useAuthStore(s => s.isAdmin())

  useEffect(() => {
    tasksAPI.getAll()
      .then(res => { if (res.data?.length) setTasks(res.data) })
      .catch(() => {}) // use mock
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      const complexity = parseFloat(newTask.complexity)
      if (complexity < 0 || complexity > 1) throw new Error('Complexity must be between 0 and 1')
      await tasksAPI.create({ ...newTask, complexity })
      const res = await tasksAPI.getAll()
      if (res.data?.length) setTasks(res.data)
      setShowCreate(false)
      setNewTask({ title: '', internId: '', complexity: '0.5', status: 'backlog', planeTaskId: '' })
    } catch (err: any) {
      setCreateError(err.response?.data?.message || err.message || 'Failed to create task.')
    } finally {
      setCreating(false)
    }
  }

  const filtered = tasks.filter(t =>
    filter === 'all' ? true : filter === 'stale' ? t.isStale : !!t.blocker
  )

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
              <p className="nav-label text-[0.55rem] text-gold/40 tracking-ultra mb-1">TASK INTELLIGENCE</p>
              <h1 className="font-display font-black text-3xl text-ice-gradient">Task Monitor</h1>
              <div className="gold-rule w-14 mt-2" />
            </div>
            <div className="flex items-center gap-3">
              {/* Filters */}
              {(['all','stale','blocked'] as const).map(f => (
                <motion.button key={f} whileTap={{ scale: 0.96 }} onClick={() => setFilter(f)}
                  className="nav-label text-[0.6rem] px-3 py-1.5 rounded-sm transition-all duration-200"
                  style={{
                    background: filter === f ? 'rgba(201,168,76,0.15)' : 'transparent',
                    border: `1px solid ${filter === f ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.12)'}`,
                    color: filter === f ? '#c9a84c' : 'rgba(184,212,240,0.4)',
                  }}>{f.toUpperCase()}</motion.button>
              ))}
              {isAdmin && (
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowCreate(true)}
                  className="btn-gold px-4 py-1.5 rounded-sm flex items-center gap-1.5 text-[0.65rem]">
                  <Plus size={12} />NEW TASK
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Summary pills */}
          <div className="flex gap-4 mb-6">
            {[
              { label: 'Total',     val: tasks.length,                         c: '#c9a84c' },
              { label: 'Stale',     val: tasks.filter(t => t.isStale).length,  c: '#f59e0b' },
              { label: 'Blocked',   val: tasks.filter(t => t.blocker).length,  c: '#f87171' },
              { label: 'Completed', val: tasks.filter(t => t.status === 'completed').length, c: '#4ade80' },
            ].map(p => (
              <motion.div key={p.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-4 py-2 rounded-sm"
                style={{ background: `${p.c}0d`, border: `1px solid ${p.c}25` }}>
                <span className="font-display font-black text-lg" style={{ color: p.c }}>{p.val}</span>
                <span className="nav-label text-[0.55rem] text-ice/40">{p.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Task list */}
          <div className="space-y-3">
            {filtered.map((task, i) => {
              const pct = statusPct(task.status)
              const isOpen = expanded === task.id
              const isOverdue = task.deadline ? task.deadline < new Date().toISOString().split('T')[0] : false
              const skill = task.skill || 'Backend'

              return (
                <motion.div key={task.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }} className="glass-card rounded-sm overflow-hidden"
                  style={{ borderColor: task.isStale ? 'rgba(245,158,11,0.25)' : task.blocker ? 'rgba(248,113,113,0.2)' : undefined }}>
                  <motion.button className="w-full flex items-center gap-4 px-5 py-4 text-left"
                    onClick={() => setExpanded(isOpen ? null : task.id)}>
                    {/* Radial progress */}
                    <div className="relative flex-shrink-0 w-9 h-9">
                      <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                        <motion.circle cx="18" cy="18" r="15" fill="none"
                          stroke={pct === 100 ? '#4ade80' : '#c9a84c'} strokeWidth="2.5"
                          strokeDasharray={`${2 * Math.PI * 15}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 15 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 15 * (1 - pct / 100) }}
                          transition={{ duration: 1, delay: i * 0.1 + 0.2 }} strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center font-ui font-bold text-[0.55rem] text-ice/60">{pct}%</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[0.6rem] text-gold/40">{task.id || task.planeTaskId}</span>
                        <span className="nav-label text-[0.5rem] px-1.5 py-0.5 rounded-sm"
                          style={{ background: `${SKILL_COLORS[skill] || '#c9a84c'}15`, color: SKILL_COLORS[skill] || '#c9a84c' }}>
                          {skill.toUpperCase()}
                        </span>
                        {task.isStale && <span className="nav-label text-[0.5rem] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-sm flex items-center gap-1"><Clock size={8} />STALE</span>}
                        {task.blocker && <span className="nav-label text-[0.5rem] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-sm flex items-center gap-1"><Flag size={8} />BLOCKED</span>}
                      </div>
                      <p className="font-body text-sm text-frost/85 truncate">{task.title}</p>
                    </div>

                    <div className="flex-shrink-0 text-right hidden sm:block">
                      <p className="nav-label text-[0.55rem] text-ice/40">{(task.assignee || '').split(' ')[0]}</p>
                      <p className="nav-label text-[0.5rem]" style={{ color: isOverdue ? '#f87171' : 'rgba(184,212,240,0.3)' }}>
                        {isOverdue ? 'OVERDUE' : task.deadline || '—'}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-2 text-ice/30">
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </motion.button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                        style={{ borderTop: '1px solid rgba(201,168,76,0.08)', overflow: 'hidden' }}>
                        <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-5">
                          <div>
                            <p className="nav-label text-[0.5rem] text-gold/40 mb-1">ASSIGNEE</p>
                            <p className="font-body text-sm text-frost/80">{task.assignee || '—'}</p>
                          </div>
                          <div>
                            <p className="nav-label text-[0.5rem] text-gold/40 mb-1">STATUS</p>
                            <p className="font-body text-sm text-frost/80">{task.status?.replace(/_/g, ' ')}</p>
                          </div>
                          <div>
                            <p className="nav-label text-[0.5rem] text-gold/40 mb-1">COMPLEXITY</p>
                            <div className="flex gap-0.5 mt-1">
                              {[0.2,0.4,0.6,0.8,1.0].map(n => (
                                <div key={n} className="w-3 h-3 rounded-sm"
                                  style={{ background: n <= task.complexity ? 'rgba(201,168,76,0.7)' : 'rgba(255,255,255,0.06)' }} />
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="nav-label text-[0.5rem] text-gold/40 mb-1">DEADLINE</p>
                            <p className="font-body text-sm" style={{ color: isOverdue ? '#f87171' : 'rgba(232,240,251,0.6)' }}>
                              {task.deadline || '—'}
                            </p>
                          </div>
                        </div>
                        {task.note && (
                          <div className="px-5 pb-4">
                            <p className="nav-label text-[0.5rem] text-gold/40 mb-2">PROGRESS NOTE</p>
                            <p className="font-body text-sm text-ice/50 italic">"{task.note}"</p>
                          </div>
                        )}
                        {task.blocker && (
                          <div className="px-5 pb-4">
                            <div className="flex items-center gap-2 p-3 rounded-sm"
                              style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)' }}>
                              <AlertOctagon size={13} className="text-red-400 flex-shrink-0" />
                              <p className="font-body text-sm text-red-300/80">Blocker: <strong>{task.blocker}</strong></p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        </div>
      </main>

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(7,8,15,0.85)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
              className="glass-card rounded-sm p-8 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="nav-label text-[0.55rem] text-gold/40 mb-0.5">ADMIN ACTION</p>
                  <h2 className="font-display text-xl text-frost">Create New Task</h2>
                </div>
                <button onClick={() => setShowCreate(false)} className="text-ice/30 hover:text-frost transition-colors">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">TASK TITLE</label>
                  <input className="uris-input" placeholder="e.g. Implement credibility analyzer"
                    value={newTask.title} onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">INTERN ID</label>
                  <input className="uris-input" placeholder="Intern's user ID"
                    value={newTask.internId} onChange={e => setNewTask(f => ({ ...f, internId: e.target.value }))} required />
                </div>
                <div>
                  <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">COMPLEXITY (0–1)</label>
                  <input type="number" min="0" max="1" step="0.1" className="uris-input"
                    value={newTask.complexity} onChange={e => setNewTask(f => ({ ...f, complexity: e.target.value }))} required />
                </div>
                <div>
                  <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">PLANE TASK ID (optional)</label>
                  <input className="uris-input" placeholder="plane-task-123"
                    value={newTask.planeTaskId} onChange={e => setNewTask(f => ({ ...f, planeTaskId: e.target.value }))} />
                </div>
                {createError && (
                  <p className="font-body text-sm text-red-400/80 text-center py-2 rounded-sm"
                    style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    {createError}
                  </p>
                )}
                <div className="flex gap-3 pt-2">
                  <motion.button type="submit" disabled={creating} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="btn-gold flex-1 py-3 rounded-sm disabled:opacity-50">
                    {creating ? 'CREATING...' : 'CREATE TASK'}
                  </motion.button>
                  <motion.button type="button" whileHover={{ scale: 1.02 }} onClick={() => setShowCreate(false)}
                    className="btn-outline px-5 rounded-sm">
                    CANCEL
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
