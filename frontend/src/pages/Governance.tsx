import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, CheckCircle, X, Clock, Loader2, AlertTriangle,
  ChevronDown, ChevronUp, Key, Users, TrendingUp, Lock, Edit2, Save, RotateCcw,
  Activity, ShieldAlert, Radio, Ban, ShieldCheck, Archive, Clipboard, ClipboardCheck,
} from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Starfield from '../components/Starfield'
import { useAuthStore, selectUser } from '../store/authStore'
import { ROLES } from '../constants/roles'
import {
  listApprovals, approveRequest, rejectRequest, cancelApprovalRequest,
  getMyPermissions, getAllUsers, getRoleHistory, getAccessMatrix, updateAccessMatrix, getSecurityOverview,
  submitPromotionRequest, getGovernanceIntelligenceOverview, blockIP, adminUpdateUser, adminResetUserPassword,
  sendCredentials, sendCredentialsBulk, getOnboardingEmailPreview, logOnboardingAction,
  type ApprovalRequest, type PermissionsResponse,
  type GovernanceUser, type RoleHistoryRecord, type AccessMatrixResponse, type SecurityOverview,
  type GovernanceIntelligenceOverview,
} from '../services/governance.service'
import { extractErrorMessage } from '../services/error'
import { listInternshipArchives, type InternshipArchiveRecord } from '../services/internshipArchive.service'
import InternshipArchiveModal from '../components/InternshipArchiveModal'
import TeamManagementPanel from '../components/TeamManagementPanel'

const GOLD    = '#c9a84c'
const ICE_DIM = 'rgba(184,212,240,0.25)'
const GREEN   = '#4ade80'
const AMBER   = '#f59e0b'
const RED     = '#f87171'
const BLUE    = '#60a5fa'

type Tab = 'approvals' | 'promotions' | 'users' | 'role-history' | 'access-matrix' | 'security' | 'permissions' | 'internship-archives' | 'team-management' | 'onboarding'

const ALL_ROLES = Object.values(ROLES).filter(r => r !== 'admin' && r !== 'intern')

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role.includes('admin') || role.includes('lead') || role.includes('manager')
  const isIntern = role.includes('intern') || role === 'orenda_member'
  const bg    = isAdmin ? 'rgba(201,168,76,0.12)' : isIntern ? 'rgba(96,165,250,0.12)' : 'rgba(184,212,240,0.08)'
  const color = isAdmin ? GOLD : isIntern ? BLUE : ICE_DIM
  return (
    <span className="nav-label text-[0.5rem] px-2 py-0.5 rounded-full"
      style={{ background: bg, color }}>
      {role.replace(/_/g, ' ').toUpperCase()}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    pending:   { bg: 'rgba(245,158,11,0.12)',  color: AMBER },
    approved:  { bg: 'rgba(74,222,128,0.12)',  color: GREEN },
    rejected:  { bg: 'rgba(248,113,113,0.12)', color: RED },
    cancelled: { bg: 'rgba(184,212,240,0.08)', color: ICE_DIM },
    active:    { bg: 'rgba(74,222,128,0.12)',  color: GREEN },
    inactive:  { bg: 'rgba(245,158,11,0.12)',  color: AMBER },
    archived:  { bg: 'rgba(248,113,113,0.12)', color: RED },
    removed:   { bg: 'rgba(248,113,113,0.15)', color: RED },
    alumni:    { bg: 'rgba(184,212,240,0.08)', color: ICE_DIM },
  }
  const s = map[status] ?? { bg: 'rgba(184,212,240,0.08)', color: ICE_DIM }
  return (
    <span className="nav-label text-[0.5rem] px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}>
      {status.toUpperCase()}
    </span>
  )
}

function ActionBadge({ action }: { action: string }) {
  const labels: Record<string, string> = {
    CHANGE_USER_ROLE:  'Role Change',
    ARCHIVE_USER:      'Archive User',
    FINISH_INTERNSHIP: 'Finish Internship',
    REMOVE_USER:       'Remove User',
  }
  return (
    <span className="nav-label text-[0.5rem] px-2 py-0.5 rounded-full"
      style={{ background: 'rgba(96,165,250,0.12)', color: BLUE }}>
      {labels[action] ?? action.replace(/_/g, ' ')}
    </span>
  )
}

function FeedbackBanner({ ok, text }: { ok: boolean; text: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex items-center gap-2 p-3 rounded-sm"
      style={{
        background: ok ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
        border: `1px solid ${ok ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
      }}>
      {ok ? <CheckCircle size={13} style={{ color: GREEN }} /> : <AlertTriangle size={13} style={{ color: RED }} />}
      <p className="font-body text-sm" style={{ color: ok ? GREEN : RED }}>{text}</p>
    </motion.div>
  )
}

// ── Request Card ──────────────────────────────────────────────────────────────
function RequestCard({ req, currentUserId, onApprove, onReject, onCancel, loading }: {
  req: ApprovalRequest; currentUserId: string
  onApprove: (id: string) => void; onReject: (id: string) => void; onCancel: (id: string) => void
  loading: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const isMine    = req.requestedById === currentUserId
  const isLoading = loading === req.id

  // Build human-readable description from payload
  const payloadDesc = req.action === 'CHANGE_USER_ROLE'
    ? `New role: ${String(req.payload.newRole ?? '').replace(/_/g, ' ')}`
    : req.action === 'ARCHIVE_USER' || req.action === 'REMOVE_USER'
      ? `Reason: ${String(req.payload.reason ?? 'not specified')}`
      : JSON.stringify(req.payload)

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-sm overflow-hidden">
      <div className="flex items-start justify-between p-4 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <ActionBadge action={req.action} />
            <StatusBadge status={req.status} />
            {req.isExpired && <span className="nav-label text-[0.5rem] px-2 py-0.5 rounded-full" style={{ background: 'rgba(248,113,113,0.12)', color: RED }}>EXPIRED</span>}
          </div>
          <p className="font-body text-sm text-frost/80 mt-1">{payloadDesc}</p>
          <p className="nav-label text-[0.5rem] mt-1" style={{ color: ICE_DIM }}>
            Target: <span className="font-mono">{req.targetId.slice(0, 8)}…</span>
            {' · '}Requested by {req.requester?.name ?? req.requestedById}
            {' · '}{new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
          {req.reviewer && (
            <p className="nav-label text-[0.5rem] mt-0.5" style={{ color: ICE_DIM }}>
              Reviewed by {req.reviewer.name}{req.reviewNote && ` · "${req.reviewNote}"`}
            </p>
          )}
        </div>
        <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-sm" style={{ color: ICE_DIM }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-3">
              <p className="nav-label text-[0.5rem] mb-1" style={{ color: `${GOLD}66` }}>PAYLOAD</p>
              <pre className="font-mono text-xs rounded-sm p-2 overflow-x-auto"
                style={{ background: 'rgba(13,15,28,0.6)', color: 'rgba(184,212,240,0.6)', fontSize: '0.65rem' }}>
                {JSON.stringify(req.payload, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {req.status === 'pending' && !req.isExpired && (
        <div className="flex gap-2 px-4 pb-4">
          {!isMine && (
            <>
              <motion.button whileHover={{ scale: 1.03 }} disabled={!!isLoading} onClick={() => onApprove(req.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm nav-label text-[0.55rem] disabled:opacity-50"
                style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: GREEN }}>
                {isLoading ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />} APPROVE
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} disabled={!!isLoading} onClick={() => onReject(req.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm nav-label text-[0.55rem] disabled:opacity-50"
                style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: RED }}>
                {isLoading ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />} REJECT
              </motion.button>
            </>
          )}
          {isMine && (
            <>
              <motion.button whileHover={{ scale: 1.03 }} disabled={!!isLoading} onClick={() => onCancel(req.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm nav-label text-[0.55rem] disabled:opacity-50"
                style={{ background: 'rgba(184,212,240,0.08)', border: '1px solid rgba(184,212,240,0.15)', color: ICE_DIM }}>
                {isLoading ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />} CANCEL
              </motion.button>
              <p className="nav-label text-[0.5rem] self-center ml-1" style={{ color: ICE_DIM }}>Awaiting a second admin</p>
            </>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ── Approvals Tab ─────────────────────────────────────────────────────────────
function ApprovalsTab({ pending, history, currentUserId, onApprove, onReject, onCancel, loading, subTab, setSubTab }: {
  pending: ApprovalRequest[]; history: ApprovalRequest[]; currentUserId: string
  onApprove: (id: string) => void; onReject: (id: string) => void; onCancel: (id: string) => void
  loading: string | null; subTab: 'pending' | 'history'; setSubTab: (t: 'pending' | 'history') => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['pending', 'history'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className="px-4 py-2 rounded-sm nav-label text-[0.55rem] transition-all"
            style={{
              background: subTab === t ? 'rgba(201,168,76,0.12)' : 'transparent',
              border: `1px solid ${subTab === t ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.1)'}`,
              color: subTab === t ? GOLD : ICE_DIM,
            }}>
            {t.toUpperCase()} {t === 'pending' && pending.length > 0 && `(${pending.length})`}
          </button>
        ))}
      </div>
      {subTab === 'pending' && (
        pending.length === 0
          ? <div className="glass-card rounded-sm p-10 text-center"><CheckCircle size={28} className="mx-auto mb-3" style={{ color: GREEN }} /><p className="font-body text-sm" style={{ color: ICE_DIM }}>No pending approval requests.</p></div>
          : pending.map(r => <RequestCard key={r.id} req={r} currentUserId={currentUserId} onApprove={onApprove} onReject={onReject} onCancel={onCancel} loading={loading} />)
      )}
      {subTab === 'history' && (
        history.length === 0
          ? <div className="glass-card rounded-sm p-10 text-center"><p className="font-body text-sm" style={{ color: ICE_DIM }}>No approval history yet.</p></div>
          : history.map(r => <RequestCard key={r.id} req={r} currentUserId={currentUserId} onApprove={onApprove} onReject={onReject} onCancel={onCancel} loading={loading} />)
      )}
    </div>
  )
}

