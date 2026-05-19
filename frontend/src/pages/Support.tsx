/**
 * Support.tsx — Phase 5
 *
 * Intern-facing contact/query form.
 * Allows interns to reach operations, admins, and leads for:
 *   - Technical issues
 *   - Access problems
 *   - Emergencies
 *   - Task blockers
 *   - HR/Operations concerns
 *   - Infrastructure issues
 *   - General queries
 *
 * Preserves existing design system — no redesign.
 * Internal notes are NEVER shown here — backend enforces this.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Check, Loader2, AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import Sidebar   from '../components/Sidebar'
import Starfield from '../components/Starfield'
import {
  submitSupportRequest,
  getMyRequests,
  type SupportRequest,
  type SupportPriority,
  type SupportCategory,
  CATEGORY_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from '../services/support.service'
import { extractErrorMessage } from '../services/error'

// ── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: SupportPriority; label: string }[] = [
  { value: 'LOW',      label: 'Low'      },
  { value: 'MEDIUM',   label: 'Medium'   },
  { value: 'HIGH',     label: 'High'     },
  { value: 'URGENT',   label: 'Urgent'   },
  { value: 'CRITICAL', label: 'Critical' },
]

const CATEGORY_OPTIONS: { value: SupportCategory; desc: string }[] = [
  { value: 'TECHNICAL_ISSUE', desc: 'Bug, error, or technical failure' },
  { value: 'ACCESS_PROBLEM',  desc: 'Cannot access a system or resource' },
  { value: 'EMERGENCY',       desc: 'Urgent situation requiring immediate attention' },
  { value: 'TASK_BLOCKER',    desc: 'Something is preventing task progress' },
  { value: 'HR_OPERATIONS',   desc: 'HR, payroll, or operational concern' },
  { value: 'INFRASTRUCTURE',  desc: 'Server, network, or tooling issue' },
  { value: 'GENERAL',         desc: 'General question or communication' },
  { value: 'OTHER',           desc: 'Anything not covered above' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function Support() {
  const [subject,   setSubject]   = useState('')
  const [message,   setMessage]   = useState('')
  const [priority,  setPriority]  = useState<SupportPriority>('MEDIUM')
  const [category,  setCategory]  = useState<SupportCategory>('GENERAL')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [submitted, setSubmitted] = useState(false)

  const [myRequests,        setMyRequests]        = useState<SupportRequest[]>([])
  const [requestsLoading,   setRequestsLoading]   = useState(true)
  const [expandedId,        setExpandedId]        = useState<string | null>(null)
  const [refreshing,        setRefreshing]        = useState(false)

  const loadRequests = async (silent = false): Promise<void> => {
    if (!silent) setRequestsLoading(true)
    else setRefreshing(true)
    try {
      const data = await getMyRequests()
      setMyRequests(data)
    } catch {
      // non-fatal
    } finally {
      setRequestsLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { void loadRequests() }, [submitted])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!subject.trim()) { setError('Subject is required.'); return }
    if (!message.trim()) { setError('Message is required.'); return }
    setLoading(true)
    setError('')
    try {
      await submitSupportRequest({ subject: subject.trim(), message: message.trim(), priority, category })
      setSubmitted(true)
      setSubject('')
      setMessage('')
      setPriority('MEDIUM')
      setCategory('GENERAL')
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to submit request. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => setSubmitted(false)

  return (
    <div className="min-h-screen bg-navy-950 text-frost">
      <Starfield />
      <Sidebar />
      <main className="md:ml-52 pt-14 min-h-screen relative z-10">
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="nav-label text-[0.55rem] text-gold/40 tracking-ultra mb-1">CONTACT OPERATIONS</p>
            <h1 className="font-display font-black text-3xl text-ice-gradient">Support Request</h1>
            <div className="gold-rule w-14 mt-2" />
            <p className="font-body text-sm text-ice/40 mt-3">
              Reach operations, admins, or leads for blockers, concerns, or emergencies.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {/* ── Success state ── */}
            {submitted ? (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="glass-card rounded-sm p-10 text-center mb-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)' }}>
                  <Check size={24} className="text-signal" />
                </motion.div>
                <h2 className="font-display text-2xl text-frost mb-2">Request Submitted</h2>
                <p className="font-body text-sm text-ice/40 mb-6">
                  Your request has been received. An admin or lead will respond shortly.
                </p>
                <motion.button whileHover={{ scale: 1.02 }} onClick={resetForm}
                  className="btn-outline px-6 py-2 rounded-sm">
                  SUBMIT ANOTHER REQUEST
                </motion.button>
              </motion.div>
            ) : (
              /* ── Form ── */
              <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onSubmit={handleSubmit} className="space-y-5">

                {/* Category */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }} className="glass-card rounded-sm p-6">
                  <p className="nav-label text-[0.6rem] text-gold/60 mb-4">CATEGORY</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CATEGORY_OPTIONS.map(opt => (
                      <motion.button key={opt.value} type="button"
                        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                        onClick={() => setCategory(opt.value)}
                        className="text-left p-3 rounded-sm transition-all duration-200"
                        style={{
                          background: category === opt.value ? 'rgba(201,168,76,0.1)' : 'rgba(13,15,28,0.6)',
                          border: `1px solid ${category === opt.value ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.08)'}`,
                        }}>
                        <p className="nav-label text-[0.58rem]"
                          style={{ color: category === opt.value ? '#c9a84c' : 'rgba(184,212,240,0.5)' }}>
                          {CATEGORY_LABELS[opt.value]}
                        </p>
                        <p className="font-body text-xs mt-0.5"
                          style={{ color: 'rgba(184,212,240,0.28)' }}>
                          {opt.desc}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Priority */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }} className="glass-card rounded-sm p-6">
                  <p className="nav-label text-[0.6rem] text-gold/60 mb-4">PRIORITY</p>
                  <div className="grid grid-cols-5 gap-2">
                    {PRIORITY_OPTIONS.map(opt => {
                      const c = PRIORITY_COLORS[opt.value]
                      return (
                        <motion.button key={opt.value} type="button"
                          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                          onClick={() => setPriority(opt.value)}
                          className="py-3 rounded-sm flex flex-col items-center gap-1 transition-all duration-200"
                          style={{
                            background: priority === opt.value ? `${c}18` : 'rgba(13,15,28,0.6)',
                            border: `1px solid ${priority === opt.value ? `${c}55` : 'rgba(201,168,76,0.08)'}`,
                          }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                          <span className="nav-label text-[0.5rem]"
                            style={{ color: priority === opt.value ? c : 'rgba(184,212,240,0.3)' }}>
                            {opt.label.toUpperCase()}
                          </span>
                        </motion.button>
                      )
                    })}
                  </div>
                  {priority === 'CRITICAL' && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="nav-label text-[0.5rem] mt-3 flex items-center gap-1.5"
                      style={{ color: '#ef4444' }}>
                      <AlertTriangle size={10} />
                      CRITICAL priority is for life-safety or system-down emergencies only.
                    </motion.p>
                  )}
                </motion.div>

                {/* Subject */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }} className="glass-card rounded-sm p-6">
                  <label className="nav-label text-[0.6rem] text-gold/60 block mb-3">
                    SUBJECT <span className="text-ice/25">(MAX 120 CHARS)</span>
                  </label>
                  <input
                    type="text"
                    className="uris-input"
                    placeholder="Brief summary of your request..."
                    maxLength={120}
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    required
                  />
                  <p className="nav-label text-[0.5rem] text-ice/25 text-right mt-1">{subject.length}/120</p>
                </motion.div>

                {/* Message */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }} className="glass-card rounded-sm p-6">
                  <label className="nav-label text-[0.6rem] text-gold/60 block mb-3">
                    MESSAGE <span className="text-ice/25">(MAX 2000 CHARS)</span>
                  </label>
                  <textarea
                    className="uris-input resize-none"
                    rows={5}
                    maxLength={2000}
                    placeholder="Describe your issue, blocker, or concern in detail. Include any relevant task IDs, error messages, or context..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                  />
                  <p className="nav-label text-[0.5rem] text-ice/25 text-right mt-1">{message.length}/2000</p>
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
                  className="btn-gold w-full py-4 rounded-sm text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />SUBMITTING...</>
                    : <><MessageSquare size={14} />SUBMIT REQUEST</>}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* ── Request History ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }} className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-[1px] flex-1 bg-white/[0.06]" />
              <p className="nav-label text-[0.5rem] text-ice/25">YOUR REQUESTS</p>
              <div className="h-[1px] flex-1 bg-white/[0.06]" />
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => loadRequests(true)}
                disabled={refreshing}
                className="text-ice/30 hover:text-ice/60 transition-colors disabled:opacity-30"
                aria-label="Refresh requests">
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              </motion.button>
            </div>

            {requestsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="text-gold/40 animate-spin" />
              </div>
            ) : myRequests.length === 0 ? (
              <div className="glass-card rounded-sm p-8 text-center">
                <MessageSquare size={24} className="text-gold/20 mx-auto mb-2" />
                <p className="font-body text-sm text-ice/25">No requests submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myRequests.map((req, i) => {
                  const statusColor   = STATUS_COLORS[req.status]
                  const priorityColor = PRIORITY_COLORS[req.priority]
                  return (
                    <motion.div key={req.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="glass-card rounded-sm overflow-hidden"
                      style={{ borderColor: req.priority === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : undefined }}>
                      <button
                        onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
                        {/* Priority dot */}
                        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                          style={{ background: priorityColor }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="nav-label text-[0.5rem] px-1.5 py-0.5 rounded-sm"
                              style={{ background: `${statusColor}15`, color: statusColor }}>
                              {req.status.replace('_', ' ')}
                            </span>
                            <span className="nav-label text-[0.48rem] text-ice/30">
                              {CATEGORY_LABELS[req.category] ?? req.category}
                            </span>
                            <span className="nav-label text-[0.45rem] text-ice/20 ml-auto">
                              {new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <p className="font-body text-sm text-frost/70 truncate">{req.subject}</p>
                          {req.assignedTo && (
                            <p className="nav-label text-[0.48rem] text-ice/30 mt-0.5">
                              Assigned to: {req.assignedTo}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-ice/30 mt-1">
                          {expandedId === req.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </div>
                      </button>
                      <AnimatePresence>
                        {expandedId === req.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
                            <div className="px-4 py-4 space-y-3">
                              {req.message && (
                                <div>
                                  <p className="nav-label text-[0.5rem] text-gold/40 mb-1">YOUR MESSAGE</p>
                                  <p className="font-body text-sm text-ice/50 leading-relaxed whitespace-pre-wrap">
                                    {req.message}
                                  </p>
                                </div>
                              )}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2"
                                style={{ borderTop: '1px solid rgba(201,168,76,0.06)' }}>
                                <div>
                                  <p className="nav-label text-[0.48rem] text-gold/30 mb-0.5">PRIORITY</p>
                                  <p className="nav-label text-[0.55rem]"
                                    style={{ color: priorityColor }}>{req.priority}</p>
                                </div>
                                <div>
                                  <p className="nav-label text-[0.48rem] text-gold/30 mb-0.5">STATUS</p>
                                  <p className="nav-label text-[0.55rem]"
                                    style={{ color: statusColor }}>{req.status.replace('_', ' ')}</p>
                                </div>
                                {req.resolvedAt && (
                                  <div>
                                    <p className="nav-label text-[0.48rem] text-gold/30 mb-0.5">RESOLVED</p>
                                    <p className="nav-label text-[0.55rem] text-green-400/70">
                                      {new Date(req.resolvedAt).toLocaleDateString('en-GB')}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Branding */}
          <div className="mt-12 py-8 flex flex-col items-center gap-4 opacity-40">
            <div className="h-[1px] w-12 bg-gold/20" />
            <span className="font-display font-black text-xs tracking-[0.4em] text-ice-gradient">STEMONEF</span>
            <p className="nav-label text-[0.45rem] tracking-[0.6em] text-ice/30 uppercase">Intelligence Design System</p>
          </div>
        </div>
      </main>
    </div>
  )
}
