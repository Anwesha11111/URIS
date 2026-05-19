/**
 * SupportAdmin.tsx — Phase 5
 *
 * Admin/Lead request management dashboard.
 * Features: filtering, assignment, status lifecycle, internal notes, detail view.
 * Internal notes are NEVER shown to interns — backend enforces this.
 *
 * Preserves existing design system — no redesign.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Loader2, AlertTriangle, ChevronDown, ChevronUp,
  Check, UserCheck, FileText, X, RefreshCw,
} from 'lucide-react'
import Sidebar   from '../components/Sidebar'
import Starfield from '../components/Starfield'
import {
  getAllRequests,
  getRequestById,
  assignRequest,
  updateRequestStatus,
  updateInternalNotes,
  type AdminSupportRequest,
  type SupportStatus,
  type SupportPriority,
  type SupportCategory,
  CATEGORY_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from '../services/support.service'
import { useAuthStore, selectUser } from '../store/authStore'
import { extractErrorMessage } from '../services/error'

// ── Status transition map (mirrors backend) ───────────────────────────────────
const STATUS_TRANSITIONS: Record<SupportStatus, SupportStatus[]> = {
  OPEN:        ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED'],
  RESOLVED:    ['CLOSED'],
  CLOSED:      [],
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SupportAdmin() {
  const user = useAuthStore(selectUser)

  const [requests,   setRequests]   = useState<AdminSupportRequest[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Detail view state
  const [detailId,      setDetailId]      = useState<string | null>(null)
  const [detail,        setDetail]        = useState<AdminSupportRequest | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Filters
  const [statusFilter,   setStatusFilter]   = useState<SupportStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<SupportPriority | ''>('')
  const [categoryFilter, setCategoryFilter] = useState<SupportCategory | ''>('')

  // Action state
  const [actionId,      setActionId]      = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg,     setActionMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  // Internal notes editing
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [notesInput,     setNotesInput]     = useState('')
  const [notesSaving,    setNotesSaving]    = useState(false)

  const fetchRequests = useCallback(async (silent = false): Promise<void> => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError('')
    try {
      const result = await getAllRequests({
        status:   statusFilter   || undefined,
        priority: priorityFilter || undefined,
        category: categoryFilter || undefined,
        page,
        limit: 25,
      })
      setRequests(result.requests)
      setTotal(result.pagination.total)
      setTotalPages(result.pagination.pages)
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load support requests.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, priorityFilter, categoryFilter, page])

  useEffect(() => { void fetchRequests() }, [fetchRequests])

  // Load detail when detailId changes
  useEffect(() => {
    if (!detailId) { setDetail(null); return }
    setDetailLoading(true)
    getRequestById(detailId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false))
  }, [detailId])

  const handleAssign = async (id: string) => {
    setActionId(id)
    setActionLoading(true)
    setActionMsg(null)
    try {
      await assignRequest(id, user?.id)
      setActionMsg({ ok: true, text: 'Assigned to you.' })
      void fetchRequests(true)
      if (detailId === id) setDetailId(id) // refresh detail
    } catch (err: unknown) {
      setActionMsg({ ok: false, text: extractErrorMessage(err, 'Assignment failed.') })
    } finally {
      setActionLoading(false)
      setActionId(null)
    }
  }

  const handleStatusUpdate = async (id: string, status: SupportStatus) => {
    setActionId(id)
    setActionLoading(true)
    setActionMsg(null)
    try {
      await updateRequestStatus(id, status)
      setActionMsg({ ok: true, text: `Status updated to ${status.replace('_', ' ')}.` })
      void fetchRequests(true)
      if (detailId === id) setDetailId(id)
    } catch (err: unknown) {
      setActionMsg({ ok: false, text: extractErrorMessage(err, 'Status update failed.') })
    } finally {
      setActionLoading(false)
      setActionId(null)
    }
  }

  const handleSaveNotes = async (id: string) => {
    setNotesSaving(true)
    try {
      await updateInternalNotes(id, notesInput)
      setActionMsg({ ok: true, text: 'Internal notes saved.' })
      setEditingNotesId(null)
      if (detailId === id) setDetailId(id)
    } catch (err: unknown) {
      setActionMsg({ ok: false, text: extractErrorMessage(err, 'Failed to save notes.') })
    } finally {
      setNotesSaving(false)
    }
  }

  const openNotes = (req: AdminSupportRequest) => {
    setEditingNotesId(req.id)
    setNotesInput(req.internalNotes ?? '')
  }

  return (
    <div className="min-h-screen bg-navy-950 text-frost">
      <Starfield />
      <Sidebar />
      <main className="md:ml-52 pt-14 min-h-screen relative z-10">
        <div className="px-4 md:px-8 py-8 max-w-5xl">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="nav-label text-[0.55rem] text-gold/40 tracking-ultra mb-1">OPERATIONS · SUPPORT</p>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="font-display font-black text-3xl text-ice-gradient">Support Requests</h1>
                <div className="gold-rule w-14 mt-2" />
                <p className="font-body text-sm text-ice/40 mt-2">
                  {total} total request{total !== 1 ? 's' : ''}
                </p>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => fetchRequests(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 nav-label text-[0.55rem] px-3 py-1.5 rounded-sm transition-all disabled:opacity-40"
                style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#c9a84c' }}>
                <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
                REFRESH
              </motion.button>
            </div>
          </motion.div>

          {/* Action feedback */}
          <AnimatePresence>
            {actionMsg && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 px-4 py-3 rounded-sm font-body text-sm flex items-center justify-between"
                style={{
                  background: actionMsg.ok ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                  border:     `1px solid ${actionMsg.ok ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                  color:      actionMsg.ok ? '#4ade80' : '#f87171',
                }}>
                {actionMsg.text}
                <button onClick={() => setActionMsg(null)} className="opacity-50 hover:opacity-100">
                  <X size={12} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filters */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }} className="glass-card rounded-sm p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="nav-label text-[0.55rem] text-gold/40 block mb-1.5">STATUS</label>
                <select className="uris-input text-sm" value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value as SupportStatus | ''); setPage(1) }}>
                  <option value="">All statuses</option>
                  {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as SupportStatus[]).map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="nav-label text-[0.55rem] text-gold/40 block mb-1.5">PRIORITY</label>
                <select className="uris-input text-sm" value={priorityFilter}
                  onChange={e => { setPriorityFilter(e.target.value as SupportPriority | ''); setPage(1) }}>
                  <option value="">All priorities</option>
                  {(['CRITICAL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'] as SupportPriority[]).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="nav-label text-[0.55rem] text-gold/40 block mb-1.5">CATEGORY</label>
                <select className="uris-input text-sm" value={categoryFilter}
                  onChange={e => { setCategoryFilter(e.target.value as SupportCategory | ''); setPage(1) }}>
                  <option value="">All categories</option>
                  {(Object.keys(CATEGORY_LABELS) as SupportCategory[]).map(c => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
              </div>
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

          {/* Empty */}
          {!loading && !error && requests.length === 0 && (
            <div className="glass-card rounded-sm p-10 text-center">
              <MessageSquare size={28} className="text-gold/20 mx-auto mb-3" />
              <p className="font-body text-sm text-ice/30">No support requests match the current filters.</p>
            </div>
          )}

          {/* Request list */}
          {!loading && !error && requests.length > 0 && (
            <div className="space-y-2">
              {requests.map((req, i) => {
                const statusColor   = STATUS_COLORS[req.status]
                const priorityColor = PRIORITY_COLORS[req.priority]
                const allowedNext   = STATUS_TRANSITIONS[req.status] ?? []
                const isActing      = actionLoading && actionId === req.id

                return (
                  <motion.div key={req.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass-card rounded-sm overflow-hidden"
                    style={{
                      borderColor: req.priority === 'CRITICAL'
                        ? 'rgba(239,68,68,0.3)'
                        : req.priority === 'URGENT'
                          ? 'rgba(248,113,113,0.2)'
                          : undefined,
                    }}>

                    {/* Row header */}
                    <button
                      onClick={() => setExpanded(expanded === req.id ? null : req.id)}
                      className="w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-white/[0.02] transition-colors">
                      <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                        style={{ background: priorityColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="nav-label text-[0.5rem] px-1.5 py-0.5 rounded-sm"
                            style={{ background: `${statusColor}15`, color: statusColor }}>
                            {req.status.replace('_', ' ')}
                          </span>
                          <span className="nav-label text-[0.48rem] text-ice/40">
                            {CATEGORY_LABELS[req.category] ?? req.category}
                          </span>
                          <span className="nav-label text-[0.48rem]"
                            style={{ color: priorityColor }}>
                            {req.priority}
                          </span>
                          {req.internalNotes && (
                            <span className="nav-label text-[0.45rem] text-gold/40 flex items-center gap-0.5">
                              <FileText size={8} />NOTES
                            </span>
                          )}
                          <span className="nav-label text-[0.45rem] text-ice/20 ml-auto">
                            {new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="font-body text-sm text-frost/80 truncate">{req.subject}</p>
                        {req.user && (
                          <p className="nav-label text-[0.48rem] text-ice/30 mt-0.5">
                            {req.user.name || req.user.email} · {req.user.role.replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-ice/30 mt-1">
                        {expanded === req.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {expanded === req.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                          style={{ overflow: 'hidden', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
                          <div className="px-4 py-4 space-y-4">

                            {/* Message */}
                            <div>
                              <p className="nav-label text-[0.5rem] text-gold/40 mb-1.5">MESSAGE</p>
                              <p className="font-body text-sm text-ice/60 leading-relaxed whitespace-pre-wrap">
                                {req.message}
                              </p>
                            </div>

                            {/* Internal notes */}
                            <div style={{ borderTop: '1px solid rgba(201,168,76,0.06)' }} className="pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="nav-label text-[0.5rem] text-gold/40 flex items-center gap-1">
                                  <FileText size={9} />INTERNAL NOTES <span className="text-ice/20">(NOT VISIBLE TO REQUESTER)</span>
                                </p>
                                {editingNotesId !== req.id && (
                                  <motion.button whileTap={{ scale: 0.97 }}
                                    onClick={() => openNotes(req)}
                                    className="nav-label text-[0.5rem] px-2 py-1 rounded-sm transition-all"
                                    style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#c9a84c' }}>
                                    {req.internalNotes ? 'EDIT NOTES' : 'ADD NOTES'}
                                  </motion.button>
                                )}
                              </div>
                              {editingNotesId === req.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    className="uris-input resize-none text-sm"
                                    rows={3}
                                    maxLength={5000}
                                    placeholder="Internal notes for operations team only..."
                                    value={notesInput}
                                    onChange={e => setNotesInput(e.target.value)}
                                  />
                                  <div className="flex gap-2">
                                    <motion.button whileTap={{ scale: 0.97 }} disabled={notesSaving}
                                      onClick={() => handleSaveNotes(req.id)}
                                      className="flex items-center gap-1.5 nav-label text-[0.55rem] px-3 py-1.5 rounded-sm disabled:opacity-50"
                                      style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>
                                      {notesSaving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                                      SAVE
                                    </motion.button>
                                    <motion.button whileTap={{ scale: 0.97 }}
                                      onClick={() => setEditingNotesId(null)}
                                      className="nav-label text-[0.55rem] px-3 py-1.5 rounded-sm"
                                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(184,212,240,0.4)' }}>
                                      CANCEL
                                    </motion.button>
                                  </div>
                                </div>
                              ) : req.internalNotes ? (
                                <p className="font-body text-xs text-ice/40 leading-relaxed whitespace-pre-wrap italic">
                                  {req.internalNotes}
                                </p>
                              ) : (
                                <p className="font-body text-xs text-ice/20 italic">No internal notes.</p>
                              )}
                            </div>

                            {/* Actions */}
                            {allowedNext.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-2"
                                style={{ borderTop: '1px solid rgba(201,168,76,0.06)' }}>
                                {/* Assign to self */}
                                {!req.assignedToId && (
                                  <motion.button whileTap={{ scale: 0.97 }} disabled={isActing}
                                    onClick={() => handleAssign(req.id)}
                                    className="flex items-center gap-1.5 nav-label text-[0.55rem] px-3 py-1.5 rounded-sm transition-all disabled:opacity-50"
                                    style={{ background: 'rgba(184,212,240,0.08)', border: '1px solid rgba(184,212,240,0.2)', color: '#b8d4f0' }}>
                                    {isActing ? <Loader2 size={10} className="animate-spin" /> : <UserCheck size={10} />}
                                    ASSIGN TO ME
                                  </motion.button>
                                )}

                                {/* Status transition buttons */}
                                {allowedNext.map(nextStatus => {
                                  const c = STATUS_COLORS[nextStatus]
                                  const labels: Record<SupportStatus, string> = {
                                    OPEN:        'REOPEN',
                                    IN_PROGRESS: 'MARK IN PROGRESS',
                                    RESOLVED:    'MARK RESOLVED',
                                    CLOSED:      'CLOSE REQUEST',
                                  }
                                  return (
                                    <motion.button key={nextStatus} whileTap={{ scale: 0.97 }} disabled={isActing}
                                      onClick={() => handleStatusUpdate(req.id, nextStatus)}
                                      className="flex items-center gap-1.5 nav-label text-[0.55rem] px-3 py-1.5 rounded-sm transition-all disabled:opacity-50"
                                      style={{ background: `${c}10`, border: `1px solid ${c}30`, color: c }}>
                                      {isActing ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                                      {labels[nextStatus]}
                                    </motion.button>
                                  )
                                })}
                              </div>
                            )}

                            {/* Assigned to */}
                            {req.assignedToId && (
                              <p className="nav-label text-[0.48rem] text-ice/25">
                                ASSIGNED TO: {req.assignedToName ?? req.assignedToId}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <span className="nav-label text-[0.55rem] text-ice/30">
                PAGE {page} OF {totalPages} · {total} REQUESTS
              </span>
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded-sm flex items-center justify-center disabled:opacity-30"
                  style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
                  aria-label="Previous page">‹</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="w-8 h-8 rounded-sm flex items-center justify-center disabled:opacity-30"
                  style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
                  aria-label="Next page">›</motion.button>
              </div>
            </div>
          )}

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
