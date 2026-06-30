import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Users, Shield, ShieldCheck, ShieldAlert, Archive, Edit2, RefreshCw, Trash2, Check, X, Loader2 } from 'lucide-react'
import {
  listAllTeams, createTeam, updateTeam, archiveTeam, restoreTeam,
  adminAddMember, adminRemoveMember, type TeamDetail
} from '../services/team.service'
import { getAllUsers, type GovernanceUser } from '../services/governance.service'
import { extractErrorMessage } from '../services/error'
import { getAllTasks, type Task } from '../services/tasks.service'
import { useAuthStore, selectUser } from '../store/authStore'
import { getPermissions } from '../utils/permissions'
import { Link } from 'react-router-dom'
import { MessageSquare, CalendarClock } from 'lucide-react'

const GOLD    = '#c9a84c'
const ICE_DIM = 'rgba(184,212,240,0.25)'
const GREEN   = '#4ade80'
const AMBER   = '#f59e0b'
const RED     = '#f87171'
const BLUE    = '#60a5fa'

export default function TeamManagementPanel() {
  const [teams, setTeams] = useState<TeamDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null)
  
  // Create/Edit State
  const [showCreate, setShowCreate] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  
  const loadTeams = async () => {
    setLoading(true)
    try {
      const data = await listAllTeams(true) // includeArchived = true
      setTeams(data)
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load teams.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTeams()
  }, [])

  const handleCreate = async () => {
    try {
      if (!editName.trim()) return
      await createTeam({ name: editName, description: editDesc })
      setShowCreate(false)
      setEditName(''); setEditDesc('')
      void loadTeams()
    } catch (err) {
      alert(extractErrorMessage(err, 'Create failed'))
    }
  }

  const handleArchive = async (id: string, isArchived: boolean) => {
    try {
      if (isArchived) {
        await restoreTeam(id)
      } else {
        await archiveTeam(id)
      }
      void loadTeams()
      if (selectedTeam?.id === id) setSelectedTeam(null)
    } catch (err) {
      alert(extractErrorMessage(err, 'Action failed'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display font-black text-xl" style={{ color: GOLD }}>Teams</h2>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm nav-label text-[0.55rem] transition-all"
          style={{ background: 'rgba(74,222,128,0.12)', color: GREEN, border: '1px solid rgba(74,222,128,0.2)' }}>
          <Plus size={12} /> NEW TEAM
        </button>
      </div>

      {showCreate && (
        <div className="glass-card rounded-sm p-4 mb-4">
          <h3 className="nav-label text-[0.55rem] mb-3" style={{ color: GOLD }}>CREATE NEW TEAM</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="nav-label text-[0.5rem] block mb-1" style={{ color: ICE_DIM }}>TEAM NAME</label>
              <input value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full bg-navy-900 rounded-sm px-3 py-2 font-body text-sm text-frost border"
                style={{ borderColor: 'rgba(184,212,240,0.1)' }} placeholder="e.g., Core Platform" />
            </div>
            <div>
              <label className="nav-label text-[0.5rem] block mb-1" style={{ color: ICE_DIM }}>DESCRIPTION</label>
              <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                className="w-full bg-navy-900 rounded-sm px-3 py-2 font-body text-sm text-frost border"
                style={{ borderColor: 'rgba(184,212,240,0.1)' }} placeholder="Optional" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 nav-label text-[0.55rem]" style={{ color: ICE_DIM }}>CANCEL</button>
            <button onClick={() => void handleCreate()} className="px-4 py-1.5 nav-label text-[0.55rem] rounded-sm bg-gold/10 text-gold border border-gold/20">SAVE</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-gold" /></div>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            {teams.map(team => (
              <div key={team.id} 
                onClick={() => setSelectedTeam(team)}
                className="glass-card rounded-sm p-4 cursor-pointer transition-all"
                style={{ borderColor: selectedTeam?.id === team.id ? 'rgba(201,168,76,0.4)' : 'rgba(184,212,240,0.1)' }}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-display text-lg text-frost truncate pr-2">{team.name}</h3>
                  <span className="nav-label text-[0.45rem] px-2 py-0.5 rounded-sm"
                    style={{
                      background: team.status === 'ACTIVE' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                      color: team.status === 'ACTIVE' ? GREEN : RED
                    }}>
                    {team.status}
                  </span>
                </div>
                <p className="font-body text-xs text-ice/40 line-clamp-2 mb-3 h-8">{team.description || 'No description'}</p>
                <div className="flex justify-between items-center pt-3 border-t border-ice/5">
                  <div className="flex items-center gap-1.5 text-ice/60 nav-label text-[0.5rem]">
                    <Users size={10} /> {team._count?.members ?? team.members?.filter(m => !m.leftAt).length ?? 0} MEMBERS
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedTeam ? (
              <TeamDetailView team={selectedTeam} onRefresh={loadTeams} onArchive={handleArchive} />
            ) : (
              <div className="glass-card rounded-sm p-12 text-center flex flex-col items-center border-ice/5">
                <Users size={32} className="text-ice/20 mb-4" />
                <p className="font-body text-sm text-ice/40">Select a team to manage members and leads.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MoveTeamModal({ userId, currentTeamId, onClose, onRefresh }: { userId: string, currentTeamId: string, onClose: () => void, onRefresh: () => void }) {
  const [teams, setTeams] = useState<TeamDetail[]>([])
  const [newTeamId, setNewTeamId] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    listAllTeams(false).then(setTeams).catch(err => setMsg({ ok: false, text: 'Failed to load teams' }))
  }, [])

  async function handleMove() {
    if (!newTeamId || newTeamId === currentTeamId) return
    setLoading(true)
    try {
      await adminRemoveMember(currentTeamId, userId)
      await adminAddMember(newTeamId, userId, 'MEMBER')
      setMsg({ ok: true, text: 'User moved successfully.' })
      setTimeout(() => {
        onRefresh()
        onClose()
      }, 1000)
    } catch (err) {
      setMsg({ ok: false, text: extractErrorMessage(err, 'Failed to move user.') })
      setLoading(false)
    }
  }

  const otherTeams = teams.filter(t => t.id !== currentTeamId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-sm p-6 rounded-sm border-gold/20 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-ice/40 hover:text-frost">
          <X size={16} />
        </button>
        <h2 className="font-display font-black text-lg text-gold mb-4">Move User</h2>
        <div className="space-y-4">
          <div>
            <label className="nav-label text-[0.55rem] text-ice/60 block mb-1">SELECT NEW TEAM</label>
            <select value={newTeamId} onChange={e => setNewTeamId(e.target.value)} className="uris-input w-full">
              <option value="">Select Team...</option>
              {otherTeams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          {msg && <p className={`text-xs ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs nav-label text-ice/60 hover:text-frost">CANCEL</button>
            <button type="button" disabled={loading || !newTeamId} onClick={() => void handleMove()}
              className="px-4 py-2 text-xs nav-label rounded-sm bg-gold/10 text-gold border border-gold/20 flex items-center gap-2 hover:bg-gold/20 transition-colors disabled:opacity-50">
              {loading && <Loader2 size={12} className="animate-spin" />}
              MOVE
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function TeamDetailView({ team, onRefresh, onArchive }: { team: TeamDetail, onRefresh: () => void, onArchive: (id: string, isArchived: boolean) => void }) {
  const [users, setUsers] = useState<GovernanceUser[]>([])
  const [loading, setLoading] = useState(false)
  const [addMode, setAddMode] = useState<'MEMBER' | 'LEAD' | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TASKS' | 'REVIEWS' | 'ACTIVITY'>('OVERVIEW')
  const [movingUserId, setMovingUserId] = useState<string | null>(null)

  useEffect(() => {
    getAllUsers({ limit: 500 }).then(res => setUsers(res.users)).catch(console.error)
  }, [])

  const leads = team.members?.filter(m => m.role === 'LEAD' && !m.leftAt) ?? []
  const members = team.members?.filter(m => m.role === 'MEMBER' && !m.leftAt) ?? []

  const handleAddUser = async () => {
    if (!selectedUserId || !addMode) return
    setLoading(true)
    try {
      await adminAddMember(team.id, selectedUserId, addMode)
      setAddMode(null)
      setSelectedUserId('')
      onRefresh()
    } catch (err) {
      alert(extractErrorMessage(err, 'Failed to add user'))
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!window.confirm('Remove user from team?')) return
    setLoading(true)
    try {
      await adminRemoveMember(team.id, userId)
      onRefresh()
    } catch (err) {
      alert(extractErrorMessage(err, 'Failed to remove user'))
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, currentRole: 'LEAD' | 'MEMBER') => {
    const newRole = currentRole === 'LEAD' ? 'MEMBER' : 'LEAD'
    if (!window.confirm(`Change user role to ${newRole}?`)) return
    setLoading(true)
    try {
      await adminRemoveMember(team.id, userId)
      await adminAddMember(team.id, userId, newRole)
      onRefresh()
    } catch (err) {
      alert(extractErrorMessage(err, 'Failed to change role'))
    } finally {
      setLoading(false)
    }
  }

  // Filter out users already in the team actively
  const activeUserIds = team.members?.filter(m => !m.leftAt).map(m => m.userId) ?? []
  const availableUsers = users.filter(u => !activeUserIds.includes(u.id))

  return (
    <div className="glass-card rounded-sm p-6 border-gold/20">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="font-display font-black text-2xl text-ice-gradient mb-1">{team.name}</h2>
          <p className="font-body text-sm text-ice/50">{team.description || 'No description provided.'}</p>
        </div>
        <button onClick={() => onArchive(team.id, team.status === 'ARCHIVED')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm nav-label text-[0.55rem] transition-all"
          style={{
            background: team.status === 'ARCHIVED' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
            color: team.status === 'ARCHIVED' ? GREEN : RED,
            border: `1px solid ${team.status === 'ARCHIVED' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`
          }}>
          {team.status === 'ARCHIVED' ? <RefreshCw size={12} /> : <Archive size={12} />}
          {team.status === 'ARCHIVED' ? 'RESTORE TEAM' : 'ARCHIVE TEAM'}
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6 border-b border-ice/10">
        {(['OVERVIEW', 'TASKS', 'REVIEWS', 'ACTIVITY'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-2 nav-label text-[0.6rem] transition-all border-b-2 ${activeTab === tab ? 'text-gold border-gold' : 'text-ice/40 border-transparent hover:text-ice/70'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEADS */}
        <div>
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-ice/10">
            <h3 className="nav-label text-[0.55rem] text-gold/80 flex items-center gap-1.5">
              <ShieldCheck size={12} /> LEADS ({leads.length})
            </h3>
            {team.status === 'ACTIVE' && (
              <button onClick={() => setAddMode(addMode === 'LEAD' ? null : 'LEAD')} className="text-gold/60 hover:text-gold"><Plus size={14}/></button>
            )}
          </div>
          
          {addMode === 'LEAD' && (
            <div className="mb-3 flex gap-2">
              <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
                className="flex-1 bg-navy-900 rounded-sm px-2 py-1 text-xs border border-ice/10 text-frost">
                <option value="">Select User...</option>
                {availableUsers.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select>
              <button onClick={() => void handleAddUser()} disabled={loading || !selectedUserId}
                className="px-2 py-1 rounded-sm bg-gold/20 text-gold text-xs font-bold disabled:opacity-50">ADD</button>
            </div>
          )}

          <div className="space-y-2">
            {leads.length === 0 && <p className="text-xs text-ice/40 italic">No leads assigned.</p>}
            {leads.map(m => (
              <div key={m.id} className="flex justify-between items-center bg-navy-900/50 rounded-sm p-2 border border-ice/5">
                <div>
                  <p className="text-sm text-frost">{m.user.name || m.user.email}</p>
                  <p className="text-xs text-ice/40">{m.user.role.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => void handleRoleChange(m.userId, 'LEAD')} className="text-blue-400/60 hover:text-blue-400 nav-label text-[0.45rem] px-2 py-1 rounded-sm border border-blue-400/20 bg-blue-400/5">DEMOTE TO MEMBER</button>
                  <button onClick={() => setMovingUserId(m.userId)} className="text-gold/60 hover:text-gold nav-label text-[0.45rem] px-2 py-1 rounded-sm border border-gold/20 bg-gold/5">MOVE TEAM</button>
                  <button onClick={() => void handleRemoveUser(m.userId)} className="text-red-400/60 hover:text-red-400 p-1"><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MEMBERS */}
        <div>
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-ice/10">
            <h3 className="nav-label text-[0.55rem] text-blue-400/80 flex items-center gap-1.5">
              <Users size={12} /> MEMBERS ({members.length})
            </h3>
            {team.status === 'ACTIVE' && (
              <button onClick={() => setAddMode(addMode === 'MEMBER' ? null : 'MEMBER')} className="text-blue-400/60 hover:text-blue-400"><Plus size={14}/></button>
            )}
          </div>

          {addMode === 'MEMBER' && (
            <div className="mb-3 flex gap-2">
              <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
                className="flex-1 bg-navy-900 rounded-sm px-2 py-1 text-xs border border-ice/10 text-frost">
                <option value="">Select User...</option>
                {availableUsers.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select>
              <button onClick={() => void handleAddUser()} disabled={loading || !selectedUserId}
                className="px-2 py-1 rounded-sm bg-blue-500/20 text-blue-400 text-xs font-bold disabled:opacity-50">ADD</button>
            </div>
          )}

          <div className="space-y-2">
            {members.length === 0 && <p className="text-xs text-ice/40 italic">No members assigned.</p>}
            {members.map(m => (
              <div key={m.id} className="flex justify-between items-center bg-navy-900/50 rounded-sm p-2 border border-ice/5">
                <div className="truncate pr-2">
                  <p className="text-sm text-frost truncate">{m.user.name || m.user.email}</p>
                  <p className="text-xs text-ice/40">{m.user.role.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => void handleRoleChange(m.userId, 'MEMBER')} className="text-purple-400/60 hover:text-purple-400 nav-label text-[0.45rem] px-2 py-1 rounded-sm border border-purple-400/20 bg-purple-400/5">PROMOTE TO LEAD</button>
                  <button onClick={() => setMovingUserId(m.userId)} className="text-gold/60 hover:text-gold nav-label text-[0.45rem] px-2 py-1 rounded-sm border border-gold/20 bg-gold/5">MOVE TEAM</button>
                  <button onClick={() => void handleRemoveUser(m.userId)} className="text-red-400/60 hover:text-red-400 p-1"><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {activeTab === 'TASKS' && (
        <TeamTasksTab team={team} />
      )}
      
      {activeTab === 'REVIEWS' && (
        <div className="py-12 text-center text-ice/40 italic text-sm">Reviews tab under construction.</div>
      )}

      {activeTab === 'ACTIVITY' && (
        <div className="py-12 text-center text-ice/40 italic text-sm">Activity tab under construction.</div>
      )}

      {movingUserId && (
        <MoveTeamModal 
          userId={movingUserId} 
          currentTeamId={team.id} 
          onClose={() => setMovingUserId(null)} 
          onRefresh={onRefresh} 
        />
      )}
    </div>
  )
}

function TeamTasksTab({ team }: { team: TeamDetail }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const user = useAuthStore(selectUser)
  const permissions = getPermissions(user?.role || '')

  useEffect(() => {
    getAllTasks({ teamId: team.id })
      .then(res => {
        setTasks(res)
        setLoading(false)
      })
      .catch(err => {
        setError(extractErrorMessage(err, 'Failed to load team tasks'))
        setLoading(false)
      })
  }, [team.id])

  if (loading) return <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-gold" /></div>
  if (error) return <p className="text-red-400 text-sm">{error}</p>

  const activeTasks = tasks.filter(t => t.status !== 'completed').length
  const blockedTasks = tasks.filter(t => t.hasBlocker || t.blocker).length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const pendingReviews = 0 

  const leadsCount = team.members?.filter(m => m.role === 'LEAD' && !m.leftAt).length || 0
  const membersCount = team.members?.filter(m => m.role === 'MEMBER' && !m.leftAt).length || 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Members', val: membersCount, c: '#60a5fa' },
          { label: 'Leads', val: leadsCount, c: '#a78bfa' },
          { label: 'Active Tasks', val: activeTasks, c: '#c9a84c' },
          { label: 'Blocked', val: blockedTasks, c: '#f87171' },
          { label: 'Completed', val: completedTasks, c: '#4ade80' },
          { label: 'Pending Reviews', val: pendingReviews, c: '#b8d4f0' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-sm p-3 border-ice/5 text-center">
            <p className="font-display font-black text-xl" style={{ color: s.c }}>{s.val}</p>
            <p className="nav-label text-[0.55rem] text-ice/40 uppercase mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-sm overflow-hidden border-ice/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-navy-900/50 border-b border-ice/10 nav-label text-[0.55rem] text-ice/50 uppercase">
                <th className="p-3 font-normal">Task</th>
                <th className="p-3 font-normal">Assigned To</th>
                <th className="p-3 font-normal">Status</th>
                <th className="p-3 font-normal">Progress</th>
                <th className="p-3 font-normal">Due Date</th>
                <th className="p-3 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-body text-sm text-frost/90">
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-ice/30 text-xs italic">No tasks found for this team.</td>
                </tr>
              )}
              {tasks.map(t => (
                <tr key={t.id} className="border-b border-ice/5 hover:bg-navy-900/30 transition-colors">
                  <td className="p-3 max-w-[200px] truncate" title={t.title}>{t.title}</td>
                  <td className="p-3">{t.assignee || 'Unknown'}</td>
                  <td className="p-3 text-xs capitalize text-ice/70">{t.status.replace(/_/g, ' ')}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-8 text-right text-gold/80">{t.progressPct || t.progress || 0}%</span>
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden min-w-[50px]">
                        <div className="h-full bg-gold rounded-full" style={{ width: `${t.progressPct || t.progress || 0}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-ice/50">{t.deadline || '—'}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {permissions.canAssign !== 'NO' && (
                        <>
                          <button className="text-blue-400/60 hover:text-blue-400 text-xs px-2" title="Assign">Assign</button>
                          <button className="text-gold/60 hover:text-gold text-xs px-2" title="Review">Review</button>
                          <button className="text-green-400/60 hover:text-green-400 text-xs px-2" title="Chat"><MessageSquare size={14}/></button>
                          {user?.role === 'core_admin' && (
                            <button className="text-red-400/60 hover:text-red-400 text-xs px-2 border-l border-white/10 pl-2 ml-1" title="Finish Internship">Finish</button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
