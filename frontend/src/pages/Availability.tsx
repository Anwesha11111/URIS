import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Plus, Trash2, Clock } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Starfield from '../components/Starfield'
import { availabilityAPI } from '../api/endpoints'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const REASONS = ['Exam','Revision','Academic Project','Personal','Sprint','Other']
type BusyBlock = { day: string; reason: string; severity: 'full' | 'partial' }

export default function Availability() {
  const [weekStatus, setWeekStatus] = useState<'generally_free'|'heavy_week'>('generally_free')
  const [maxFreeBlockHours, setMaxFreeBlockHours] = useState<number>(3) // 1–6 per backend
  const [busyBlocks, setBusyBlocks] = useState<BusyBlock[]>([])
  const [note, setNote] = useState('')
  const [isExamWeek, setIsExamWeek] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addBlock = () => setBusyBlocks(b => [...b, { day: 'Monday', reason: 'Exam', severity: 'partial' }])
  const removeBlock = (i: number) => setBusyBlocks(b => b.filter((_, idx) => idx !== i))
  const updateBlock = (i: number, field: keyof BusyBlock, val: string) =>
    setBusyBlocks(b => b.map((bl, idx) => idx === i ? { ...bl, [field]: val } : bl))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await availabilityAPI.submit({ weekStatus, busyBlocks, maxFreeBlockHours, isExamWeek, note })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 text-frost">
      <Starfield />
      <Sidebar />
      <main className="ml-52 pt-14 min-h-screen relative z-10">
        <div className="max-w-2xl mx-auto px-8 py-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="nav-label text-[0.55rem] text-gold/40 tracking-ultra mb-1">WEEKLY SUBMISSION</p>
            <h1 className="font-display font-black text-3xl text-ice-gradient">Availability Declaration</h1>
            <div className="gold-rule w-14 mt-2" />
            <p className="font-body text-sm text-ice/40 mt-3">Complete in under 60 seconds. Deadline: Monday 11 AM.</p>
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
                <h2 className="font-display text-2xl text-frost mb-2">Availability Submitted</h2>
                <p className="font-body text-sm text-ice/40 mb-6">Your declaration has been received and processed by the middleware.</p>
                <div className="glass-card rounded-sm p-4 text-left mb-6">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Week Status', weekStatus === 'generally_free' ? 'Generally Free' : 'Heavy Week'],
                      ['Max Free Block', `${maxFreeBlockHours} hour${maxFreeBlockHours !== 1 ? 's' : ''}`],
                      ['Busy Blocks', `${busyBlocks.length} declared`],
                      ['Exam Week', isExamWeek ? 'Yes — −30 applied' : 'No'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="nav-label text-[0.5rem] text-gold/40">{k}</p>
                        <p className="font-body text-sm text-frost/80">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} onClick={() => setSubmitted(false)}
                  className="btn-outline px-6 py-2 rounded-sm">
                  SUBMIT ANOTHER WEEK
                </motion.button>
              </motion.div>
            ) : (
              <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onSubmit={handleSubmit} className="space-y-5">

                {/* Week status */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }} className="glass-card rounded-sm p-6">
                  <p className="nav-label text-[0.6rem] text-gold/60 mb-4">WEEK STATUS</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['generally_free', 'heavy_week'] as const).map(s => (
                      <motion.button key={s} type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => setWeekStatus(s)}
                        className="py-4 rounded-sm flex flex-col items-center gap-2 transition-all duration-300"
                        style={{
                          background: weekStatus === s ? (s === 'generally_free' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)') : 'rgba(13,15,28,0.6)',
                          border: `1px solid ${weekStatus === s ? (s === 'generally_free' ? '#4ade8055' : '#f8717155') : 'rgba(201,168,76,0.12)'}`,
                          color: weekStatus === s ? (s === 'generally_free' ? '#4ade80' : '#f87171') : 'rgba(184,212,240,0.35)',
                        }}>
                        {s === 'generally_free' ? <Check size={16} /> : <Clock size={16} />}
                        <span className="nav-label text-[0.65rem]">
                          {s === 'generally_free' ? 'GENERALLY FREE' : 'HEAVY WEEK'}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                  {/* Exam toggle */}
                  <div className="flex items-center justify-between mt-4 pt-4"
                    style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}>
                    <div>
                      <p className="font-ui font-semibold text-sm text-frost/70">Exam Week</p>
                      <p className="font-body text-xs text-ice/30">Applies −30 to CapacityScore</p>
                    </div>
                    <motion.button type="button" whileTap={{ scale: 0.95 }}
                      onClick={() => setIsExamWeek(!isExamWeek)}
                      className="w-12 h-6 rounded-full relative transition-colors duration-300"
                      style={{ background: isExamWeek ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)' }}>
                      <motion.div animate={{ x: isExamWeek ? 24 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-1 w-4 h-4 rounded-full"
                        style={{ background: isExamWeek ? '#c9a84c' : '#4a5568' }} />
                    </motion.button>
                  </div>
                </motion.div>

                {/* Max free block — 1 to 6 per backend validation */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }} className="glass-card rounded-sm p-6">
                  <p className="nav-label text-[0.6rem] text-gold/60 mb-1">MAX CONTINUOUS FREE BLOCK</p>
                  <p className="font-body text-xs text-ice/30 mb-4">Hours of uninterrupted availability</p>
                  <div className="grid grid-cols-6 gap-2">
                    {[1,2,3,4,5,6].map(h => (
                      <motion.button key={h} type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setMaxFreeBlockHours(h)}
                        className="py-3 rounded-sm flex flex-col items-center gap-0.5 transition-all duration-300"
                        style={{
                          background: maxFreeBlockHours === h ? 'rgba(201,168,76,0.12)' : 'rgba(13,15,28,0.6)',
                          border: `1px solid ${maxFreeBlockHours === h ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.1)'}`,
                        }}>
                        <span className="font-display font-black text-xl"
                          style={{ color: maxFreeBlockHours === h ? '#c9a84c' : 'rgba(184,212,240,0.3)' }}>{h}</span>
                        <span className="nav-label text-[0.5rem] text-ice/30">HR</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Busy blocks */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }} className="glass-card rounded-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="nav-label text-[0.6rem] text-gold/60">BUSY BLOCKS</p>
                    <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={addBlock}
                      className="flex items-center gap-1.5 nav-label text-[0.6rem] text-gold/70 hover:text-gold transition-colors">
                      <Plus size={12} />ADD BLOCK
                    </motion.button>
                  </div>
                  <AnimatePresence>
                    {busyBlocks.length === 0 ? (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="font-body text-sm text-ice/25 text-center py-4">
                        No busy blocks — all days marked available
                      </motion.p>
                    ) : (
                      <div className="space-y-3">
                        {busyBlocks.map((block, i) => (
                          <motion.div key={i} initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="grid grid-cols-12 gap-2 items-center">
                            <select value={block.day} onChange={e => updateBlock(i, 'day', e.target.value)}
                              className="uris-input col-span-4 text-sm">
                              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select value={block.reason} onChange={e => updateBlock(i, 'reason', e.target.value)}
                              className="uris-input col-span-4 text-sm">
                              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <select value={block.severity} onChange={e => updateBlock(i, 'severity', e.target.value as 'full'|'partial')}
                              className="uris-input col-span-3 text-sm">
                              <option value="partial">Partial</option>
                              <option value="full">Full Day</option>
                            </select>
                            <motion.button type="button" whileHover={{ scale: 1.1 }} onClick={() => removeBlock(i)}
                              className="col-span-1 flex justify-center text-red-400/50 hover:text-red-400 transition-colors">
                              <Trash2 size={13} />
                            </motion.button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Note */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }} className="glass-card rounded-sm p-6">
                  <p className="nav-label text-[0.6rem] text-gold/60 mb-3">OPTIONAL NOTE <span className="text-ice/25">(140 CHARS MAX)</span></p>
                  <textarea className="uris-input resize-none" rows={2} maxLength={140}
                    placeholder="Any additional context for this week..."
                    value={note} onChange={e => setNote(e.target.value)} />
                  <p className="nav-label text-[0.5rem] text-ice/25 text-right mt-1">{note.length}/140</p>
                </motion.div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="font-body text-sm text-red-400/80 text-center py-3 rounded-sm"
                    style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    {error}
                  </motion.p>
                )}

                <motion.button type="submit" disabled={loading}
                  whileHover={!loading ? { scale: 1.02, boxShadow: '0 12px 32px rgba(201,168,76,0.25)' } : {}}
                  whileTap={!loading ? { scale: 0.98 } : {}}
                  className="btn-gold w-full py-4 rounded-sm text-sm disabled:opacity-50"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  {loading ? 'SUBMITTING...' : 'SUBMIT WEEKLY AVAILABILITY'}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
