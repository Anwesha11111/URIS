import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Starfield from '../components/Starfield'
import { dashboardAPI } from '../api/endpoints'

type InternProfile = {
  id: string; name: string; email?: string; college?: string
  capacityScore: number; tli: number; rpi: number; credibilityScore: number
  availability: string; taskCount: number; skill_tags?: string[]
}

const MOCK_TEAM: InternProfile[] = [
  { id: '1', name: 'Ananya Seeta',   college: 'VIT Chennai',      capacityScore: 82, tli: 4.2,  rpi: 4.3, credibilityScore: 88, availability: 'Available', taskCount: 2,  skill_tags: ['Frontend','Testing'] },
  { id: '2', name: 'Riya Nair',      college: 'PSG Tech',         capacityScore: 67, tli: 7.8,  rpi: 3.8, credibilityScore: 71, availability: 'Partial',   taskCount: 4,  skill_tags: ['Backend','AI/ML'] },
  { id: '3', name: 'Arjun Mehta',    college: 'NIT Trichy',       capacityScore: 55, tli: 9.1,  rpi: 3.1, credibilityScore: 62, availability: 'Partial',   taskCount: 5,  skill_tags: ['Backend'] },
  { id: '4', name: 'Priya Verma',    college: 'BITS Pilani',      capacityScore: 91, tli: 2.0,  rpi: 4.8, credibilityScore: 94, availability: 'Available', taskCount: 1,  skill_tags: ['Backend','Research'] },
  { id: '5', name: 'Karthik Suresh', college: 'Anna University',  capacityScore: 28, tli: 13.4, rpi: 2.2, credibilityScore: 41, availability: 'Occupied',  taskCount: 7,  skill_tags: ['DevOps','Backend'] },
  { id: '6', name: 'Meghna Das',     college: 'Jadavpur Uni.',    capacityScore: 73, tli: 5.9,  rpi: 4.0, credibilityScore: 79, availability: 'Available', taskCount: 3,  skill_tags: ['DevOps','Frontend'] },
]

const SKILL_COLORS: Record<string, string> = {
  Frontend: '#b8d4f0', Backend: '#c9a84c', DevOps: '#4ade80',
  Testing: '#a78bfa', 'AI/ML': '#fb923c', Research: '#34d399',
}

function RingScore({ val, label }: { val: number; label: string }) {
  const r = 22; const circ = 2 * Math.PI * r
  const c = val > 70 ? '#4ade80' : val > 40 ? '#f59e0b' : '#f87171'
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 52 52" className="w-14 h-14 -rotate-90">
          <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <motion.circle cx="26" cy="26" r={r} fill="none" stroke={c} strokeWidth="3"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - val / 100) }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display font-black text-sm"
          style={{ color: c }}>{val}</span>
      </div>
      <span className="nav-label text-[0.5rem] text-ice/40">{label}</span>
    </div>
  )
}

export default function Team() {
  const [team, setTeam] = useState<InternProfile[]>(MOCK_TEAM)
  const [selected, setSelected] = useState<InternProfile | null>(null)

  useEffect(() => {
    dashboardAPI.getAdminOverview()
      .then(res => { if (res.data?.interns?.length) setTeam(res.data.interns) })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-navy-950 text-frost">
      <Starfield />
      <Sidebar />
      <main className="ml-52 pt-14 min-h-screen relative z-10">
        <div className="px-8 py-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="nav-label text-[0.55rem] text-gold/40 tracking-ultra mb-1">COHORT OVERVIEW</p>
            <h1 className="font-display font-black text-3xl text-ice-gradient">Team Intelligence</h1>
            <div className="gold-rule w-14 mt-2" />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {team.map((intern, i) => (
              <motion.div key={intern.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4, borderColor: 'rgba(201,168,76,0.3)' }}
                onClick={() => setSelected(intern === selected ? null : intern)}
                className="glass-card rounded-sm p-6 cursor-pointer"
                style={{ borderColor: selected?.id === intern.id ? 'rgba(201,168,76,0.35)' : undefined }}>

                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-display text-lg text-frost">{intern.name}</p>
                    <p className="font-body text-xs text-ice/40">{intern.college || '—'}</p>
                  </div>
                  <span className="nav-label text-[0.5rem] px-2 py-0.5 rounded-full"
                    style={{
                      background: intern.availability === 'Available' ? 'rgba(74,222,128,0.12)' : intern.availability === 'Partial' ? 'rgba(245,158,11,0.12)' : 'rgba(248,113,113,0.12)',
                      color: intern.availability === 'Available' ? '#4ade80' : intern.availability === 'Partial' ? '#f59e0b' : '#f87171',
                    }}>{intern.availability}</span>
                </div>

                {/* Score rings */}
                <div className="flex items-center justify-around mb-4">
                  <RingScore val={intern.capacityScore}    label="CAPACITY" />
                  <RingScore val={Math.round(intern.rpi * 20)} label="RPI" />
                  <RingScore val={intern.credibilityScore} label="CRED." />
                </div>

                {/* TLI bar */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="nav-label text-[0.5rem] text-gold/40">TASK LOAD INDEX</span>
                    <span className="font-mono text-xs"
                      style={{ color: intern.tli <= 6 ? '#4ade80' : intern.tli <= 12 ? '#f59e0b' : '#f87171' }}>
                      {intern.tli?.toFixed(1)}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <motion.div initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (intern.tli / 15) * 100)}%` }}
                      transition={{ duration: 1, delay: i * 0.05 + 0.3 }}
                      style={{
                        height: '100%', borderRadius: 2,
                        background: intern.tli <= 6 ? 'linear-gradient(90deg,#4ade8055,#4ade80)' : intern.tli <= 12 ? 'linear-gradient(90deg,#f59e0b55,#f59e0b)' : 'linear-gradient(90deg,#f8717155,#f87171)',
                      }} />
                  </div>
                </div>

                {/* Skill tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(intern.skill_tags || []).map(tag => (
                    <span key={tag} className="nav-label text-[0.5rem] px-2 py-0.5 rounded-sm"
                      style={{ background: `${SKILL_COLORS[tag] || '#c9a84c'}15`, color: SKILL_COLORS[tag] || '#c9a84c' }}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3"
                  style={{ borderTop: '1px solid rgba(201,168,76,0.08)' }}>
                  <span className="font-body text-xs text-ice/30">{intern.taskCount} active task{intern.taskCount !== 1 ? 's' : ''}</span>
                  <ChevronRight size={12} className="text-gold/30" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
