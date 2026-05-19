/**
 * Centralized Axios instance.
 *
 * Token source: reads from the Zustand auth store (single source of truth).
 * The store is backed by `persist` middleware so the token is always in sync
 * with localStorage — no direct localStorage access needed here.
 *
 * All API calls in the app must go through this client.
 * Never create a second axios instance elsewhere.
 *
 * Phase 4 changes:
 *   - 401 interceptor now calls authStore.logout() + alertStore.stopPolling()
 *     before navigating, preventing stale polling loops after forced logout.
 *   - Navigation uses window.location.replace('/') to land on the landing page
 *     rather than /login, consistent with the Phase 4 redirect-to-home spec.
 *     We use window.location here (not React Router) because the interceptor
 *     runs outside the React component tree and has no access to useNavigate.
 *     replace() is used (not href=) so the back button doesn't return to the
 *     broken page.
 */
import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'
import { useAlertStore } from '../store/alertStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// ── Request interceptor: attach JWT from store ────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // getState() is the non-reactive way to read Zustand outside React —
  // correct for interceptors which run outside the component tree.
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: handle 401 ─────────────────────────────────────────
// On a 401 the JWT is expired or invalid. We must:
//   1. Stop alert polling immediately (prevents a cascade of 401s)
//   2. Clear auth state (removes persisted localStorage entry)
//   3. Navigate to the landing page "/" so the user can log back in
//
// We do NOT call POST /auth/logout here — the token is already invalid so
// the server would reject it. The audit trail for forced logouts is written
// by the server when it rejects the token.
api.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    if (
      axios.isAxiosError(err) &&
      err.response?.status === 401
    ) {
      // Stop polling before clearing auth — prevents a second 401 from the
      // polling interval firing immediately after this one.
      useAlertStore.getState().stopPolling()

      // Clear auth state through the store — also clears the persisted
      // localStorage entry via the persist middleware.
      useAuthStore.getState().logout()

      // Navigate to landing page. window.location.replace avoids adding a
      // broken entry to the browser history stack.
      window.location.replace('/')
    }
    return Promise.reject(err)
  }
)

export default api