// ── Promotions Tab ────────────────────────────────────────────────────────────
function PromotionsTab({ users, onSubmit }: {
  users: GovernanceUser[]
  onSubmit: (userId: string, newRole: string, reason: string) => Promise<void>
}) {
  const [selectedUser, setSelectedUser] = useState('')
  const [newRole, setNewRole]           = useState('')
  const [reason, setReason]             = useState('')
  const [loading, setLoading]           = useState(false)
  const [localMsg, setLocalMsg]         = useState<{ ok: boolean; text: string } | null>(null)

  const activeUsers = users.filter(u => u.status === 'active')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser || !newRole) return
    setLoading(true)
    setLocalMsg(null)
    try {
      await onSubmit(selectedUser, newRole, reason)
      setLocalMsg({ ok: true, text: 'Promotion request submitted. Awaiting second admin approval.' })
      setSelectedUser(''); setNewRole(''); setReason('')
    } catch (err: unknown) {
      setLocalMsg({ ok: false, text: extractErrorMessage(err, 'Failed to submit promotion request.') })
    } finally {
      setLoading(false)
    }
  }

  const selectedUserObj = activeUsers.find(u => u.id === selectedUser)

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-sm p-5">
        <p className="nav-label text-[0.55rem] mb-1" style={{ color: `${GOLD}66` }}>ROLE PROMOTION / DEMOTION</p>
        <p className="font-body text-xs mb-4" style={{ color: ICE_DIM }}>
          Submits a governance approval request. A second CORE_ADMIN must approve before the role change takes effect.
          All historical data, scores, tasks, and audit logs are preserved.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">SELECT USER</label>
            <select className="uris-input w-full" value={selectedUser} onChange={e => setSelectedUser(e.target.value)} required>
              <option value="">Choose user...</option>
              {activeUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email} — {u.role.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          {selectedUserObj && (
            <div className="p-3 rounded-sm" style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.12)' }}>
              <p className="nav-label text-[0.5rem] mb-1" style={{ color: ICE_DIM }}>CURRENT ROLE</p>
              <RoleBadge role={selectedUserObj.role} />
              {selectedUserObj.teams.length > 0 && (
                <p className="nav-label text-[0.45rem] mt-1" style={{ color: ICE_DIM }}>Teams: {selectedUserObj.teams.join(', ')}</p>
              )}
            </div>
          )}
          <div>
            <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">NEW ROLE</label>
            <select className="uris-input w-full" value={newRole} onChange={e => setNewRole(e.target.value)} required>
              <option value="">Select new role...</option>
              {ALL_ROLES.filter(r => r !== selectedUserObj?.role).map(r => (
                <option key={r} value={r.toUpperCase()}>{r.replace(/_/g, ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="nav-label text-[0.6rem] text-gold/60 block mb-2">REASON (OPTIONAL)</label>
            <textarea className="uris-input resize-none w-full" rows={2} maxLength={500}
              placeholder="Justification for this role change..."
              value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          {localMsg && <FeedbackBanner ok={localMsg.ok} text={localMsg.text} />}
          <motion.button type="submit" disabled={loading || !selectedUser || !newRole}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="btn-gold w-full py-3 rounded-sm text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            SUBMIT PROMOTION REQUEST
          </motion.button>
        </form>
      </div>
    </div>
  )
}

// ── User Edit Modal ─────────────────────────────────────────────────────────────
function UserEditModal({ user, onClose, onSaved }: {
  user: GovernanceUser; onClose: () => void; onSaved: () => void
}) {
  const [email, setEmail] = useState(user.email)
  const [status, setStatus] = useState(user.status)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      await adminUpdateUser(user.id, { email, status })
      setMsg({ ok: true, text: 'User updated successfully.' })
      setTimeout(() => {
        onSaved()
        onClose()
      }, 1000)
    } catch (err) {
      setMsg({ ok: false, text: extractErrorMessage(err, 'Failed to update user.') })
      setLoading(false)
    }
  }

  const [resetLoading, setResetLoading] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  async function handleResetPassword() {
    if (!confirm(`Are you sure you want to reset the password for ${user.email}?`)) return
    setResetLoading(true)
    setMsg(null)
    setTempPassword(null)
    try {
      const res = await adminResetUserPassword(user.id)
      setTempPassword(res.tempPassword)
      setMsg({ ok: true, text: 'Password reset successfully.' })
    } catch (err) {
      setMsg({ ok: false, text: extractErrorMessage(err, 'Failed to reset password.') })
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-md p-6 rounded-sm border-gold/20 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-ice/40 hover:text-frost">
          <X size={16} />
        </button>
        <h2 className="font-display font-black text-xl text-gold mb-1">Edit User</h2>
        <p className="font-body text-xs text-ice/60 mb-4">Editing settings for {user.name || user.email}</p>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="nav-label text-[0.55rem] text-ice/60 block mb-1">EMAIL ADDRESS</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="uris-input w-full" />
          </div>
          <div>
            <label className="nav-label text-[0.55rem] text-ice/60 block mb-1">ACCOUNT STATUS</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="uris-input w-full">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="alumni">Alumni</option>
              <option value="archived" disabled>Archived (Use Archive tool)</option>
              <option value="removed" disabled>Removed</option>
              <option value="pending" disabled>Pending</option>
            </select>
          </div>
          
          {msg && <FeedbackBanner ok={msg.ok} text={msg.text} />}

          {tempPassword && (
            <div className="p-3 rounded-sm mb-4" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
              <p className="font-body text-sm text-green-400 mb-1">Temporary Password:</p>
              <code className="font-mono text-lg text-green-300">{tempPassword}</code>
              <p className="font-body text-xs text-green-400/80 mt-2">Please copy and share this with the user securely. They will be forced to change it on their next login.</p>
            </div>
          )}
          
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-ice/10">
            <button type="button" onClick={handleResetPassword} disabled={resetLoading || loading}
              className="px-4 py-2 text-xs nav-label rounded-sm bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50 mr-auto flex items-center gap-2">
              {resetLoading && <Loader2 size={12} className="animate-spin" />}
              RESET PASSWORD
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs nav-label text-ice/60 hover:text-frost">
              CANCEL
            </button>
            <button type="submit" disabled={loading || resetLoading}
              className="px-4 py-2 text-xs nav-label rounded-sm bg-gold/10 text-gold border border-gold/20 flex items-center gap-2 hover:bg-gold/20 transition-colors disabled:opacity-50">
              {loading && <Loader2 size={12} className="animate-spin" />}
              SAVE CHANGES
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab({ users, onRefresh }: { users: GovernanceUser[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState('')
  const [editingUser, setEditingUser] = useState<GovernanceUser | null>(null)
  
  const filtered = users.filter(u =>
    !filter || u.status === filter
  )
  const statuses = ['active', 'inactive', 'archived', 'removed', 'pending', 'alumni']
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('')}
          className="px-3 py-1.5 rounded-sm nav-label text-[0.55rem] transition-all"
          style={{ background: !filter ? 'rgba(201,168,76,0.12)' : 'transparent', border: `1px solid ${!filter ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.1)'}`, color: !filter ? GOLD : ICE_DIM }}>
          ALL ({users.length})
        </button>
        {statuses.map(s => {
          const count = users.filter(u => u.status === s).length
          if (count === 0) return null
          return (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-sm nav-label text-[0.55rem] transition-all"
              style={{ background: filter === s ? 'rgba(201,168,76,0.12)' : 'transparent', border: `1px solid ${filter === s ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.1)'}`, color: filter === s ? GOLD : ICE_DIM }}>
              {s.toUpperCase()} ({count})
            </button>
          )
        })}
      </div>
      <div className="glass-card rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="uris-table w-full">
            <thead><tr>
              <th className="text-left">Name</th>
              <th className="text-left">Email</th>
              <th className="text-center">Role</th>
              <th className="text-center">Status</th>
              <th className="text-left">Teams</th>
              <th className="text-center">Joined</th>
              <th className="text-center">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td className="font-body text-sm text-frost/80">{u.name || '—'}</td>
                  <td className="font-body text-xs text-ice/50">{u.email}</td>
                  <td className="text-center"><RoleBadge role={u.role.toLowerCase()} /></td>
                  <td className="text-center"><StatusBadge status={u.status} /></td>
                  <td className="font-body text-xs text-ice/50">{u.teams.join(', ') || '—'}</td>
                  <td className="text-center font-mono text-xs text-ice/40">
                    {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="text-center">
                    <button onClick={() => setEditingUser(u)}
                      className="nav-label text-[0.48rem] px-2 py-1 rounded-sm transition-colors"
                      style={{ background: 'rgba(184,212,240,0.05)', color: ICE_DIM, border: '1px solid rgba(184,212,240,0.1)' }}>
                      EDIT
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {editingUser && (
        <UserEditModal 
          user={editingUser} 
          onClose={() => setEditingUser(null)} 
          onSaved={() => {
            onRefresh()
            setEditingUser(null)
          }} 
        />
      )}
    </div>
  )
}

// ── Role History Tab ──────────────────────────────────────────────────────────
function RoleHistoryTab({ records }: { records: RoleHistoryRecord[] }) {
  if (records.length === 0) return (
    <div className="glass-card rounded-sm p-10 text-center">
      <p className="font-body text-sm" style={{ color: ICE_DIM }}>No role changes recorded yet.</p>
    </div>
  )
  return (
    <div className="glass-card rounded-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="uris-table w-full">
          <thead><tr>
            <th className="text-left">User</th>
            <th className="text-center">Previous Role</th>
            <th className="text-center">New Role</th>
            <th className="text-left">Changed By</th>
            <th className="text-left">Reason</th>
            <th className="text-center">Date</th>
          </tr></thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id}>
                <td>
                  <p className="font-body text-sm text-frost/80">{r.user?.name || '—'}</p>
                  <p className="font-mono text-xs text-ice/40">{r.user?.email || r.userId.slice(0, 8) + '…'}</p>
                </td>
                <td className="text-center"><RoleBadge role={r.previousRole.toLowerCase()} /></td>
                <td className="text-center"><RoleBadge role={r.newRole.toLowerCase()} /></td>
                <td className="font-body text-sm text-ice/60">{r.changedBy?.name || 'System'}</td>
                <td className="font-body text-xs text-ice/50 max-w-[160px] truncate">{r.reason || '—'}</td>
                <td className="text-center font-mono text-xs text-ice/40">
                  {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Access Matrix Tab ─────────────────────────────────────────────────────────
function AccessMatrixTab({ matrix, onSave }: { matrix: AccessMatrixResponse | null; onSave: (overrides: Record<string, string[]>) => Promise<void> }) {
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [editMode, setEditMode]         = useState(false)
  const [editPerms, setEditPerms]       = useState<Record<string, string[]>>({})
  const [saving, setSaving]             = useState(false)
  const [saveMsg, setSaveMsg]           = useState<{ ok: boolean; text: string } | null>(null)

  if (!matrix) return <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: GOLD }} /></div>

  const roleData = selectedRole
    ? matrix.matrix.find(r => r.role === selectedRole)
    : null

  // Key permissions to show in the summary grid
  const KEY_PERMS = [
    'CAN_ASSIGN_TASKS', 'CAN_CREATE_TASKS', 'CAN_SUBMIT_REVIEW',
    'CAN_OVERRIDE_SCORE', 'CAN_ARCHIVE_USERS', 'CAN_CHANGE_USER_ROLE',
    'CAN_VIEW_NOTES', 'CAN_VIEW_ALL_INTERNS', 'CAN_MANAGE_APPROVALS',
    'CAN_VIEW_AUDIT_LOGS', 'CAN_MANAGE_IP_BLOCKS', 'CAN_VIEW_LOGIN_LOGS',
  ]

  // Filter out assignment target permissions — those are managed via the Delegation tab
  const ASSIGN_TARGET_PERMS = [
    'CAN_ASSIGN_TO_CORE_ADMIN',
    'CAN_ASSIGN_TO_ADMIN',
    'CAN_ASSIGN_TO_LEAD',
    'CAN_ASSIGN_TO_INTERN',
  ]
  const generalPermsAll = matrix.allPermissions.filter(p => !ASSIGN_TARGET_PERMS.includes(p)).sort()

  function enterEditMode() {
    if (!matrix) return
    // Seed edit state from current matrix
    const seed: Record<string, string[]> = {}
    for (const r of matrix.matrix) {
      seed[r.role] = [...r.permissions]
    }
    setEditPerms(seed)
    setEditMode(true)
    setSaveMsg(null)
  }

  function cancelEdit() {
    setEditMode(false)
    setEditPerms({})
    setSaveMsg(null)
  }

  function togglePerm(role: string, perm: string) {
    setEditPerms(prev => {
      const current = prev[role] ?? []
      const has = current.includes(perm)
      return {
        ...prev,
        [role]: has ? current.filter(p => p !== perm) : [...current, perm],
      }
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    try {
      await onSave(editPerms)
      setSaveMsg({ ok: true, text: 'Permissions saved successfully.' })
      setEditMode(false)
    } catch (err: unknown) {
      setSaveMsg({ ok: false, text: extractErrorMessage(err, 'Failed to save permissions.') })
    } finally {
      setSaving(false)
    }
  }

  const filteredMatrix = matrix.matrix.filter(r => r.role !== 'PAST_EMPLOYEE')

  return (
    <div className="space-y-6">
      {/* Header with edit toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="nav-label text-[0.55rem]" style={{ color: `${GOLD}66` }}>ROLE PERMISSION MATRIX</p>
          <p className="font-body text-xs mt-0.5" style={{ color: ICE_DIM }}>
            {editMode ? 'Click any cell to toggle a permission on or off.' : 'Select a role to inspect its permissions, or enter edit mode to modify them.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <motion.button whileHover={{ scale: 1.03 }} onClick={cancelEdit} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm nav-label text-[0.55rem] disabled:opacity-50"
                style={{ background: 'rgba(184,212,240,0.08)', border: '1px solid rgba(184,212,240,0.2)', color: ICE_DIM }}>
                <RotateCcw size={11} /> CANCEL
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm nav-label text-[0.55rem] disabled:opacity-50"
                style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: GREEN }}>
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                SAVE CHANGES
              </motion.button>
            </>
          ) : (
            <motion.button whileHover={{ scale: 1.03 }} onClick={enterEditMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm nav-label text-[0.55rem]"
              style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: GOLD }}>
              <Edit2 size={11} /> EDIT PERMISSIONS
            </motion.button>
          )}
        </div>
      </div>

      {saveMsg && <FeedbackBanner ok={saveMsg.ok} text={saveMsg.text} />}

      {/* Role selector (view mode only) */}
      {!editMode && (
        <div className="glass-card rounded-sm p-5">
          <p className="nav-label text-[0.55rem] mb-3" style={{ color: `${GOLD}66` }}>SELECT ROLE TO INSPECT</p>
          <div className="flex flex-wrap gap-2">
            {filteredMatrix.map(r => (
              <button key={r.role} onClick={() => setSelectedRole(r.role === selectedRole ? null : r.role)}
                className="px-3 py-1.5 rounded-sm nav-label text-[0.55rem] transition-all"
                style={{
                  background: selectedRole === r.role ? 'rgba(201,168,76,0.15)' : 'rgba(13,15,28,0.6)',
                  border: `1px solid ${selectedRole === r.role ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.1)'}`,
                  color: selectedRole === r.role ? GOLD : ICE_DIM,
                }}>
                {r.role.replace(/_/g, ' ')}
                <span className="ml-1.5 opacity-60">({r.permissions.length})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Role detail (view mode) */}
      {!editMode && roleData && (
        <div className="glass-card rounded-sm p-5">
          <div className="mb-4">
            <RoleBadge role={roleData.role.toLowerCase()} />
            <p className="font-body text-xs mt-2" style={{ color: ICE_DIM }}>
              {roleData.permissions.length} of {matrix.allPermissions.length} permissions granted
            </p>
          </div>

          {/* Assignment target permissions are managed in the Delegation tab */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {generalPermsAll.map(p => {
              const has = roleData.permissions.includes(p)
              return (
                <div key={p} className="flex items-center gap-2 p-2 rounded-sm"
                  style={{ background: has ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.04)', border: `1px solid ${has ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.08)'}` }}>
                  {has
                    ? <CheckCircle size={11} style={{ color: GREEN, flexShrink: 0 }} />
                    : <X size={11} style={{ color: 'rgba(248,113,113,0.4)', flexShrink: 0 }} />}
                  <span className="nav-label text-[0.5rem]" style={{ color: has ? 'rgba(184,212,240,0.6)' : 'rgba(184,212,240,0.25)' }}>
                    {p.replace(/_/g, ' ')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Edit mode — General permissions table */}
      {editMode && (
        <div className="glass-card rounded-sm p-5">
          <p className="nav-label text-[0.55rem] mb-4" style={{ color: `${GOLD}66` }}>GENERAL PERMISSIONS — CLICK TO TOGGLE</p>
          <div className="overflow-x-auto">
            <table className="uris-table w-full text-center" style={{ minWidth: '700px' }}>
              <thead>
                <tr>
                  <th className="text-left sticky left-0" style={{ background: 'rgba(13,15,28,0.95)', minWidth: '200px' }}>Permission</th>
                  {filteredMatrix.map(r => (
                    <th key={r.role} className="text-center" style={{ minWidth: '80px' }}>
                      <span className="nav-label text-[0.45rem]" style={{ color: ICE_DIM }}>
                        {r.role.replace(/_/g, ' ').split(' ').map((w: string) => w[0]).join('')}
                      </span>
                      <span className="block nav-label text-[0.4rem] mt-0.5" style={{ color: `${ICE_DIM}88` }}>
                        {r.role.replace(/_/g, ' ').split(' ')[0]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {generalPermsAll.map(p => (
                  <tr key={p}>
                    <td className="text-left nav-label text-[0.5rem] sticky left-0" style={{ background: 'rgba(13,15,28,0.95)', color: ICE_DIM }}>
                      {p.replace(/^CAN_/, '').replace(/_/g, ' ')}
                    </td>
                    {filteredMatrix.map(r => {
                      const has = (editPerms[r.role] ?? r.permissions).includes(p)
                      return (
                        <td key={r.role}>
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => togglePerm(r.role, p)}
                            className="w-6 h-6 rounded-sm flex items-center justify-center mx-auto transition-all"
                            style={{
                              background: has ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.08)',
                              border: `1px solid ${has ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.2)'}`,
                              cursor: 'pointer',
                            }}
                            title={`${has ? 'Revoke' : 'Grant'} ${p} for ${r.role}`}>
                            {has
                              ? <CheckCircle size={10} style={{ color: GREEN }} />
                              : <X size={10} style={{ color: 'rgba(248,113,113,0.5)' }} />}
                          </motion.button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="nav-label text-[0.45rem] mt-4" style={{ color: `${ICE_DIM}66` }}>
            Column abbreviations: CA=CORE_ADMIN · TL=TECHNICAL_LEAD · OL=OPERATIONS_LEAD · RL=RESEARCH_LEAD · OPM=OPERATIONS_PROGRAM_MANAGER · TI=TECHNICAL_INTERN · OI=OPERATIONS_INTERN · RI=RESEARCH_INTERN · OTL=OBSERVER_TEAM_LEAD · CL=COLLABORATOR_LEAD · OM=ORENDA_MEMBER
          </p>
        </div>
      )}

      {/* Summary matrix (view mode, no role selected) */}
      {!editMode && !selectedRole && (
        <div className="glass-card rounded-sm p-5">
          <p className="nav-label text-[0.55rem] mb-4" style={{ color: `${GOLD}66` }}>KEY PERMISSIONS MATRIX</p>
          <div className="overflow-x-auto">
            <table className="uris-table w-full text-center">
              <thead>
                <tr>
                  <th className="text-left">Permission</th>
                  {filteredMatrix.map(r => (
                    <th key={r.role} className="text-center">
                      <span className="nav-label text-[0.45rem]" style={{ color: ICE_DIM }}>
                        {r.role.replace(/_/g, ' ').split(' ').map((w: string) => w[0]).join('')}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KEY_PERMS.map(p => (
                  <tr key={p}>
                    <td className="text-left nav-label text-[0.5rem]" style={{ color: ICE_DIM }}>{p.replace(/^CAN_/, '').replace(/_/g, ' ')}</td>
                    {filteredMatrix.map(r => (
                      <td key={r.role}>
                        {r.permissions.includes(p)
                          ? <CheckCircle size={10} style={{ color: GREEN, margin: 'auto' }} />
                          : <span style={{ color: 'rgba(248,113,113,0.3)', fontSize: '0.6rem' }}>✕</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Security Tab ──────────────────────────────────────────────────────────────
function SecurityTab({ security }: { security: SecurityOverview | null }) {
  if (!security) return <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: GOLD }} /></div>
  const { summary, blockedIPs, suspiciousIPs, recentFailedLogins } = security
  const [blockingIP, setBlockingIP] = useState<string | null>(null)
  const [blockMsg, setBlockMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  async function handleBlockIP(ip: string) {
    setBlockingIP(ip)
    setBlockMsg(null)
    try {
      await blockIP(ip, 'Blocked from Governance panel — suspicious login activity')
      setBlockMsg({ ok: true, text: `${ip} has been blocked.` })
    } catch {
      setBlockMsg({ ok: false, text: `Failed to block ${ip}.` })
    } finally {
      setBlockingIP(null)
    }
  }

  return (
    <div className="space-y-6">
      {blockMsg && <FeedbackBanner ok={blockMsg.ok} text={blockMsg.text} />}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="glass-card rounded-sm p-4">
          <p className="nav-label text-[0.5rem] mb-1" style={{ color: ICE_DIM }}>FAILED LOGINS (24H)</p>
          <p className="font-display font-black text-2xl" style={{ color: summary.failedLogins24h > 10 ? RED : AMBER }}>{summary.failedLogins24h}</p>
        </div>
        <div className="glass-card rounded-sm p-4">
          <p className="nav-label text-[0.5rem] mb-1" style={{ color: ICE_DIM }}>BLOCKED IPs</p>
          <p className="font-display font-black text-2xl" style={{ color: summary.blockedIPCount > 0 ? RED : GREEN }}>{summary.blockedIPCount}</p>
        </div>
        <div className="glass-card rounded-sm p-4">
          <p className="nav-label text-[0.5rem] mb-1" style={{ color: ICE_DIM }}>SUSPICIOUS IPs</p>
          <p className="font-display font-black text-2xl" style={{ color: summary.suspiciousIPCount > 0 ? AMBER : GREEN }}>{summary.suspiciousIPCount}</p>
        </div>
        <div className="glass-card rounded-sm p-4">
          <p className="nav-label text-[0.5rem] mb-1" style={{ color: ICE_DIM }}>INACTIVE / ARCHIVED</p>
          <p className="font-display font-black text-2xl" style={{ color: GOLD }}>{summary.inactiveUsers}</p>
        </div>
        <div className="glass-card rounded-sm p-4">
          <p className="nav-label text-[0.5rem] mb-1" style={{ color: ICE_DIM }}>PENDING APPROVAL</p>
          <p className="font-display font-black text-2xl" style={{ color: summary.pendingUsers > 0 ? AMBER : GREEN }}>{summary.pendingUsers}</p>
        </div>
        <div className="glass-card rounded-sm p-4">
          <p className="nav-label text-[0.5rem] mb-1" style={{ color: ICE_DIM }}>SUCCESS LOGINS (24H)</p>
          <p className="font-display font-black text-2xl" style={{ color: GREEN }}>{summary.successLogins24h}</p>
        </div>
      </div>

      {suspiciousIPs.length > 0 && (
        <div className="glass-card rounded-sm p-5">
          <p className="nav-label text-[0.55rem] mb-3" style={{ color: `${GOLD}66` }}>SUSPICIOUS IPs (3+ FAILED LOGINS IN 7 DAYS)</p>
          <div className="space-y-2">
            {suspiciousIPs.map(s => (
              <div key={s.ip} className="flex items-center justify-between p-3 rounded-sm"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <span className="font-mono text-sm text-frost/80">{s.ip}</span>
                <div className="flex items-center gap-2">
                  <span className="nav-label text-[0.5rem] px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: AMBER }}>
                    {s.failCount} FAILURES
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => handleBlockIP(s.ip)}
                    disabled={blockingIP === s.ip}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm nav-label text-[0.5rem] disabled:opacity-50 transition-all"
                    style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: RED }}>
                    {blockingIP === s.ip
                      ? <Loader2 size={10} className="animate-spin" />
                      : <Ban size={10} />}
                    BLOCK IP
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {blockedIPs.length > 0 && (
        <div className="glass-card rounded-sm p-5">
          <p className="nav-label text-[0.55rem] mb-3" style={{ color: `${GOLD}66` }}>BLOCKED IPs</p>
          <div className="overflow-x-auto">
            <table className="uris-table w-full">
              <thead><tr>
                <th className="text-left">IP Address</th>
                <th className="text-left">Reason</th>
                <th className="text-center">Blocked At</th>
                <th className="text-center">Expires</th>
                <th className="text-center">Status</th>
              </tr></thead>
              <tbody>
                {blockedIPs.map(b => (
                  <tr key={b.id}>
                    <td className="font-mono text-sm text-frost/80">{b.ipAddress}</td>
                    <td className="font-body text-xs text-ice/50">{b.reason || '—'}</td>
                    <td className="text-center font-mono text-xs text-ice/40">
                      {new Date(b.blockedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="text-center font-mono text-xs text-ice/40">
                      {b.expiresAt ? new Date(b.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Permanent'}
                    </td>
                    <td className="text-center">
                      <StatusBadge status={b.isExpired ? 'inactive' : 'active'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recentFailedLogins.length > 0 && (
        <div className="glass-card rounded-sm p-5">
          <p className="nav-label text-[0.55rem] mb-3" style={{ color: `${GOLD}66` }}>RECENT FAILED LOGINS</p>
          <div className="overflow-x-auto">
            <table className="uris-table w-full">
              <thead><tr>
                <th className="text-left">Email</th>
                <th className="text-left">IP Address</th>
                <th className="text-center">Time</th>
              </tr></thead>
              <tbody>
                {recentFailedLogins.map(l => (
                  <tr key={l.id}>
                    <td className="font-body text-sm text-frost/70">{l.email}</td>
                    <td className="font-mono text-xs text-ice/50">{l.ipAddress}</td>
                    <td className="text-center font-mono text-xs text-ice/40">
                      {new Date(l.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── My Permissions Tab ────────────────────────────────────────────────────────
function PermissionsTab({ perms }: { perms: PermissionsResponse | null }) {
  if (!perms) return <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: GOLD }} /></div>
  return (
    <div className="glass-card rounded-sm p-5">
      <div className="mb-4">
        <p className="nav-label text-[0.55rem] mb-1" style={{ color: `${GOLD}66` }}>YOUR ROLE</p>
        <RoleBadge role={perms.role.toLowerCase()} />
        <div className="gold-rule w-10 mt-3" />
      </div>
      <p className="nav-label text-[0.55rem] mb-3" style={{ color: `${GOLD}66` }}>GRANTED PERMISSIONS ({perms.permissions.length})</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {perms.permissions.sort().map(p => (
          <div key={p} className="flex items-center gap-2 p-2 rounded-sm"
            style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.12)' }}>
            <CheckCircle size={11} style={{ color: GREEN, flexShrink: 0 }} />
            <span className="nav-label text-[0.5rem]" style={{ color: 'rgba(184,212,240,0.6)' }}>
              {p.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Governance Intelligence Overview Panel ────────────────────────────────────

function GovernanceScorePill({
  label, score, statusLabel, color, icon: Icon,
}: {
  label: string; score: number; statusLabel: string; color: string; icon: React.ElementType
}) {
  return (
    <div className="glass-card rounded-sm p-4 flex items-center gap-3"
      style={{ border: `1px solid ${color}22` }}>
      <div className="p-2 rounded-sm flex-shrink-0" style={{ background: `${color}15` }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="nav-label text-[0.48rem] mb-0.5" style={{ color: ICE_DIM }}>{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="font-display font-black text-2xl leading-none" style={{ color }}>{score}</span>
          <span className="nav-label text-[0.45rem] px-1.5 py-0.5 rounded-full"
            style={{ background: `${color}15`, color }}>
            {statusLabel.toUpperCase()}
          </span>
        </div>
        <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(184,212,240,0.08)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: color }}
          />
        </div>
      </div>
    </div>
  )
}

function GovernanceIntelligencePanel({ data }: { data: GovernanceIntelligenceOverview }) {
  const { enterpriseHealth, operationalRisk, teamStability, executiveSummary, liveSignals } = data

  const ehColor  = enterpriseHealth.score >= 75 ? GREEN : enterpriseHealth.score >= 50 ? AMBER : RED
  const orColor  = operationalRisk.score  >= 70 ? RED   : operationalRisk.score  >= 45 ? AMBER : GREEN
  const tsColor  = teamStability.score    >= 75 ? GREEN : teamStability.score    >= 50 ? AMBER : RED

  const hasUrgent   = executiveSummary.urgentActions.length > 0
  const hasWarnings = executiveSummary.crossSystemWarnings.length > 0

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Radio size={12} style={{ color: GOLD }} />
        <p className="nav-label text-[0.5rem]" style={{ color: `${GOLD}88` }}>ENTERPRISE INTELLIGENCE OVERVIEW</p>
        <span className="nav-label text-[0.42rem] px-1.5 py-0.5 rounded-full ml-auto"
          style={{ background: 'rgba(201,168,76,0.08)', color: `${GOLD}66` }}>
          {new Date(data.computedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Three score cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <GovernanceScorePill label="ENTERPRISE HEALTH"  score={enterpriseHealth.score} statusLabel={enterpriseHealth.label} color={ehColor} icon={Activity} />
        <GovernanceScorePill label="OPERATIONAL RISK"   score={operationalRisk.score}  statusLabel={operationalRisk.label}  color={orColor} icon={ShieldAlert} />
        <GovernanceScorePill label="TEAM STABILITY"     score={teamStability.score}    statusLabel={teamStability.label}    color={tsColor} icon={Users} />
      </div>

      {/* Live signal counters */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
        {[
          { label: 'UNRESOLVED ALERTS', value: liveSignals.totalUnresolvedAlerts,   color: liveSignals.totalUnresolvedAlerts > 0 ? AMBER : ICE_DIM },
          { label: 'CRITICAL ALERTS',   value: liveSignals.unresolvedEscalations,   color: liveSignals.unresolvedEscalations > 0 ? RED : ICE_DIM },
          { label: 'STALE TASKS',       value: liveSignals.staleTaskWarnings,        color: liveSignals.staleTaskWarnings > 0 ? AMBER : ICE_DIM },
          { label: 'OVERLOAD WARNINGS', value: liveSignals.overloadWarnings,         color: liveSignals.overloadWarnings > 0 ? RED : ICE_DIM },
          { label: 'REASSIGN RISK',     value: liveSignals.reassignmentInstability,  color: liveSignals.reassignmentInstability > 0 ? AMBER : ICE_DIM },
          { label: 'INTEGRATION RISK',  value: liveSignals.integrationRiskCount,     color: liveSignals.integrationRiskCount > 0 ? GOLD : ICE_DIM },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card rounded-sm px-3 py-2 flex items-center justify-between gap-1"
            style={{ border: value > 0 ? `1px solid ${color}22` : '1px solid rgba(184,212,240,0.06)' }}>
            <p className="nav-label text-[0.42rem]" style={{ color: ICE_DIM }}>{label}</p>
            <span className="font-display font-black text-base" style={{ color: value > 0 ? color : ICE_DIM }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Executive summary */}
      <div className="glass-card rounded-sm p-4" style={{ border: '1px solid rgba(201,168,76,0.1)' }}>
        <p className="nav-label text-[0.48rem] mb-1" style={{ color: `${GOLD}66` }}>EXECUTIVE SUMMARY</p>
        <p className="font-body text-sm mb-2" style={{ color: ICE_DIM }}>{executiveSummary.headline}</p>

        {/* Operational snapshot */}
        <div className="flex flex-wrap gap-3 mb-2">
          {[
            { label: 'Interns',  value: executiveSummary.operationalSnapshot.totalInterns },
            { label: 'Tasks',    value: executiveSummary.operationalSnapshot.activeTasks },
            { label: 'Alerts',   value: executiveSummary.operationalSnapshot.unresolvedAlerts },
            { label: 'Critical', value: executiveSummary.operationalSnapshot.criticalAlerts },
            { label: 'Stale',    value: executiveSummary.operationalSnapshot.staleTasks },
            { label: 'Blocked',  value: executiveSummary.operationalSnapshot.blockedTasks },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="nav-label text-[0.45rem]" style={{ color: ICE_DIM }}>{label}:</span>
              <span className="font-mono text-xs font-bold" style={{ color: 'rgba(184,212,240,0.7)' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Urgent actions */}
        {hasUrgent && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {executiveSummary.urgentActions.slice(0, 4).map((a, i) => (
              <span key={i} className="nav-label text-[0.44rem] px-2 py-0.5 rounded-sm"
                style={{ background: 'rgba(248,113,113,0.08)', color: RED, border: '1px solid rgba(248,113,113,0.15)' }}>
                ⚡ {a}
              </span>
            ))}
          </div>
        )}

        {/* Cross-system warnings */}
        {hasWarnings && (
          <div className="flex flex-wrap gap-1.5">
            {executiveSummary.crossSystemWarnings.map((w, i) => (
              <span key={i} className="nav-label text-[0.44rem] px-2 py-0.5 rounded-sm"
                style={{ background: 'rgba(245,158,11,0.08)', color: AMBER, border: '1px solid rgba(245,158,11,0.15)' }}>
                ⚠ {w}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Explainability breakdown (collapsible) */}
      <GovernanceExplainabilitySection
        enterpriseHealth={enterpriseHealth}
        operationalRisk={operationalRisk}
        teamStability={teamStability}
      />
    </motion.div>
  )
}

function GovernanceExplainabilitySection({ enterpriseHealth, operationalRisk, teamStability }: {
  enterpriseHealth: GovernanceIntelligenceOverview['enterpriseHealth']
  operationalRisk:  GovernanceIntelligenceOverview['operationalRisk']
  teamStability:    GovernanceIntelligenceOverview['teamStability']
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-2">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 nav-label text-[0.48rem] transition-colors"
        style={{ color: ICE_DIM }}>
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        {open ? 'HIDE EXPLAINABILITY' : 'SHOW EXPLAINABILITY BREAKDOWN'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { title: 'Enterprise Health', data: enterpriseHealth, color: enterpriseHealth.score >= 75 ? GREEN : enterpriseHealth.score >= 50 ? AMBER : RED },
                { title: 'Operational Risk',  data: operationalRisk,  color: operationalRisk.score  >= 70 ? RED   : operationalRisk.score  >= 45 ? AMBER : GREEN },
                { title: 'Team Stability',    data: teamStability,    color: teamStability.score    >= 75 ? GREEN : teamStability.score    >= 50 ? AMBER : RED },
              ].map(({ title, data, color }) => (
                <div key={title} className="glass-card rounded-sm p-4" style={{ border: `1px solid ${color}18` }}>
                  <p className="nav-label text-[0.5rem] mb-2" style={{ color }}>{title.toUpperCase()}</p>

                  {/* Component scores */}
                  <div className="space-y-1.5 mb-3">
                    {Object.entries(data.components).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2">
                        <p className="nav-label text-[0.44rem] flex-1" style={{ color: ICE_DIM }}>
                          {key.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
                        </p>
                        <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(184,212,240,0.08)' }}>
                          <div className="h-full rounded-full" style={{ width: `${val}%`, background: color }} />
                        </div>
                        <span className="font-mono text-[0.5rem] w-6 text-right" style={{ color }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Reasoning */}
                  <div className="space-y-1">
                    <p className="nav-label text-[0.44rem]" style={{ color: ICE_DIM }}>
                      <span style={{ color: `${GOLD}88` }}>Workload: </span>{data.explainability.workloadReasoning}
                    </p>
                    <p className="nav-label text-[0.44rem]" style={{ color: ICE_DIM }}>
                      <span style={{ color: `${GOLD}88` }}>Credibility: </span>{data.explainability.credibilityReasoning}
                    </p>
                    <p className="nav-label text-[0.44rem]" style={{ color: ICE_DIM }}>
                      <span style={{ color: `${GOLD}88` }}>Integration: </span>{data.explainability.integrationReasoning}
                    </p>
                  </div>

                  {/* Detected risks */}
                  {data.explainability.detectedRisks.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {data.explainability.detectedRisks.map((r, i) => (
                        <span key={i} className="nav-label text-[0.42rem] px-1.5 py-0.5 rounded-sm"
                          style={{ background: 'rgba(248,113,113,0.07)', color: 'rgba(248,113,113,0.6)', border: '1px solid rgba(248,113,113,0.12)' }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Contributing systems */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {data.explainability.contributingSystems.map(s => (
                      <span key={s} className="nav-label text-[0.42rem] px-1.5 py-0.5 rounded-sm"
                        style={{ background: 'rgba(201,168,76,0.06)', color: `${GOLD}66`, border: `1px solid ${GOLD}18` }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Internship Archives Tab ───────────────────────────────────────────────────
function InternshipArchivesTab() {
  const [archives, setArchives] = useState<InternshipArchiveRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL')
  const [editModal, setEditModal] = useState<{ internId: string; name: string } | null>(null)

  const load = () => {
    setLoading(true)
    listInternshipArchives(filter === 'ALL' ? undefined : filter)
      .then(setArchives)
      .catch(() => setArchives([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3 py-1.5 rounded-sm nav-label text-[0.55rem] transition-all"
            style={{
              background: filter === s ? 'rgba(201,168,76,0.12)' : 'transparent',
              border: `1px solid ${filter === s ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.1)'}`,
              color: filter === s ? GOLD : ICE_DIM,
            }}>
            {s}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: GOLD }} /></div>}

      {!loading && archives.length === 0 && (
        <div className="glass-card rounded-sm p-10 text-center">
          <p className="font-body text-sm" style={{ color: ICE_DIM }}>No internship archive records yet.</p>
        </div>
      )}

      {!loading && archives.length > 0 && (
        <div className="glass-card rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="uris-table w-full">
              <thead><tr>
                <th className="text-left">Name</th>
                <th className="text-left">Department</th>
                <th className="text-center">Internship Role</th>
                <th className="text-center">Status</th>
                <th className="text-center">Rating</th>
                <th className="text-center">End Date</th>
                <th className="text-center">Actions</th>
              </tr></thead>
              <tbody>
                {archives.map(a => (
                  <tr key={a.id ?? a.internId}>
                    <td className="font-body text-sm text-frost/80">{a.fullName}</td>
                    <td className="font-body text-xs text-ice/50">{a.department || '—'}</td>
                    <td className="text-center"><RoleBadge role={a.internshipRole.toLowerCase()} /></td>
                    <td className="text-center"><StatusBadge status={a.status === 'COMPLETED' ? 'alumni' : 'active'} /></td>
                    <td className="text-center font-body text-xs text-ice/50">{a.performanceRating?.replace(/_/g, ' ') ?? '—'}</td>
                    <td className="text-center font-mono text-xs text-ice/40">
                      {a.internshipEndDate ? new Date(a.internshipEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td className="text-center">
                      <button onClick={() => setEditModal({ internId: a.internId, name: a.fullName })}
                        className="nav-label text-[0.48rem] px-2 py-1 rounded-sm"
                        style={{ background: 'rgba(201,168,76,0.1)', color: GOLD, border: '1px solid rgba(201,168,76,0.2)' }}>
                        EDIT
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editModal && (
        <InternshipArchiveModal
          internId={editModal.internId}
          internName={editModal.name}
          mode="edit"
          onClose={() => setEditModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}

// ── Onboarding Tab ────────────────────────────────────────────────────────────

/** Read-only: is EMAIL_DELIVERY_MODE=manual active on the frontend side? */
const IS_MANUAL_MODE = import.meta.env.VITE_MANUAL_ONBOARDING_MODE === 'true'

/** Formats the login URL from VITE_API_URL or falls back to the same origin. */
const LOGIN_URL = (() => {
  const api = import.meta.env.VITE_API_URL ?? ''
  if (!api) return `${window.location.origin}/login`
  // API is http://localhost:5000 → app is http://localhost:5173
  return api.replace(':5000', ':5173').replace(/\/+$/, '') + '/login'
})()

/** Builds the formatted clipboard block for one user. */
function buildCredentialBlock(email: string, tempPassword: string): string {
  return [
    '------------------------',
    'URIS Login',
    '',
    'Login URL:',
    LOGIN_URL,
    '',
    'Email:',
    email,
    '',
    'Temporary Password:',
    tempPassword,
    '',
    'You will be required to change your password after your first login.',
    '------------------------',
  ].join('\n')
}

function OnboardingTab({ users, onRefresh }: { users: GovernanceUser[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState<'ALL' | 'NOT_SENT' | 'SENDING' | 'SENT' | 'FAILED' | 'MANUAL'>('ALL')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string; manualMode?: boolean } | null>(null)
  const [generatedCreds, setGeneratedCreds] = useState<Record<string, string>>({})
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  // per-row copy feedback: userId → true for 2 s after copy
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Auto-clear credentials after 15 minutes for security
  useEffect(() => {
    if (Object.keys(generatedCreds).length === 0) return
    const timer = setTimeout(() => {
      setGeneratedCreds({})
      setMsg({ ok: true, text: 'Credentials cleared from memory after 15 minutes. Generate again if needed.' })
    }, 15 * 60 * 1000)
    return () => clearTimeout(timer)
  }, [generatedCreds])

  const filtered = users.filter(u => {
    if (filter !== 'ALL' && u.onboardingEmailStatus !== filter) return false
    if (search && !u.name?.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (u.status !== 'active' && u.status !== 'pending') return false
    return true
  })

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedIds(next)
  }

  const selectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(u => u.id)))
  }

  // ── Per-row generate ──────────────────────────────────────────────────────
  const handleGenerate = async (userId: string) => {
    setLoading(true); setMsg(null)
    try {
      const res = await sendCredentials(userId)
      if (res.tempPassword) {
        setGeneratedCreds(prev => ({ ...prev, [userId]: res.tempPassword! }))
      }
      if (res.isManualMode) {
        setMsg({ ok: true, text: 'Manual Delivery Mode — credentials generated. Copy and distribute below.', manualMode: true })
      } else if (res.emailSent) {
        setMsg({ ok: true, text: 'Credentials generated and email sent successfully.' })
      } else {
        setMsg({ ok: false, text: `Email dispatch failed: ${res.error ?? 'unknown error'}` })
      }
      onRefresh()
    } catch (err) {
      setMsg({ ok: false, text: extractErrorMessage(err, 'Failed to generate credentials.') })
    } finally {
      setLoading(false)
    }
  }

  // ── Bulk generate (selected) ──────────────────────────────────────────────
  const handleBulkGenerate = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Generate credentials for ${selectedIds.size} selected user(s)?`)) return
    setLoading(true); setMsg(null)
    try {
      const results = await sendCredentialsBulk(Array.from(selectedIds))
      const creds: Record<string, string> = {}
      let sentCount = 0; let failedCount = 0; let anyManual = false
      for (const res of results) {
        if (res.tempPassword) creds[res.userId] = res.tempPassword
        if (res.emailSent) sentCount++; else failedCount++
        if (res.isManualMode) anyManual = true
      }
      setGeneratedCreds(prev => ({ ...prev, ...creds }))
      setSelectedIds(new Set())
      if (anyManual) {
        setMsg({ ok: true, text: `Manual Delivery Mode — generated ${Object.keys(creds).length} credential(s). Copy and distribute below.`, manualMode: true })
      } else if (failedCount === 0) {
        setMsg({ ok: true, text: `Generated and sent ${sentCount} credential(s) successfully.` })
      } else {
        setMsg({ ok: false, text: `Generated credentials. ${sentCount} email(s) sent, ${failedCount} failed.` })
      }
      onRefresh()
    } catch (err) {
      setMsg({ ok: false, text: extractErrorMessage(err, 'Bulk generate failed.') })
    } finally {
      setLoading(false)
    }
  }

  const showPreview = async () => {
    try { setPreviewHtml(await getOnboardingEmailPreview()) }
    catch { alert('Failed to load email preview.') }
  }

  // ── Per-row copy ──────────────────────────────────────────────────────────
  const copyOneCredential = (userId: string) => {
    const u   = users.find(x => x.id === userId)
    const pwd = generatedCreds[userId]
    if (!u || !pwd) return
    navigator.clipboard.writeText(buildCredentialBlock(u.email, pwd))
    void logOnboardingAction('COPY_CREDENTIALS', userId, 1)
    setCopiedId(userId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ── Copy selected ─────────────────────────────────────────────────────────
  const copySelectedCredentials = () => {
    const eligible = Array.from(selectedIds).filter(id => generatedCreds[id])
    if (eligible.length === 0) { alert('Generate credentials for selected users first.'); return }
    const text = eligible.map(id => {
      const u = users.find(x => x.id === id)
      return buildCredentialBlock(u?.email ?? id, generatedCreds[id])
    }).join('\n\n')
    navigator.clipboard.writeText(text)
    void logOnboardingAction('COPY_CREDENTIALS', undefined, eligible.length)
    alert(`Copied credentials for ${eligible.length} user(s).`)
  }

  // ── Copy all pending (NOT_SENT / MANUAL with generated creds) ─────────────
  const copyAllPendingCredentials = () => {
    const eligible = Object.entries(generatedCreds)
    if (eligible.length === 0) { alert('No credentials generated yet.'); return }
    const text = eligible.map(([id, pwd]) => {
      const u = users.find(x => x.id === id)
      return buildCredentialBlock(u?.email ?? id, pwd)
    }).join('\n\n')
    navigator.clipboard.writeText(text)
    void logOnboardingAction('COPY_CREDENTIALS', undefined, eligible.length)
    alert(`Copied all ${eligible.length} credential block(s) to clipboard.`)
  }

  // ── Generate All Pending ──────────────────────────────────────────────────
  // Generates credentials for every active/pending user that has NOT yet had
  // credentials generated (NOT_SENT or MANUAL status).
  const handleGenerateAllPending = async () => {
    const pending = filtered.filter(
      // 'MANUAL' is a display-only label derived in the UI; the actual DB value is always 'NOT_SENT'
      u => u.onboardingEmailStatus === 'NOT_SENT' || u.onboardingEmailStatus === 'FAILED'
    )
    if (pending.length === 0) {
      alert('No pending users to generate credentials for.')
      return
    }
    if (!confirm(`Generate credentials for all ${pending.length} pending user(s)?`)) return

    setLoading(true); setMsg(null)
    try {
      const results = await sendCredentialsBulk(pending.map(u => u.id))
      const creds: Record<string, string> = {}
      let doneCount = 0; let failCount = 0; let anyManual = false
      for (const res of results) {
        if (res.tempPassword) { creds[res.userId] = res.tempPassword; doneCount++ }
        else failCount++
        if (res.isManualMode) anyManual = true
      }
      setGeneratedCreds(prev => ({ ...prev, ...creds }))
      if (anyManual) {
        setMsg({ ok: true, text: `Manual Delivery Mode — generated ${doneCount} credential(s). Copy and distribute below.`, manualMode: true })
      } else if (failCount === 0) {
        setMsg({ ok: true, text: `Generated and sent ${doneCount} credential(s) successfully.` })
      } else {
        setMsg({ ok: false, text: `Generated credentials. ${doneCount} succeeded, ${failCount} failed.` })
      }
      onRefresh()
    } catch (err) {
      setMsg({ ok: false, text: extractErrorMessage(err, 'Generate all pending failed.') })
    } finally {
      setLoading(false)
    }
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCredsCsv = () => {
    const header = 'Email,Name,TemporaryPassword,LoginURL\n'
    const rows = Object.entries(generatedCreds).map(([id, pwd]) => {
      const u = users.find(x => x.id === id)
      return `${u?.email ?? ''},${u?.name ?? ''},${pwd},${LOGIN_URL}`
    }).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'onboarding_credentials.csv'; a.click()
    URL.revokeObjectURL(url)
    void logOnboardingAction('EXPORT_CREDENTIALS', undefined, Object.keys(generatedCreds).length)
  }

  const hasCreds = Object.keys(generatedCreds).length > 0

  return (
    <div className="space-y-4">

      {/* ── Manual Delivery Mode persistent banner ── */}
      {IS_MANUAL_MODE && (
        <div className="flex items-start gap-3 p-4 rounded-sm"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="nav-label text-[0.6rem] text-amber-400 mb-0.5">MANUAL DELIVERY MODE ENABLED</p>
            <p className="font-body text-xs text-amber-400/70">
              Resend DNS is not yet configured. Emails will NOT be sent.
              Generate credentials below, then use <strong>Copy Credentials</strong> per row
              or <strong>Copy All</strong> to distribute them directly.
            </p>
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-navy-900/50 p-4 rounded-sm border border-ice/5">
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'NOT_SENT', 'SENDING', 'SENT', 'FAILED', 'MANUAL'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-sm nav-label text-[0.55rem] transition-all"
              style={{
                background: filter === s ? 'rgba(201,168,76,0.12)' : 'transparent',
                border: `1px solid ${filter === s ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.1)'}`,
                color: filter === s ? GOLD : ICE_DIM,
              }}>
              {s.replace('_', ' ')}
            </button>
          ))}
          <div className="w-px h-6 bg-ice/10 mx-2" />
          <input type="text" placeholder="Search..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="uris-input text-xs px-2 py-1.5 w-48" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!IS_MANUAL_MODE && (
            <button onClick={showPreview}
              className="btn-ghost py-1.5 px-3 text-[0.6rem] flex items-center gap-1.5">
              PREVIEW EMAIL
            </button>
          )}
          <button onClick={copySelectedCredentials}
            disabled={selectedIds.size === 0}
            className="btn-ghost py-1.5 px-3 text-[0.6rem] flex items-center gap-1.5 disabled:opacity-40">
            <Clipboard size={11} />
            COPY SELECTED ({selectedIds.size})
          </button>
          <button onClick={copyAllPendingCredentials}
            disabled={!hasCreds}
            className="btn-ghost py-1.5 px-3 text-[0.6rem] flex items-center gap-1.5 disabled:opacity-40">
            <Clipboard size={11} />
            COPY ALL PENDING
          </button>
          {IS_MANUAL_MODE && (
            <button onClick={handleGenerateAllPending}
              disabled={loading}
              className="btn-ghost py-1.5 px-3 text-[0.6rem] flex items-center gap-1.5 disabled:opacity-50"
              style={{ border: '1px solid rgba(201,168,76,0.25)', color: GOLD }}>
              {loading ? <Loader2 size={11} className="animate-spin" /> : <Key size={11} />}
              GENERATE ALL PENDING
            </button>
          )}
          <button onClick={handleBulkGenerate}
            disabled={loading || selectedIds.size === 0}
            className="btn-gold py-1.5 px-3 text-[0.6rem] flex items-center gap-1.5 disabled:opacity-50">
            {loading ? <Loader2 size={11} className="animate-spin" /> : <Key size={11} />}
            {IS_MANUAL_MODE ? 'GENERATE SELECTED' : 'BULK SEND'} ({selectedIds.size})
          </button>
        </div>
      </div>

      {/* ── Action feedback banner ── */}
      {msg && (
        <div className={`p-4 rounded-sm flex flex-col gap-1.5 ${
          msg.manualMode
            ? 'bg-amber-500/10 border border-amber-500/20'
            : msg.ok
              ? 'bg-green-500/10 border border-green-500/20'
              : 'bg-red-500/10 border border-red-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {msg.manualMode
              ? <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
              : msg.ok
                ? <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                : <X size={14} className="text-red-400 flex-shrink-0" />}
            <p className={`font-body text-sm ${
              msg.manualMode ? 'text-amber-400' : msg.ok ? 'text-green-400' : 'text-red-400'
            }`}>{msg.text}</p>
          </div>
          {msg.manualMode && (
            <p className="font-body text-xs text-amber-400/60 pl-6">
              Use the per-row <strong>Copy</strong> buttons or <strong>Copy All Pending</strong> above
              to distribute credentials directly to each user.
            </p>
          )}
        </div>
      )}

      {/* ── Generated credentials panel ── */}
      {hasCreds && (
        <div className="rounded-sm p-4 relative overflow-hidden"
          style={{ background: 'rgba(13,15,28,0.9)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0" />
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="nav-label text-[0.6rem] text-amber-400 mb-0.5">TEMPORARY CREDENTIALS</p>
              <p className="font-body text-xs text-ice/40">
                Not stored in the database. Cleared automatically after 15 minutes.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={copyAllPendingCredentials}
                className="btn-ghost py-1.5 px-3 text-[0.55rem] flex items-center gap-1.5">
                <Clipboard size={11} />
                COPY ALL
              </button>
              <button onClick={exportCredsCsv}
                className="btn-gold py-1.5 px-3 text-[0.55rem] flex items-center gap-1.5">
                EXPORT CSV
              </button>
            </div>
          </div>

          {/* Pilot temp password notice */}
          {IS_MANUAL_MODE && (
            <div className="mb-3 px-3 py-2 rounded-sm flex items-center gap-2"
              style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
              <Key size={11} className="text-gold flex-shrink-0" />
              <p className="font-body text-xs text-gold/70">
                Temporary Password for all users:&nbsp;
                <code className="font-mono text-gold select-all">Stemonef@2026!</code>
              </p>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5">
            {Object.entries(generatedCreds).map(([id, pwd]) => {
              const u = users.find(x => x.id === id)
              const copied = copiedId === id
              return (
                <div key={id}
                  className="flex items-center justify-between px-3 py-2 rounded-sm"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-ice/70 truncate">{u?.email ?? id}</p>
                    <p className="font-mono text-sm text-amber-300 select-all mt-0.5">{pwd}</p>
                  </div>
                  <button
                    onClick={() => copyOneCredential(id)}
                    title="Copy formatted credential block"
                    className="ml-3 flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-sm transition-colors nav-label text-[0.48rem]"
                    style={{
                      background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(201,168,76,0.08)',
                      border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'rgba(201,168,76,0.2)'}`,
                      color: copied ? '#4ade80' : GOLD,
                    }}>
                    {copied
                      ? <><ClipboardCheck size={11} />COPIED</>
                      : <><Clipboard size={11} />COPY</>}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── User table ── */}
      <div className="glass-card rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="uris-table w-full">
            <thead>
              <tr>
                <th className="w-8 text-center">
                  <input type="checkbox" className="uris-checkbox"
                    onChange={selectAll}
                    checked={selectedIds.size === filtered.length && filtered.length > 0} />
                </th>
                <th className="text-left">Name / Email</th>
                <th className="text-center">Role</th>
                <th className="text-center">Status</th>
                <th className="text-center">Delivery</th>
                <th className="text-center">Generated</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const hasCred = Boolean(generatedCreds[u.id])
                const isCopied = copiedId === u.id
                // Derive display label — MANUAL replaces FAILED/SENDING when in manual mode
                const rawStatus = u.onboardingEmailStatus as string
                const displayStatus = IS_MANUAL_MODE && (rawStatus === 'FAILED' || rawStatus === 'SENDING' || rawStatus === 'NOT_SENT')
                  ? 'MANUAL'
                  : rawStatus
                const statusColor =
                  displayStatus === 'SENT'    ? GREEN  :
                  displayStatus === 'FAILED'  ? RED    :
                  displayStatus === 'MANUAL'  ? AMBER  :
                  displayStatus === 'SENDING' ? BLUE   : ICE_DIM
                const statusBg =
                  displayStatus === 'SENT'    ? 'rgba(74,222,128,0.08)'   :
                  displayStatus === 'FAILED'  ? 'rgba(248,113,113,0.08)'  :
                  displayStatus === 'MANUAL'  ? 'rgba(245,158,11,0.08)'   :
                  displayStatus === 'SENDING' ? 'rgba(96,165,250,0.08)'   : 'rgba(184,212,240,0.04)'

                return (
                  <tr key={u.id} className={selectedIds.has(u.id) ? 'bg-gold/5' : ''}>
                    <td className="text-center">
                      <input type="checkbox" className="uris-checkbox"
                        checked={selectedIds.has(u.id)}
                        onChange={() => toggleSelect(u.id)} />
                    </td>
                    <td>
                      <p className="font-body text-sm text-frost/80">{u.name || '—'}</p>
                      <p className="font-mono text-xs text-ice/40">{u.email}</p>
                    </td>
                    <td className="text-center"><RoleBadge role={u.role.toLowerCase()} /></td>
                    <td className="text-center"><StatusBadge status={u.status} /></td>
                    <td className="text-center">
                      <span className="nav-label text-[0.5rem] px-2 py-0.5 rounded-full"
                        style={{ background: statusBg, color: statusColor }}>
                        {displayStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-center font-mono text-xs text-ice/40">
                      {u.credentialsGeneratedAt
                        ? new Date(u.credentialsGeneratedAt).toLocaleDateString('en-GB')
                        : '—'}
                    </td>
                    <td className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {/* Credentials ready indicator */}
                        {hasCred && (
                          <span className="nav-label text-[0.45rem] px-1.5 py-0.5 rounded-full flex items-center gap-1"
                            style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                            <ClipboardCheck size={9} />
                            CREDENTIALS READY
                          </span>
                        )}
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Generate button */}
                          <button
                            onClick={() => handleGenerate(u.id)}
                            disabled={loading}
                            className="nav-label text-[0.48rem] px-2 py-1 rounded-sm transition-colors disabled:opacity-50"
                            style={{ background: 'rgba(201,168,76,0.1)', color: GOLD, border: '1px solid rgba(201,168,76,0.2)' }}>
                            {hasCred ? 'REGEN' : 'GENERATE'}
                          </button>
                          {/* Per-row copy — only visible once credential is generated */}
                          {hasCred && (
                            <button
                              onClick={() => copyOneCredential(u.id)}
                              className="nav-label text-[0.48rem] px-2 py-1 rounded-sm transition-colors flex items-center gap-1"
                              style={{
                                background: isCopied ? 'rgba(74,222,128,0.12)' : 'rgba(96,165,250,0.08)',
                                color:      isCopied ? '#4ade80' : BLUE,
                                border:     `1px solid ${isCopied ? 'rgba(74,222,128,0.3)' : 'rgba(96,165,250,0.2)'}`,
                              }}>
                              {isCopied
                                ? <><ClipboardCheck size={10} />COPIED</>
                                : <><Clipboard size={10} />COPY</>}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-ice/40 font-body text-sm">
                    No users match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Email preview modal (email mode only) ── */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-sm">
          <div className="w-full max-w-4xl h-[80vh] flex flex-col rounded-sm overflow-hidden"
            style={{ background: '#0d0f1c', border: '1px solid rgba(201,168,76,0.2)' }}>
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
              <p className="nav-label text-[0.6rem] text-gold/60">EMAIL PREVIEW</p>
              <button onClick={() => setPreviewHtml(null)}
                className="text-ice/30 hover:text-frost transition-colors">
                <X size={15} />
              </button>
            </div>
            <iframe srcDoc={previewHtml} className="w-full flex-1 border-none bg-white" title="Email Preview" />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Governance() {
  const user    = useAuthStore(selectUser)
  const isAdmin = (user?.role as string) === ROLES.CORE_ADMIN

  const [tab, setTab]         = useState<Tab>('approvals')
  const [approvalSubTab, setApprovalSubTab] = useState<'pending' | 'history'>('pending')
  const [pending, setPending] = useState<ApprovalRequest[]>([])
  const [history, setHistory] = useState<ApprovalRequest[]>([])
  const [perms, setPerms]     = useState<PermissionsResponse | null>(null)
  const [users, setUsers]     = useState<GovernanceUser[]>([])
  const [roleHistory, setRoleHistory] = useState<RoleHistoryRecord[]>([])
  const [accessMatrix, setAccessMatrix] = useState<AccessMatrixResponse | null>(null)
  const [security, setSecurity] = useState<SecurityOverview | null>(null)
  const [intelligenceOverview, setIntelligenceOverview] = useState<GovernanceIntelligenceOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const promises: Promise<unknown>[] = [
          listApprovals({ status: 'pending' }).then(d => setPending(d.requests)),
          listApprovals({ status: 'approved' }).then(d => setHistory(d.requests)),
          getMyPermissions().then(setPerms),
        ]
        if (isAdmin) {
          promises.push(
            getAllUsers({ limit: 200 }).then(d => setUsers(d.users)),
            getRoleHistory({ limit: 100 }).then(d => setRoleHistory(d.records)),
            getAccessMatrix().then(setAccessMatrix),
            getSecurityOverview().then(setSecurity),
            getGovernanceIntelligenceOverview().then(setIntelligenceOverview).catch(() => {}),
          )
        }
        await Promise.all(promises)
      } catch (err) {
        setMsg({ ok: false, text: extractErrorMessage(err, 'Failed to load governance data.') })
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [isAdmin])

  async function handleApprove(id: string) {
    setActionLoading(id); setMsg(null)
    try {
      await approveRequest(id)
      setPending(prev => prev.filter(r => r.id !== id))
      setMsg({ ok: true, text: 'Request approved and action executed.' })
    } catch (err) { setMsg({ ok: false, text: extractErrorMessage(err, 'Approval failed.') }) }
    finally { setActionLoading(null) }
  }

  async function handleReject(id: string) {
    setActionLoading(id); setMsg(null)
    try {
      const updated = await rejectRequest(id)
      setPending(prev => prev.filter(r => r.id !== id))
      setHistory(prev => [updated, ...prev])
      setMsg({ ok: true, text: 'Request rejected.' })
    } catch (err) { setMsg({ ok: false, text: extractErrorMessage(err, 'Rejection failed.') }) }
    finally { setActionLoading(null) }
  }

  async function handleCancel(id: string) {
    setActionLoading(id); setMsg(null)
    try {
      await cancelApprovalRequest(id)
      setPending(prev => prev.filter(r => r.id !== id))
      setMsg({ ok: true, text: 'Request cancelled.' })
    } catch (err) { setMsg({ ok: false, text: extractErrorMessage(err, 'Cancel failed.') }) }
    finally { setActionLoading(null) }
  }

  async function handlePromotion(userId: string, newRole: string, reason: string) {
    await submitPromotionRequest({ targetUserId: userId, newRole, reason })
    const updated = await listApprovals({ status: 'pending' })
    setPending(updated.requests)
  }

  async function handleSaveMatrix(overrides: Record<string, string[]>) {
    await updateAccessMatrix(overrides)
    // Refresh the matrix so the UI reflects the saved state
    const updated = await getAccessMatrix()
    setAccessMatrix(updated)
  }

  async function handleRefreshUsers() {
    try {
      const d = await getAllUsers({ limit: 200 })
      setUsers(d.users)
    } catch (err) {
      setMsg({ ok: false, text: extractErrorMessage(err, 'Failed to refresh users.') })
    }
  }

  const TABS: { key: Tab; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
    { key: 'approvals',     label: 'APPROVALS',     icon: CheckCircle, },
    { key: 'promotions',    label: 'PROMOTIONS',     icon: TrendingUp,  adminOnly: true },
    { key: 'users',         label: 'USERS',          icon: Users,       adminOnly: true },
    { key: 'team-management', label: 'TEAM MANAGEMENT', icon: Users,    adminOnly: true },
    { key: 'internship-archives', label: 'INTERNSHIP ARCHIVES', icon: Archive, adminOnly: true },
    { key: 'onboarding',    label: 'ONBOARDING',     icon: Key,         adminOnly: true },
    { key: 'role-history',  label: 'ROLE HISTORY',   icon: Clock,       adminOnly: true },
    { key: 'access-matrix', label: 'PERMISSIONS',    icon: Lock,        adminOnly: true },
    { key: 'security',      label: 'SECURITY',       icon: Shield,      adminOnly: true },
    { key: 'permissions',   label: 'MY PERMISSIONS', icon: Key },
  ]

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin)

  return (
    <div className="min-h-screen bg-navy-950 text-frost">
      <Starfield />
      <Sidebar />
      <main className="md:ml-52 pt-14 min-h-screen relative z-10">
        <div className="px-4 md:px-8 py-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <p className="nav-label text-[0.55rem] mb-1" style={{ color: `${GOLD}66`, letterSpacing: '0.4em' }}>PHASE 8</p>
            <h1 className="font-display font-black text-3xl text-ice-gradient">Governance</h1>
            <div className="gold-rule w-14 mt-2" />
            <p className="font-body text-sm mt-2" style={{ color: ICE_DIM }}>
              Promotions · Approvals · Access matrix · Security oversight · Role governance
            </p>
          </motion.div>

          {loading && <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin" style={{ color: GOLD }} /></div>}

          {!loading && (
            <>
              {msg && <div className="mb-4"><FeedbackBanner ok={msg.ok} text={msg.text} /></div>}

              {/* Enterprise Intelligence Overview — admin only, shown above tabs */}
              {isAdmin && intelligenceOverview && (
                <GovernanceIntelligencePanel data={intelligenceOverview} />
              )}

              <div className="flex flex-wrap gap-1 mb-6 glass-card rounded-sm p-1 overflow-x-auto">
                {visibleTabs.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-sm nav-label text-[0.55rem] transition-all duration-200 whitespace-nowrap relative"
                    style={{
                      background:   tab === t.key ? 'rgba(201,168,76,0.12)' : 'transparent',
                      borderBottom: tab === t.key ? `2px solid ${GOLD}` : '2px solid transparent',
                      color:        tab === t.key ? GOLD : ICE_DIM,
                    }}>
                    <t.icon size={12} />
                    {t.label}
                    {t.key === 'approvals' && pending.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center nav-label text-[0.45rem]"
                        style={{ background: AMBER, color: '#000' }}>{pending.length}</span>
                    )}
                  </button>
                ))}
              </div>

              <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {tab === 'approvals'     && <ApprovalsTab pending={pending} history={history} currentUserId={user?.id ?? ''} onApprove={handleApprove} onReject={handleReject} onCancel={handleCancel} loading={actionLoading} subTab={approvalSubTab} setSubTab={setApprovalSubTab} />}
                {tab === 'promotions'    && <PromotionsTab users={users} onSubmit={handlePromotion} />}
                {tab === 'users'         && <UsersTab users={users} onRefresh={handleRefreshUsers} />}
                {tab === 'team-management' && <TeamManagementPanel />}
                {tab === 'internship-archives' && <InternshipArchivesTab />}
                {tab === 'onboarding'    && <OnboardingTab users={users} onRefresh={handleRefreshUsers} />}
                {tab === 'role-history'  && <RoleHistoryTab records={roleHistory} />}
                {tab === 'access-matrix' && <AccessMatrixTab matrix={accessMatrix} onSave={handleSaveMatrix} />}
                {tab === 'security'      && <SecurityTab security={security} />}
                {tab === 'permissions'   && <PermissionsTab perms={perms} />}
              </motion.div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
