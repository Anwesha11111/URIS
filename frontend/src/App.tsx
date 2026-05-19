import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import ErrorBoundary      from './components/ErrorBoundary'
import ProtectedRoute     from './routes/ProtectedRoute'
import SessionGuard       from './components/SessionGuard'
import FloatingAlertBell  from './components/FloatingAlertBell'
import Landing            from './pages/Landing'
import Login              from './pages/Login'
import Register           from './pages/Register'
import Dashboard          from './pages/Dashboard'
import Availability       from './pages/Availability'
import Tasks              from './pages/Tasks'
import Review             from './pages/Review'
import Team               from './pages/Team'
import Alerts             from './pages/Alerts'
import AdminOverview      from './pages/AdminOverview'
import AuditLogs          from './features/admin/AuditLogs'
import Notifications      from './pages/Notifications'
import Portfolio          from './pages/Portfolio'
import PortfolioEdit      from './pages/PortfolioEdit'
import Support            from './pages/Support'
import SupportAdmin       from './pages/SupportAdmin'
import UserLifecycle      from './pages/UserLifecycle'
import { useAuthStore, selectIsAuthenticated, selectIsAdmin } from './store/authStore'
import { useAlertStore } from './store/alertStore'
import { ROLES } from './constants/roles'

function AlertPollingManager() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const isAdmin         = useAuthStore(selectIsAdmin)
  const { startPolling, stopPolling } = useAlertStore()

  useEffect(() => {
    if (isAuthenticated) {
      // Always restart with the current role — ensures admin gets /alerts, intern gets /alerts/my
      startPolling(isAdmin)
    } else {
      stopPolling()
    }
    // Cleanup on unmount or role/auth change
    return () => stopPolling()
  }, [isAuthenticated, isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SessionGuard />
        <AlertPollingManager />
        <FloatingAlertBell />

        <Routes>
          {/* Public routes */}
          <Route path="/"         element={<Landing />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/portfolio/:slug" element={<Portfolio />} />

          {/* Protected — any authenticated user */}
          <Route path="/dashboard"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/availability"
            element={<ProtectedRoute><Availability /></ProtectedRoute>} />
          <Route path="/tasks"
            element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="/notifications"
            element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/portfolio-edit"
            element={<ProtectedRoute><PortfolioEdit /></ProtectedRoute>} />

          {/* Protected — admin only */}
          <Route path="/review"
            element={<ProtectedRoute adminOnly><Review /></ProtectedRoute>} />
          <Route path="/team"
            element={<ProtectedRoute adminOnly><Team /></ProtectedRoute>} />
          <Route path="/alerts"
            element={<ProtectedRoute adminOnly><Alerts /></ProtectedRoute>} />
          <Route path="/admin"
            element={<ProtectedRoute adminOnly><AdminOverview /></ProtectedRoute>} />
          <Route path="/audit-logs"
            element={<ProtectedRoute adminOnly><AuditLogs /></ProtectedRoute>} />

          {/* Phase 3: Support system — interns submit, admins/leads manage */}
          <Route path="/support"
            element={<ProtectedRoute><Support /></ProtectedRoute>} />
          <Route path="/support-admin"
            element={
              <ProtectedRoute allowRoles={[
                ROLES.CORE_ADMIN, ROLES.TECHNICAL_LEAD, ROLES.OPERATIONS_LEAD,
                ROLES.RESEARCH_LEAD, ROLES.OPERATIONS_PROGRAM_MANAGER,
              ]}>
                <SupportAdmin />
              </ProtectedRoute>
            } />

          {/* Phase 3: User lifecycle — CORE_ADMIN only */}
          <Route path="/user-lifecycle"
            element={
              <ProtectedRoute allowRoles={[ROLES.CORE_ADMIN]}>
                <UserLifecycle />
              </ProtectedRoute>
            } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
