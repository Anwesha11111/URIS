import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Loader2, User, AlertTriangle, Mail, Calendar, Briefcase, ClipboardList, CheckCircle2 } from 'lucide-react'
import { getInternProfile, type InternProfileData } from '../services/admin.service'
import { extractErrorMessage } from '../services/error'

const GOLD = '#c9a84c'
const ICE  = 'rgba(184,212,240,0.7)'

interface Props {
  internId:   string
  internName: string
  onClose:    () => void
}

function ScoreRing({ val, label }: { val: number; label: string }) {
  const r    = 22
  const circ = 2 * Math.PI * r
  const c    = val > 70 ? '#4ade80' : val > 40 ? '#f59e0b' : '#f87171'
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 52 52" className="w-14 h-14 -rotate-90">
          <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle cx="26" cy="26" r={r} fill="none" stroke={c} strokeWidth="3"
            strokeDasharray={`${circ * Math.min(val, 100) / 100} ${circ}`}
            strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-xs" style={{ color: c }}>
          {val}
        </span>
      </div>
      <span className="nav-label text-[0.45rem] text-ice/40">{label}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? '').toLowerCase()
  const map: Record<string, { label: string; color: string; bg: string }> = {
    active:      { label: 'Active',      color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
    pending:     { label: 'Pending',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
    alumni:      { label: 'Alumni',      color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
    suspended:   { label: 'Suspended',   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
    past_employee: { label: 'Alumni',    color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  }
  const cfg = map[s] ?? { label: status ?? '—', color: ICE, bg: 'rgba(184,212,240,0.06)' }
  return (
    <span className="nav-label text-[0.5rem] px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function TaskStatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    '#4ade80',
    completed: '#60a5fa',
    paused:    '#f59e0b',
    cancelled: '#f87171',
  }
  return (
    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0"
      style={{ background: map[status] ?? 'rgba(184,212,240,0.3)', verticalAlign: 'middle' }} />
  )
}

export default function InternProfileModal({ internId, internName, onClose }: Props) {
  const [profile, setProfile] = useState<InternProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    getInternProfile(internId)
      .then(setProfile)
      .catch(err => setError(extractErrorMessage(err, 'Failed to load intern profile.')))
      .finally(() => setLoading(false))
  }, [internId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-card rounded-sm w-full max-w-2xl my-auto flex flex-col max-h-[90vh]"
        style={{ border: '1px solid rgba(201,168,76,0.2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <div className="flex items-center gap-3">
            <User size={15} className="text-gold" />
            <div>
              <p className="nav-label text-[0.55rem] text-gold/50">INTERN PROFILE</p>
              <p className="font-display font-bold text-sm text-frost/90">{internName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ice/30 hover:text-ice/70 p-1">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="text-gold animate-spin" />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-start gap-3 p-4 rounded-sm"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="font-body text-sm text-red-400">{error}</p>
            </div>
          )}

          {!loading && profile && (
            <>
              {/* Identity block */}
              <section className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-sm flex-shrink-0 overflow-hidden"
                  style={{ border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.06)' }}>
                  {profile.profilePictureUrl
                    ? <img src={profile.profilePictureUrl} alt={profile.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <User size={24} style={{ color: GOLD, opacity: 0.5 }} />
                      </div>
                  }
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display font-bold text-lg text-frost truncate">{profile.name}</h2>
                    <StatusBadge status={profile.status} />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Mail size={10} style={{ color: ICE, opacity: 0.5 }} />
                    <span className="font-body text-xs text-ice/50">{profile.email ?? '—'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Briefcase size={10} style={{ color: GOLD, opacity: 0.6 }} />
                    <span className="nav-label text-[0.5rem] text-ice/50">
                      {profile.role?.replace(/_/g, ' ') ?? '—'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 pt-0.5">
                    {profile.joiningDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={9} style={{ color: ICE, opacity: 0.4 }} />
                        <span className="nav-label text-[0.45rem] text-ice/35">
                          Joined {new Date(profile.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    {profile.dateOfBirth && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={9} style={{ color: ICE, opacity: 0.4 }} />
                        <span className="nav-label text-[0.45rem] text-ice/35">
                          DOB {new Date(profile.dateOfBirth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Score rings */}
              <section>
                <p className="nav-label text-[0.55rem] text-gold/40 mb-3">PERFORMANCE METRICS</p>
                <div className="flex items-center justify-around p-4 rounded-sm"
                  style={{ background: 'rgba(184,212,240,0.02)', border: '1px solid rgba(184,212,240,0.06)' }}>
                  <ScoreRing val={profile.capacityScore}        label="CAPACITY" />
                  <ScoreRing val={Math.round(profile.rpi * 20)} label="RPI" />
                  <ScoreRing val={profile.credibilityScore}     label="CRED." />
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono text-lg"
                      style={{ color: profile.tli <= 6 ? '#4ade80' : profile.tli <= 12 ? '#f59e0b' : '#f87171' }}>
                      {profile.tli.toFixed(1)}
                    </span>
                    <span className="nav-label text-[0.45rem] text-ice/40">TLI</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="p-3 rounded-sm text-center"
                    style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.1)' }}>
                    <p className="font-mono text-xl text-green-400">{profile.activeTasks}</p>
                    <p className="nav-label text-[0.45rem] text-ice/35 mt-0.5">ACTIVE TASKS</p>
                  </div>
                  <div className="p-3 rounded-sm text-center"
                    style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.1)' }}>
                    <p className="font-mono text-xl text-blue-400">{profile.completedTasks}</p>
                    <p className="nav-label text-[0.45rem] text-ice/35 mt-0.5">COMPLETED</p>
                  </div>
                </div>
              </section>

              {/* Recent tasks */}
              {profile.recentTasks.length > 0 && (
                <section>
                  <p className="nav-label text-[0.55rem] text-gold/40 mb-3">RECENT TASKS</p>
                  <div className="space-y-2">
                    {profile.recentTasks.slice(0, 8).map(task => (
                      <div key={task.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-sm"
                        style={{ background: 'rgba(184,212,240,0.02)', border: '1px solid rgba(184,212,240,0.06)' }}>
                        <TaskStatusDot status={task.status} />
                        <span className="font-body text-xs text-frost/70 flex-1 min-w-0 truncate">{task.title}</span>
                        <span className="nav-label text-[0.45rem] text-ice/30 flex-shrink-0">
                          {task.progressPct}%
                        </span>
                        {task.deadline && (
                          <span className="nav-label text-[0.43rem] text-ice/25 flex-shrink-0 hidden sm:block">
                            {new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Internship archive summary */}
              {profile.internshipArchive && (
                <section>
                  <p className="nav-label text-[0.55rem] text-gold/40 mb-3">INTERNSHIP RECORD</p>
                  <div className="p-4 rounded-sm space-y-2"
                    style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.12)' }}>
                    <div className="flex items-center justify-between">
                      <span className="nav-label text-[0.5rem] text-ice/50">Status</span>
                      <span className="nav-label text-[0.5rem]"
                        style={{ color: profile.internshipArchive.status === 'COMPLETED' ? '#60a5fa' : '#4ade80' }}>
                        {profile.internshipArchive.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="nav-label text-[0.5rem] text-ice/50">Role</span>
                      <span className="nav-label text-[0.5rem] text-ice/70">
                        {profile.internshipArchive.internshipRole?.replace(/_/g, ' ') ?? '—'}
                      </span>
                    </div>
                    {profile.internshipArchive.internshipEndDate && (
                      <div className="flex items-center justify-between">
                        <span className="nav-label text-[0.5rem] text-ice/50">End Date</span>
                        <span className="nav-label text-[0.5rem] text-ice/70">
                          {new Date(profile.internshipArchive.internshipEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    {profile.internshipArchive.verificationId && (
                      <div className="flex items-center justify-between">
                        <span className="nav-label text-[0.5rem] text-ice/50">Verification ID</span>
                        <span className="font-mono text-[0.48rem] text-ice/50">
                          {profile.internshipArchive.verificationId}
                        </span>
                      </div>
                    )}
                    {profile.internshipArchive.completedAt && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <CheckCircle2 size={10} className="text-blue-400" />
                        <span className="nav-label text-[0.45rem] text-ice/40">
                          Completed {new Date(profile.internshipArchive.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* GDoc link */}
              {profile.gdocUrl && (
                <section>
                  <p className="nav-label text-[0.55rem] text-gold/40 mb-2">GOOGLE DOC</p>
                  <a href={profile.gdocUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-sm nav-label text-[0.5rem] transition-colors"
                    style={{ background: 'rgba(184,212,240,0.04)', border: '1px solid rgba(184,212,240,0.1)', color: ICE }}>
                    <ClipboardList size={11} />
                    Open Intern Document
                  </a>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(201,168,76,0.08)' }}>
          <button onClick={onClose}
            className="w-full py-2.5 rounded-sm nav-label text-[0.55rem] transition-colors"
            style={{ border: '1px solid rgba(184,212,240,0.15)', color: 'rgba(184,212,240,0.5)' }}>
            CLOSE
          </button>
        </div>
      </motion.div>
    </div>
  )
}
