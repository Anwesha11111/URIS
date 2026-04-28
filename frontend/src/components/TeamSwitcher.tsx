/**
 * TeamSwitcher
 *
 * Dropdown that lets the user switch between their active team memberships.
 * Renders inside the Sidebar footer, above the Sign Out button.
 *
 * Uses only existing sidebar CSS classes and inline style tokens —
 * no new colors or design patterns introduced.
 *
 * "Global" option = no team context (shows overall stats).
 */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, ChevronDown, Check } from 'lucide-react'
import { useTeamStore, selectTeams, selectActiveTeam } from '../store/teamStore'
import { getMyTeams } from '../services/team.service'
import { useAuthStore, selectIsAuthenticated } from '../store/authStore'

export default function TeamSwitcher() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const teams           = useTeamStore(selectTeams)
  const activeTeam      = useTeamStore(selectActiveTeam)
  const setTeams        = useTeamStore(s => s.setTeams)
  const setActiveTeam   = useTeamStore(s => s.setActiveTeam)

  const [open, setOpen]   = useState(false)
  const dropRef           = useRef<HTMLDivElement>(null)

  // Load teams on mount when authenticated
  useEffect(() => {
    if (!isAuthenticated) return
    async function load(): Promise<void> {
      try {
        const data = await getMyTeams()
        setTeams(data)
        // Auto-select first team if none selected and teams exist
        if (data.length > 0 && !activeTeam) {
          setActiveTeam(data[0])
        }
      } catch {
        // Non-fatal — user may not belong to any team yet
      }
    }
    void load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Don't render if user has no teams
  if (!isAuthenticated || teams.length === 0) return null

  const displayName = activeTeam ? activeTeam.teamName : 'Global'

  return (
    <div ref={dropRef} className="px-3 mb-3 relative">
      {/* Label */}
      <p className="nav-label text-[0.5rem] mb-1" style={{ color: 'rgba(184,212,240,0.25)' }}>
        ACTIVE TEAM
      </p>

      {/* Trigger button — matches sidebar-item visual weight */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-sm transition-colors"
        style={{
          background:   'rgba(201,168,76,0.06)',
          border:       '1px solid rgba(201,168,76,0.18)',
          color:        '#c9a84c',
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Users size={11} style={{ flexShrink: 0 }} />
          <span className="nav-label text-[0.6rem] truncate">{displayName}</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={10} />
        </motion.div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0,  scaleY: 1    }}
            exit={{   opacity: 0, y: -4,  scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position:        'absolute',
              bottom:          '100%',
              left:            0,
              right:           0,
              marginBottom:    4,
              background:      'rgba(7,8,15,0.97)',
              border:          '1px solid rgba(201,168,76,0.18)',
              borderRadius:    2,
              backdropFilter:  'blur(16px)',
              zIndex:          50,
              transformOrigin: 'bottom',
            }}
          >
            {/* Global option */}
            <button
              onClick={() => { setActiveTeam(null); setOpen(false) }}
              className="w-full flex items-center justify-between px-3 py-2 transition-colors hover:bg-white/[0.03]"
              style={{ borderBottom: '1px solid rgba(201,168,76,0.08)' }}
            >
              <span className="nav-label text-[0.6rem]"
                style={{ color: !activeTeam ? '#c9a84c' : 'rgba(184,212,240,0.5)' }}>
                Global (all teams)
              </span>
              {!activeTeam && <Check size={10} style={{ color: '#c9a84c', flexShrink: 0 }} />}
            </button>

            {/* Team options */}
            {teams.map(team => {
              const isActive = activeTeam?.teamId === team.teamId
              return (
                <button
                  key={team.teamId}
                  onClick={() => { setActiveTeam(team); setOpen(false) }}
                  className="w-full flex items-center justify-between px-3 py-2 transition-colors hover:bg-white/[0.03]"
                  style={{ borderBottom: '1px solid rgba(201,168,76,0.05)' }}
                >
                  <div className="min-w-0">
                    <p className="nav-label text-[0.6rem] truncate"
                      style={{ color: isActive ? '#c9a84c' : 'rgba(184,212,240,0.6)' }}>
                      {team.teamName}
                    </p>
                    <p className="nav-label text-[0.5rem] mt-0.5"
                      style={{ color: 'rgba(184,212,240,0.25)' }}>
                      {team.role.toUpperCase()}
                    </p>
                  </div>
                  {isActive && <Check size={10} style={{ color: '#c9a84c', flexShrink: 0 }} />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
