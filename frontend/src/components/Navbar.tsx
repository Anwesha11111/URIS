import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Menu, X, Diamond } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore, selectToken, selectUser, selectIsAdmin } from '../store/authStore'

const navLinks = [
  { label: 'Dashboard',    to: '/dashboard' },
  { label: 'Availability', to: '/availability' },
  { label: 'Tasks',        to: '/tasks' },
  { label: 'Review',       to: '/review' },
  { label: 'Team',         to: '/team' },
]

export default function Navbar() {
  const loc     = useLocation()
  const token   = useAuthStore(selectToken)
  const user    = useAuthStore(selectUser)
  const isAdmin = useAuthStore(selectIsAdmin)
  const logout  = useAuthStore(s => s.logout)
  const [open, setOpen] = useState(false)
  const nav = useNavigate()

  const handleSignOut = (): void => { logout(); nav('/login') }

  return (
    <>
      <motion.nav
        initial={{ y: -56, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3"
        style={{ background: 'rgba(7,8,15,0.82)', backdropFilter: 'blur(18px)', borderBottom: '1px solid rgba(201,168,76,0.11)' }}
      >
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="font-display font-black text-lg text-ice-gradient" style={{ letterSpacing: '0.12em' }}>URIS</span>
          <span className="nav-label text-[0.52rem]" style={{ color: 'rgba(201,168,76,0.45)' }}>INTELLIGENCE</span>
        </Link>

        {/* Center links */}
        {token && (
          <div className="hidden md:flex items-center gap-7">
            {navLinks.filter(l => l.to !== '/review' && l.to !== '/team' || isAdmin).map(l => (
              <Link key={l.to} to={l.to} style={{ textDecoration: 'none' }}>
                <span className="nav-label text-[0.62rem] transition-colors duration-200"
                  style={{ color: loc.pathname === l.to ? '#c9a84c' : 'rgba(184,212,240,0.45)',
                    borderBottom: loc.pathname === l.to ? '1px solid rgba(201,168,76,0.6)' : '1px solid transparent', paddingBottom: 2 }}>
                  {l.label}
                </span>
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" style={{ textDecoration: 'none' }}>
                <span className="nav-label text-[0.62rem] transition-colors duration-200"
                  style={{ color: loc.pathname === '/admin' ? '#c9a84c' : 'rgba(184,212,240,0.45)',
                    borderBottom: loc.pathname === '/admin' ? '1px solid rgba(201,168,76,0.6)' : '1px solid transparent', paddingBottom: 2 }}>
                  Admin
                </span>
              </Link>
            )}
          </div>
        )}

        {/* Right */}
        <div className="flex items-center gap-3">
          <div className="signal-badge hidden sm:flex" style={{ fontSize: '0.58rem' }}>
            <span className="status-dot dot-green animate-pulse-s" />
            <Diamond size={7} style={{ color: '#c9a84c' }} />
            <span className="nav-label text-[0.58rem]" style={{ color: 'rgba(184,212,240,0.55)' }}>SIGNAL ACTIVE</span>
          </div>
          {token ? (
            <>
              <span className="nav-label text-[0.6rem] hidden sm:block" style={{ color: 'rgba(201,168,76,0.55)' }}>
                {user?.name?.split(' ')[0]?.toUpperCase()}
              </span>
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleSignOut}
                className="btn-outline px-4 py-1.5 text-[0.62rem] rounded-sm hidden sm:flex">
                SIGN OUT
              </motion.button>
            </>
          ) : (
            <Link to="/login">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="btn-gold px-5 py-2 text-[0.62rem] rounded-sm">
                ACCESS SYSTEM
              </motion.button>
            </Link>
          )}
          <button className="md:hidden p-1.5 transition-colors" style={{ color: 'rgba(184,212,240,0.5)' }} onClick={() => setOpen(!open)}>
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      {open && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-[49px] left-0 right-0 z-40 glass-card md:hidden">
          {navLinks
            .filter(l => (l.to !== '/review' && l.to !== '/team') || isAdmin)
            .map(l => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                className="block nav-label text-[0.68rem] px-6 py-3"
                style={{ color: loc.pathname === l.to ? '#c9a84c' : 'rgba(184,212,240,0.5)', borderBottom: '1px solid rgba(201,168,76,0.08)', textDecoration: 'none' }}>
                {l.label}
              </Link>
            ))}
          {isAdmin && (
            <Link to="/admin" onClick={() => setOpen(false)}
              className="block nav-label text-[0.68rem] px-6 py-3"
              style={{ color: loc.pathname === '/admin' ? '#c9a84c' : 'rgba(184,212,240,0.5)', borderBottom: '1px solid rgba(201,168,76,0.08)', textDecoration: 'none' }}>
              Admin
            </Link>
          )}
          {token && (
            <button onClick={() => { handleSignOut(); setOpen(false) }}
              className="block nav-label text-[0.68rem] px-6 py-3 w-full text-left"
              style={{ color: 'rgba(248,113,113,0.6)', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
              SIGN OUT
            </button>
          )}
        </motion.div>
      )}
    </>
  )
}
