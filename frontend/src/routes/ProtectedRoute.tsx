/**
 * ProtectedRoute — wraps any page that requires authentication and
 * optionally enforces role-based access.
 *
 * Behaviour
 * ─────────
 *  • Not authenticated              → redirect to /login
 *  • Authenticated, role not allowed → redirect to /dashboard
 *  • Authenticated, role allowed     → render children
 *
 * Props
 * ─────
 *  allowRoles  — array of roles that may access this route.
 *                If omitted, any authenticated user is allowed.
 *  adminOnly   — shorthand for allowRoles={[ROLES.ADMIN]}.
 *                Kept for backward compatibility.
 *
 * Usage
 * ─────
 *  // Any authenticated user
 *  <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
 *
 *  // Admin only (shorthand)
 *  <Route path="/admin" element={<ProtectedRoute adminOnly><AdminOverview /></ProtectedRoute>} />
 *
 *  // Explicit role list (scalable — add ROLES.TEAM_LEAD when ready)
 *  <Route path="/reports" element={
 *    <ProtectedRoute allowRoles={[ROLES.ADMIN]}>
 *      <Reports />
 *    </ProtectedRoute>
 *  } />
 */

import { Navigate } from 'react-router-dom'
import { useAuthStore, selectIsAuthenticated, selectUser } from '../store/authStore'
import { ROLES, type Role } from '../constants/roles'

interface ProtectedRouteProps {
  children:    React.ReactNode
  /**
   * Explicit list of roles that may access this route.
   * Takes precedence over adminOnly.
   */
  allowRoles?: Role[]
  /**
   * Shorthand for allowRoles={[ROLES.ADMIN]}.
   * @deprecated Prefer allowRoles for clarity.
   */
  adminOnly?:  boolean
}

export default function ProtectedRoute({
  children,
  allowRoles,
  adminOnly = false,
}: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const user            = useAuthStore(selectUser)

  // Not logged in → send to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Resolve the effective allowed roles
  const effectiveRoles: Role[] = allowRoles ?? (adminOnly ? [ROLES.ADMIN] : [])

  // If a role restriction is set, enforce it
  if (effectiveRoles.length > 0) {
    const userRole = user?.role as Role | undefined
    if (!userRole || !effectiveRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <>{children}</>
}
