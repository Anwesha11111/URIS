import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, CalendarDays, ClipboardList, Star, Users, Bell, LogOut, ChevronRight, ShieldCheck, ScrollText, MessageSquare, Archive } from 'lucide-react'
import { useAuthStore, selectUser, selectIsAdmin } from '../store/authStore'
import { useAlertStore } from '../store/alertStore'
import { useMobileNavStore } from '../store/mobileNavStore'
import { useLogout } from '../hooks/useLogout'
import TeamSwitcher from './TeamSwitcher'

import { getPermissions } from '../utils/permissions'

const allItems = [
  { icon: LayoutDashboard, label: 'Overview',        to: '/dashboard' },
  { icon: CalendarDays,    label: 'Availability',    to: '/availability' },
  { icon: ClipboardList,   label: 'Tasks',           to: '/tasks' },
  { icon: Bell,            label: 'Notifications',   to: '/notifications' },
  { icon: Star,            label: 'Reviews',         to: '/review' },
  { icon: Users,           label: 'Team',            to: '/team' },
  { icon: Bell,            label: 'Alerts',          to: '/alerts' },
  { icon: ShieldCheck,     label: 'Admin',           to: '/admin' },
  { icon: ScrollText,      label: 'Audit Logs',      to: '/audit-logs' },
  { icon: LayoutDashboard, label: 'Portfolio',       to: '/portfolio-edit' },
  { icon: MessageSquare,   label: 'Support',         to: '/support' },
  { icon: MessageSquare,   label: 'Support Inbox',   to: '/support-admin' },
  { icon: Archive,         label: 'User Lifecycle',  to: '/user-lifecycle' },
]

// ── Shared nav content ────────────────────────────────────────────────────────
// Extracted so it renders identically in both the desktop sidebar and the
// mobile drawer — no duplication of logic or styling.

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const loc     = useLocation()
  const user    = useAuthStore(selectUser)
  const isAdmin = useAuthStore(selectIsAdmin)
  const logout  = useLogout()
  const unread  = useAlertStore(s => s.unread)

  const permissions = getPermissions(user?.role || '')
  const items = allItems.filter(i => permissions.modules.includes(i.to))

  // useLogout already closes the mobile nav and redirects to "/"
  // onNavigate is still called for any additional cleanup the parent needs
  const handleSignOut = () => {
    onNavigate?.()
    logout({ redirectTo: '/', reason: 'user_initiated' })
  }

  return (
    <div className="flex flex-col justify-between h-full py-5">
      <div>
        <div className="px-5 mb-3">
          <p className="nav-label text-[0.5rem]" style={{ color: 'rgba(201,168,76,0.32)', letterSpacing: '0.45em' }}>NAVIGATION</p>
        </div>
        <nav className="px-2 space-y-0.5">
          {items.map((item, i) => {
            const active    = loc.pathname === item.to
            const showBadge = (item.to === '/notifications' && !isAdmin && unread > 0)
                           || (item.to === '/alerts' && isAdmin && unread > 0)
            return (
              <motion.div key={item.to} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.12 + i * 0.05 }}>
                <Link to={item.to} onClick={onNavigate} className={`sidebar-item ${active ? 'active' : ''}`}>
                  <item.icon size={13} />
                  {item.label}
                  {showBadge && (
                    <motion.span
                      key={unread}
                      initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                      className="ml-auto flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full font-bold text-[0.46rem]"
                      style={{ background: '#f87171', color: '#fff', boxShadow: '0 0 6px #f8717166' }}>
                      {unread > 9 ? '9+' : unread}
                    </motion.span>
                  )}
                  {active && !showBadge && (
                    <ChevronRight size={9} style={{ marginLeft: 'auto', color: 'rgba(201,168,76,0.5)' }} />
                  )}
                </Link>
              </motion.div>
            )
          })}
        </nav>
      </div>

      <div className="px-2">
        <div className="gold-rule mb-3 mx-2" />
        <TeamSwitcher />
        <div className="px-3 mb-3">
          <p className="nav-label text-[0.5rem] mb-0.5" style={{ color: 'rgba(184,212,240,0.25)' }}>SIGNED IN AS</p>
          <p className="font-display text-sm" style={{ color: 'rgba(232,240,251,0.8)' }}>{user?.name || 'User'}</p>
          <p className="nav-label text-[0.5rem] mt-0.5" style={{ color: 'rgba(201,168,76,0.45)' }}>
            {isAdmin ? 'ADMIN · FULL ACCESS' : 'INTERN · LIMITED'}
          </p>
        </div>
        <button onClick={handleSignOut} className="sidebar-item w-full" style={{ color: 'rgba(248,113,113,0.5)' }}>
          <LogOut size={13} />
          Sign Out
        </button>
      </div>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const mobileOpen = useMobileNavStore(s => s.open)
  const closeMobileNav = useMobileNavStore(s => s.close)

  return (
    <>
      {/* ── Desktop sidebar — unchanged layout ── */}
      <motion.aside
        initial={{ x: -56, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="fixed left-0 top-[49px] bottom-0 z-40 w-[200px] hidden md:flex flex-col"
        style={{ background: 'rgba(7,8,15,0.9)', borderRight: '1px solid rgba(201,168,76,0.09)', backdropFilter: 'blur(16px)' }}
      >
        <SidebarContent />
      </motion.aside>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
              onClick={closeMobileNav}
            />

            {/* Drawer panel */}
            <motion.aside
              key="mobile-drawer"
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="fixed left-0 top-0 bottom-0 z-50 w-[240px] md:hidden flex flex-col"
              style={{ background: 'rgba(7,8,15,0.98)', borderRight: '1px solid rgba(201,168,76,0.12)', backdropFilter: 'blur(20px)' }}
            >
              {/* Drawer header — URIS logo + close affordance */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3"
                style={{ borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                <div>
                  <span className="font-display font-black text-base text-ice-gradient" style={{ letterSpacing: '0.12em' }}>URIS</span>
                  <p className="nav-label text-[0.4rem] tracking-[0.3em] text-gold/30 mt-0.5">BY STEMONEF</p>
                </div>
                <button
                  onClick={closeMobileNav}
                  className="p-1.5 rounded-sm transition-colors"
                  style={{ color: 'rgba(184,212,240,0.4)' }}
                  aria-label="Close navigation">
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <SidebarContent onNavigate={closeMobileNav} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
