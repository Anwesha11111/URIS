/**
 * UserLifecycle.tsx — Phase 6
 *
 * CORE_ADMIN page for user archive/lifecycle management.
 * Two tabs: "Active Users" (initiate deactivation) and "Lifecycle Records" (archived/removed).
 * Inline confirmation replaces window.confirm() for accessibility.
 *
 * NEVER permanently deletes users.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Archive, Loader2, AlertTriangle, RotateCcw, UserX, UserMinus, Users } from 'lucide-react'
import Sidebar   from '../components/Sidebar'
import Starfield from '../components/Starfield'
import {
  listArchivedUsers,
  listAllUsers,
  archiveUser,
  restoreUser,
  deactivateUser,
  markUserRemoved,
  type ArchivedUserRecord,
  type UserLifecycleRecord,
  type ArchiveStatus,
} from '../services/archive.service'
import { extractErrorMessage } from '../services/error'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ArchiveStatus, string> = {
  ACTIVE:   '#4ade80',
  INACTIVE: '#f59e0b',
  ARCHIVED: '#b8d4f0',
  REMOVED:  '#f87171',
}

const STATUS_LABELS: Record<ArchiveStatus, string> = {
  ACTIVE:   'Active',
  INACTIVE: 'Inactive',
  ARCHIVED: 'Archived',
  REMOVED:  'Removed',
}

type Tab = 'active' | 'lifecycle'

// ── Inline Confirm Dialog ─────────────────────────────────────────────────────

interface ConfirmState {
  userId:  string
  action:  'deactivate' | 'archive' | 'restore' | 'remove'
  message: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UserLifecycle() {
  const [tab, setTab] = useState<Tab>('active')

  // Active users tab state
  const [activeUsers,    setActiveUsers]    = useState<UserLifecycleRecord[]>([])
  const [activeLoading,  setActiveLoading]  = useState(true)
  const [activeError,    setActiveError]    = useState('')
  const [activeTotal,    setActiveTotal]    = useState(0)
  const [activePage,     setActivePage]     = useState(1)
  const [activeTotalPgs, setActiveTotalPgs] = useState(1)

  // Lifecycle records tab state
  const [records,    setRecords]    = useState<ArchivedUserRecord[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<ArchiveStatus | ''>('')

  // Shared action state
  const [actionLoading, setActionLoading] = useState(false)
  const [feedback,      setFeedback]      = useState<{ ok: boolean; text: string } | null>(null)
  const [confirm,       setConfirm]       = useState<ConfirmState | null>(null)

  // ── Fetch active users ──────────────────────────────────────────────────────

  const fetchActiveUsers = useCallback(async (): Promise<void> => {
    setActiveLoading(true)
    setActiveError('')
    try {
      const result = await listAllUsers({ status: 'active', page: activePage, limit: 50 })
      setActiveUsers(result.users)
      setActiveTotal(result.pagination.total)
      setActiveTotalPgs(result.pagination.pages)
    } catch (err) {
      setActiveError(extractErrorMessage(err, 'Failed to load active users.'))
    } finally {
      setActiveLoading(false)
    }
  }, [activePage])

  // ── Fetch lifecycle records ─────────────────────────────────────────────────

  const fetchRecords = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError('')
    try {
      const result = await listArchivedUsers({ status: statusFilter || undefined, page, limit: 50 })
      setRecords(result.records)
      setTotal(result.pagination.total)
      setTotalPages(result.pagination.pages)
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load user lifecycle records.'))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => { void fetchActiveUsers() }, [fetchActiveUsers])
  useEffect(() => { void fetchRecords()     }, [fetchRecords])

  // ── Inline confirm flow ─────────────────────────────────────────────────────

  const CONFIRM_MESSAGES: Record<ConfirmState['action'], string> = {
    deactivate: 'Deactivate this user? They will not be able to log in until restored.',
    archive:    'Archive this user? A snapshot will be saved. They cannot log in until restored.',
    restore:    'Restore this user to active status?',
    remove:     'Mark this user as REMOVED? This is a compliance hold. Contact Core Admin to reverse.',
  }

  const requestAction = (userId: string, action: ConfirmState['action']) => {
    setConfirm({ userId, action, message: CONFIRM_MESSAGES[action] })
    setFeedback(null)
  }

  const cancelAction = () => setConfirm(null)

  const confirmAction = async () => {
    if (!confirm) return
    const { userId, action } = confirm
    setConfirm(null)
    setActionLoading(true)
    setFeedback(null)
    try {
      if (action === 'deactivate') await deactivateUser(userId)
      if (action === 'archive')    await archiveUser(userId)
      if (action === 'restore')    await restoreUser(userId)
      if (action === 'remove')     await markUserRemoved(userId)
      setFeedback({ ok: true, text: `User ${action}d successfully.` })
      void fetchActiveUsers()
      void fetchRecords()
    } catch (err: unknown) {
      setFeedback({ ok: false, text: extractErrorMessage(err, `${action} failed.`) })
    } finally {
      setActionLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-navy-950 text-frost">
      <Starfield />
      <Sidebar />
      <main className="md:ml-52 pt-14 min-h-screen relative z-10">
        <div className="px-4 md:px-8 py-8 max-w-4xl">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="nav-label text-[0.55rem] text-gold/40 tracking-ultra mb-1">ADMIN · GOVERNANCE</p>
            <h1 className="font-display font-black text-3xl text-ice-gradient">User Lifecycle</h1>
            <div className="gold-rule w-14 mt-2" />
            <p className="font-body text-sm text-ice/40 mt-2">
              Archive, deactivate, and restore users. No data is permanently deleted.
            </p>
          </motion.div>

          {/* Feedback */}
          <AnimatePresence>
            {feedback && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 px-4 py-3 rounded-sm font-body text-sm"
                style={{
                  background: feedback.ok ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                  border:     `1px solid ${feedback.ok ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                  color:      feedback.ok ? '#4ade80' : '#f87171',
                }}>
                {feedback.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Inline Confirm Dialog */}
          <AnimatePresence>
            {confirm && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                role="alertdialog" aria-modal="true" aria-labelledby="confirm-msg"
                className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 backdrop-blur-sm px-4">
                <div className="glass-card rounded-sm p-6 max-w-sm w-full"
                  style={{ border: '1px solid rgba(201,168,76,0.25)' }}>
                  <p id="confirm-msg" className="font-body text-sm text-frost/80 mb-5">{confirm.message}</p>
                  <div className="flex gap-3 justify-end">
                    <button onClick={cancelAction}
                      className="nav-label text-[0.55rem] px-4 py-2 rounded-sm transition-all"
                      style={{ background: 'transparent', border: '1px solid rgba(184,212,240,0.2)', color: 'rgba(184,212,240,0.5)' }}>
                      CANCEL
                    </button>
                    <button onClick={() => void confirmAction()} disabled={actionLoading}
                      className="nav-label text-[0.55rem] px-4 py-2 rounded-sm transition-all disabled:opacity-50"
                      style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c' }}>
                      {actionLoading ? <Loader2 size={10} className="animate-spin inline" /> : 'CONFIRM'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }} className="flex gap-2 mb-6">
            {(['active', 'lifecycle'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex items-center gap-1.5 nav-label text-[0.55rem] px-4 py-2 rounded-sm transition-all"
                style={{
                  background: tab === t ? 'rgba(201,168,76,0.12)' : 'transparent',
                  border:     `1px solid ${tab === t ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.12)'}`,
                  color:      tab === t ? '#c9a84c' : 'rgba(184,212,240,0.4)',
                }}>
                {t === 'active' ? <Users size={10} /> : <Archive size={10} />}
                {t === 'active' ? `ACTIVE USERS (${activeTotal})` : `LIFECYCLE RECORDS (${total})`}
              </button>
            ))}
          </motion.div>

          {/* ── Active Users Tab ── */}
          {tab === 'active' && (
            <>
              {activeLoading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="text-gold animate-spin" />
                </div>
              )}
              {!activeLoading && activeError && (
                <div className="glass-card rounded-sm p-10 text-center max-w-md mx-auto">
                  <AlertTriangle size={28} className="text-red-400 mx-auto mb-3" />
                  <p className="font-body text-sm text-ice/50">{activeError}</p>
                </div>
              )}
              {!activeLoading && !activeError && activeUsers.length === 0 && (
                <div className="glass-card rounded-sm p-10 text-center">
                  <Users size={28} className="text-gold/20 mx-auto mb-3" />
                  <p className="font-body text-sm text-ice/30">No active users found.</p>
                </div>
              )}
              {!activeLoading && !activeError && activeUsers.length > 0 && (
                <div className="space-y-3">
                  {activeUsers.map((u, i) => (
                    <motion.div key={u.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="glass-card rounded-sm p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="nav-label text-[0.5rem] px-1.5 py-0.5 rounded-sm"
                              style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                              ACTIVE
                            </span>
                            <span className="nav-label text-[0.5rem] text-ice/40">
                              {u.role.replace(/_/g, ' ')}
                            </span>
                            {u.teams.length > 0 && (
                              <span className="nav-label text-[0.45rem] text-ice/25">
                                {u.teams.join(', ')}
                              </span>
                            )}
                          </div>
                          <p className="font-body text-sm text-frost/80">{u.name || u.email}</p>
                          <p className="font-mono text-xs text-ice/30 mt-0.5">{u.email}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 flex-shrink-0">
                          <motion.button whileTap={{ scale: 0.97 }} disabled={actionLoading}
                            onClick={() => requestAction(u.id, 'deactivate')}
                            className="flex items-center gap-1.5 nav-label text-[0.55rem] px-3 py-1.5 rounded-sm transition-all disabled:opacity-50"
                            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}
                            aria-label={`Deactivate ${u.name || u.email}`}>
                            <UserMinus size={10} />
                            DEACTIVATE
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              {activeTotalPgs > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <span className="nav-label text-[0.55rem] text-ice/30">PAGE {activePage} OF {activeTotalPgs}</span>
                  <div className="flex gap-2">
                    <motion.button whileTap={{ scale: 0.95 }} disabled={activePage <= 1}
                      onClick={() => setActivePage(p => Math.max(1, p - 1))}
                      className="w-8 h-8 rounded-sm flex items-center justify-center disabled:opacity-30"
                      style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
                      aria-label="Previous page">‹</motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} disabled={activePage >= activeTotalPgs}
                      onClick={() => setActivePage(p => Math.min(activeTotalPgs, p + 1))}
                      className="w-8 h-8 rounded-sm flex items-center justify-center disabled:opacity-30"
                      style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}
                      aria-label="Next page">›</motion.button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Lifecycle Records Tab ── */}
          {tab === 'lifecycle' && (
            <>
              {/* Status filter */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }} className="glass-card rounded-sm p-4 mb-6">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="nav-label text-[0.55rem] text-gold/40">FILTER BY STATUS</span>
                  {(['', 'INACTIVE', 'ARCHIVED', 'REMOVED'] as const).map(s => (
                    <motion.button key={s} whileTap={{ scale: 0.96 }}
                      onClick={() => { setStatusFilter(s); setPage(1) }}
                      className="nav-label text-[0.55rem] px-3 py-1.5 rounded-sm transition-all"
                      style={{
                        background: statusFilter === s ? 'rgba(201,168,76,0.12)' : 'transparent',
                        border:     `1px solid ${statusFilter === s ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.12)'}`,
                        color:      statusFilter === s ? '#c9a84c' : 'rgba(184,212,240,0.4)',
                      }}>
                      {s === '' ? 'ALL' : s}
                    </motion.button>
                  ))}
                  <span className="nav-label text-[0.5rem] text-ice/25 ml-auto">{total} RECORDS</span>
                </div>
              </motion.div>

              {loading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="text-gold animate-spin" />
                </div>
              )}
              {!loading && error && (
                <div className="glass-card rounded-sm p-10 text-center max-w-md mx-auto">
                  <AlertTriangle size={28} className="text-red-400 mx-auto mb-3" />
                  <p className="font-body text-sm text-ice/50">{error}</p>
                </div>
              )}
              {!loading && !error && records.length === 0 && (
                <div className="glass-card rounded-sm p-10 text-center">
                  <Archive size={28} className="text-gold/20 mx-auto mb-3" />
                  <p className="font-body text-sm text-ice/30">No lifecycle records found.</p>
                </div>
              )}
              {!loading && !error && records.length > 0 && (
                <div className="space-y-3">
                  {records.map((rec, i) => {
                    const snap = rec.snapshot
                    return (
                      <motion.div key={rec.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="glass-card rounded-sm p-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="nav-label text-[0.5rem] px-1.5 py-0.5 rounded-sm"
                                style={{ background: `${STATUS_COLORS[rec.status]}15`, color: STATUS_COLORS[rec.status] }}>
                                {STATUS_LABELS[rec.status]}
                              </span>
                              <span className="nav-label text-[0.5rem] text-ice/40">
                                {snap.role?.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <p className="font-body text-sm text-frost/80">{snap.name || snap.email}</p>
                            <p className="font-mono text-xs text-ice/30 mt-0.5">{snap.email}</p>
                            <p className="nav-label text-[0.45rem] text-ice/20 mt-1">
                              ARCHIVED {new Date(rec.archivedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 flex-shrink-0">
                            {(rec.status === 'INACTIVE' || rec.status === 'ARCHIVED') && (
                              <motion.button whileTap={{ scale: 0.97 }} disabled={actionLoading}
                                onClick={() => requestAction(rec.originalId, 'restore')}
                                className="flex items-center gap-1.5 nav-label text-[0.55rem] px-3 py-1.5 rounded-sm transition-all disabled:opacity-50"
                                style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}
                                aria-label={`Restore ${snap.name || snap.email}`}>
                                <RotateCcw size={10} />
                                RESTORE
                              </motion.button>
                            )}
                            {rec.status === 'INACTIVE' && (
                              <motion.button whileTap={{ scale: 0.97 }} disabled={actionLoading}
                                onClick={() => requestAction(rec.originalId, 'archive')}
                                className="flex items-center gap-1.5 nav-label text-[0.55rem] px-3 py-1.5 rounded-sm transition-all disabled:opacity-50"
                                style={{ background: 'rgba(184,212,240,0.08)', border: '1px solid rgba(184,212,240,0.2)', color: '#b8d4f0' }}
                                aria-label={`Archive ${snap.name || snap.email}`}>
                                <Archive size={10} />
                                ARCHIVE
                              </motion.button>
                            )}
                            {rec.status === 'ARCHIVED' && (
                              <motion.button whileTap={{ scale: 0.97 }} disabled={actionLoading}
                                onClick={() => requestAction(rec.originalId, 'remove')}
                                className="flex items-center gap-1.5 nav-label text-[0.55rem] px-3 py-1.5 rounded-sm transition-all disabled:opacity-50"
                                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
                                aria-label={`Mark ${snap.name || snap.email} as removed`}>
                                <UserX size={10} />
                                MARK REMOVED
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <span className="nav-label text-[0.55rem] text-ice/30">PAGE {page} OF {totalPages}</span>
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
            </>
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
