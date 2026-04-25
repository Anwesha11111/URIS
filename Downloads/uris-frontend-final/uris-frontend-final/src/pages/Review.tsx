import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Check, ChevronDown } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Starfield from '../components/Starfield'
import { performanceAPI, tasksAPI } from '../api/endpoints'

type RatingDim = { label: string; key: 'quality' | 'timeliness' | 'initiative'; weight: number; desc: string }

const DIMS: RatingDim[] = [
  { label: 'Quality',     key: 'quality',     weight: 0.5, desc: 'Did the deliverable meet acceptance criteria?' },
  { label: 'Timeliness',  key: 'timeliness',  weight: 0.3, desc: 'Was the task completed on or before deadline?' },
  { label: 'Initiative',  key: 'initiative',  weight: 0.2, desc: 'Did the intern work autonomously without guidance?' },
]

const MOCK_COMPLETED = [
  { id: 'T004', title: 'Review System — RPI Rolling Average',  internId: '4', assignee: 'Priya Verma' },
  { id: 'T007', title: 'Nextcloud Forms Integration',          internId: '1', assignee: 'Ananya Seeta' },
  { id: 'T008', title: 'Alert System SMTP Setup',              internId: '6', assignee: 'Meghna Das'  },
]

export default function Review() {
  const [completedTasks, setCompletedTasks] = useState(MOCK_COMPLETED)
  const [selectedTask, setSelectedTask] = useState<typeof MOCK_COMPLETED[0] | null>(null)
  const [ratings, setRatings] = useState<Record<string, number>>({ quality: 0, timeliness: 0, initiative: 0 })
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dropOpen, setDropOpen] = useState(false)

  useEffect(() => {
    tasksAPI.getAll()
      .then(res => {
        const done = res.data?.filter((t: any) => t.status === 'completed')
        if (done?.length) setCompletedTasks(done)
      })
      .catch(() => {})
  }, [])

  const pps = ratings.quality * 0.5 + ratings.timeliness * 0.3 + ratings.initiative * 0.2

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask) return
    if (Object.values(ratings).some(v => v === 0)) { setError('Please rate all three dimensions.'); return }
    setLoading(true)
    setError('')
    try {
      await performanceAPI.submitReview({
        internId: selectedTask.internId,
        taskId: selectedTask.id,
        quality: ratings.quality,
        timeliness: ratings.timeliness,
        initiative: ratings.initiative,
        note,
      })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setSubmitted(false)
    setSelectedTask(null)
    setRatings({ quality: 0, timeliness: 0, initiative: 0 })
    setNote('')
    setError('')
  }

  return (
    <div className="min-h-screen bg-navy-950 text-frost">
      <Starfield />
      <Sidebar />
      <main className="ml-52 pt-14 min-h-screen relative z-10">
        <div className="max-w-2xl mx-auto px-8 py-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="nav-label text-[0.55rem] text-gold/40 tracking-ultra mb-1">PERFORMANCE SYSTEM</p>
            <h1 className="font-display font-black text-3xl text-ice-gradient">Task Review</h1>
            <div className="gold-rule w-14 mt-2" />
            <p className="font-body text-sm text-ice/40 mt-3">
              Formula: Performance = 0.5 × Quality + 0.3 × Timeliness + 0.2 × Initiative
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="glass-card rounded-sm p-10 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}>
                  <Check size={24} className="text-signal" />
                </motion.div>
                <h2 className="font-display text-2xl text-frost mb-2">Review Submitted</h2>
                <p className="font-body text-sm text-ice/40 mb-6">Performance Index has been updated for {selectedTask?.assignee}.</p>
                <div className="glass-card rounded-sm p-5 mb-6">
                  <p className="nav-label text-[0.5rem] text-gold/40 mb-2">PERFORMANCE SCORE (PPS)</p>
                  <p className="font-display font-black text-5xl text-gold">{pps.toFixed(2)}</p>
                  <p className="font-body text-xs text-ice/30 mt-1">out of 5.00</p>
                  <div className="progress-bar mt-3">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(pps / 5) * 100}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                      style={{ height: '100%', background: 'linear-gradient(90deg, #c9a84c88, #c9a84c)', borderRadius: 2 }} />
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {DIMS.map(d => (
                      <div key={d.key} className="text-center">
                        <p className="nav-label text-[0.5rem] text-gold/40">{d.label.toUpperCase()}</p>
                        <p className="font-display font-black text-xl text-frost">{ratings[d.key]}<span className="text-ice/30 text-sm">/5</span></p>
                      </div>
                    ))}
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} onClick={reset} className="btn-outline px-6 py-2 rounded-sm">
                  REVIEW ANOTHER TASK
                </motion.button>
              </motion.div>
            ) : (
              <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onSubmit={handleSubmit} className="space-y-5">

                {/* Task selector */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }} className="glass-card rounded-sm p-6">
                  <p className="nav-label text-[0.6rem] text-gold/60 mb-3">SELECT COMPLETED TASK</p>
                  <div className="relative">
                    <button type="button" onClick={() => setDropOpen(!dropOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-sm transition-all"
                      style={{ background: 'rgba(13,15,28,0.8)', border: '1px solid rgba(201,168,76,0.2)' }}>
                      <span className="font-body text-sm text-frost/70">
                        {selectedTask ? `${selectedTask.title} — ${selectedTask.assignee}` : 'Choose a completed task...'}
                      </span>
                      <ChevronDown size={14} className="text-gold/50" />
                    </button>
                    <AnimatePresence>
                      {dropOpen && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full left-0 right-0 z-20 glass-card rounded-sm mt-1 overflow-hidden">
                          {completedTasks.map(t => (
                            <button key={t.id} type="button"
                              onClick={() => { setSelectedTask(t); setDropOpen(false) }}
                              className="w-full text-left px-4 py-3 transition-colors hover:bg-gold/5"
                              style={{ borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
                              <p className="font-body text-sm text-frost/80">{t.title}</p>
                              <p className="nav-label text-[0.5rem] text-gold/40 mt-0.5">{t.assignee}</p>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Rating dimensions */}
                {DIMS.map((dim, di) => (
                  <motion.div key={dim.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + di * 0.1 }} className="glass-card rounded-sm p-6">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="nav-label text-[0.6rem] text-gold/60">{dim.label.toUpperCase()}</p>
                        <p className="font-body text-xs text-ice/35 mt-0.5">{dim.desc}</p>
                      </div>
                      <span className="nav-label text-[0.55rem] text-gold/30">WEIGHT {(dim.weight * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex gap-3 mt-4">
                      {[1,2,3,4,5].map(n => (
                        <motion.button key={n} type="button" whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                          onClick={() => setRatings(r => ({ ...r, [dim.key]: n }))}
                          className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-sm transition-all duration-200"
                          style={{
                            background: ratings[dim.key] >= n ? 'rgba(201,168,76,0.12)' : 'rgba(13,15,28,0.6)',
                            border: `1px solid ${ratings[dim.key] >= n ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.08)'}`,
                          }}>
                          <Star size={16} fill={ratings[dim.key] >= n ? '#c9a84c' : 'none'}
                            style={{ color: ratings[dim.key] >= n ? '#c9a84c' : 'rgba(184,212,240,0.2)' }} />
                          <span className="nav-label text-[0.5rem]"
                            style={{ color: ratings[dim.key] >= n ? '#c9a84c' : 'rgba(184,212,240,0.2)' }}>{n}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ))}

                {/* Live PPS preview */}
                {Object.values(ratings).some(v => v > 0) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="glass-card rounded-sm p-5"
                    style={{ border: '1px solid rgba(201,168,76,0.2)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="nav-label text-[0.6rem] text-gold/60">PERFORMANCE SCORE PREVIEW</p>
                      <p className="font-display font-black text-2xl text-gold">{pps.toFixed(2)}<span className="text-ice/30 text-sm font-body font-normal">/5</span></p>
                    </div>
                    <div className="progress-bar">
                      <motion.div animate={{ width: `${(pps / 5) * 100}%` }} transition={{ duration: 0.4 }}
                        style={{ height: '100%', background: 'linear-gradient(90deg, #c9a84c88, #c9a84c)', borderRadius: 2 }} />
                    </div>
                    <p className="font-body text-xs text-ice/30 mt-2">= 0.5 × {ratings.quality} + 0.3 × {ratings.timeliness} + 0.2 × {ratings.initiative}</p>
                  </motion.div>
                )}

                {/* Note */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }} className="glass-card rounded-sm p-6">
                  <p className="nav-label text-[0.6rem] text-gold/60 mb-3">REVIEW NOTES (OPTIONAL)</p>
                  <textarea className="uris-input resize-none" rows={2}
                    placeholder="Any qualitative feedback on this task..."
                    value={note} onChange={e => setNote(e.target.value)} />
                </motion.div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="font-body text-sm text-red-400/80 text-center py-2 rounded-sm"
                    style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    {error}
                  </motion.p>
                )}

                <motion.button type="submit" disabled={loading || !selectedTask}
                  whileHover={!loading && selectedTask ? { scale: 1.02, boxShadow: '0 12px 32px rgba(201,168,76,0.25)' } : {}}
                  whileTap={!loading && selectedTask ? { scale: 0.98 } : {}}
                  className="btn-gold w-full py-4 rounded-sm text-sm disabled:opacity-40"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                  {loading ? 'SUBMITTING REVIEW...' : 'SUBMIT PERFORMANCE REVIEW'}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
