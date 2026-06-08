/**
 * alertStore — single source of truth for alerts (both intern and admin).
 *
 * Role-aware:
 *   - Intern: GET /alerts/my, resolve via PATCH /alerts/my/:id/resolve
 *   - Admin:  GET /alerts,    resolve via PATCH /alerts/:id/resolve
 *
 * Exposes:
 *   alerts         — unresolved alerts (shown in active feed)
 *   resolvedAlerts — resolved alerts (shown in history section)
 *   unread / hasCrit — derived from unresolved only
 */

import { create } from 'zustand'
import api from '../services/api'

export interface StoreAlert {
  id:        string
  type:      string
  severity:  string
  message:   string
  createdAt: string
  taskId?:   string | null
  internId?: string
  resolved:  boolean
}

interface AlertState {
  alerts:         StoreAlert[]   // unresolved
  resolvedAlerts: StoreAlert[]   // resolved history
  loading:        boolean
  unread:         number
  hasCrit:        boolean

  refresh:    () => Promise<void>
  resolve:    (id: string) => Promise<void>
  resolveAll: () => Promise<void>

  startPolling: (isAdmin: boolean) => void
  stopPolling:  () => void
}

let _pollInterval: ReturnType<typeof setInterval> | null = null
let _isAdmin = false
let _refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null

// Debounced refresh — collapses multiple rapid calls (socket + poll + mount)
// into a single API call with a 1s settling window.
function _scheduleRefresh(get: () => AlertState) {
  if (_refreshDebounceTimer) clearTimeout(_refreshDebounceTimer)
  _refreshDebounceTimer = setTimeout(() => {
    _refreshDebounceTimer = null
    void get().refresh()
  }, 1_000)
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts:         [],
  resolvedAlerts: [],
  loading:        false,
  unread:         0,
  hasCrit:        false,

  refresh: async () => {
    set({ loading: true })
    try {
      const endpoint = _isAdmin
        ? '/alerts?limit=100&includeResolved=true'
        : '/alerts/my?includeResolved=true'

      const res = await api.get<{ success: boolean; data: StoreAlert[] }>(endpoint)
      const all = res.data.data ?? []

      const unresolved = all.filter(a => !a.resolved)
      const resolved   = all.filter(a =>  a.resolved)

      set({
        alerts:         unresolved,
        resolvedAlerts: resolved,
        unread:         unresolved.length,
        hasCrit:        unresolved.some(a => a.severity === 'critical'),
        loading:        false,
      })
    } catch {
      set({ loading: false })
    }
  },

  resolve: async (id: string) => {
    // Optimistic: move from unresolved → resolved
    set(s => {
      const alert = s.alerts.find(a => a.id === id)
      const next  = s.alerts.filter(a => a.id !== id)
      return {
        alerts:         next,
        resolvedAlerts: alert
          ? [{ ...alert, resolved: true }, ...s.resolvedAlerts]
          : s.resolvedAlerts,
        unread:  next.length,
        hasCrit: next.some(a => a.severity === 'critical'),
      }
    })
    try {
      const endpoint = _isAdmin ? `/alerts/${id}/resolve` : `/alerts/my/${id}/resolve`
      await api.patch(endpoint)
    } catch {
      await get().refresh()
    }
  },

  resolveAll: async () => {
    const toResolve = [...get().alerts]
    set(s => ({
      alerts:         [],
      resolvedAlerts: [
        ...toResolve.map(a => ({ ...a, resolved: true })),
        ...s.resolvedAlerts,
      ],
      unread:  0,
      hasCrit: false,
    }))
    try {
      await Promise.all(toResolve.map(a => {
        const ep = _isAdmin ? `/alerts/${a.id}/resolve` : `/alerts/my/${a.id}/resolve`
        return api.patch(ep).catch(() => null)
      }))
    } catch {
      await get().refresh()
    }
  },

  startPolling: (isAdmin: boolean) => {
    _isAdmin = isAdmin
    if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null }
    // Initial load via debouncer — collapses with any concurrent refresh calls
    _scheduleRefresh(get)
    // Poll every 5 minutes — socket handles real-time updates between polls
    _pollInterval = setInterval(() => _scheduleRefresh(get), 5 * 60_000)
  },

  stopPolling: () => {
    if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null }
    _isAdmin = false  // reset so next login picks up the correct role
    set({ alerts: [], resolvedAlerts: [], unread: 0, hasCrit: false })
  },
}))
