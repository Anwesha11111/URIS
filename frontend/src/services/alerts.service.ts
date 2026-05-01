/**
 * Alerts service — fetch and resolve system alerts.
 *
 * Two alert scopes:
 *   getAlerts()          — admin: all active alerts across all interns
 *   getMyAnomalyAlerts() — intern: their own low_performance / spike alerts
 */
import api from './api'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AlertType =
  | 'stale'
  | 'stale_task'
  | 'blocker'
  | 'blocker_escalation'
  | 'credibility'
  | 'availability'
  | 'capacity'
  | 'low_capacity'
  | 'overload'
  | 'overreliance'
  | 'reassignment'
  | 'low_performance'
  | 'spike'

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface Alert {
  id:        string
  type:      AlertType
  message:   string
  severity:  AlertSeverity
  intern?:   string
  internId?: string
  taskId?:   string | null
  time?:     string
  resolved:  boolean
  createdAt?: string
}

// ── API calls ─────────────────────────────────────────────────────────────────

/** Admin — all unresolved alerts. */
export async function getAlerts(): Promise<Alert[]> {
  const res = await api.get<{ success: boolean; data: Alert[] }>('/alerts')
  return res.data.data
}

/** Admin — mark an alert resolved. */
export async function resolveAlert(id: string): Promise<void> {
  await api.patch(`/alerts/${id}/resolve`)
}

/** Intern — their own anomaly alerts (low_performance, spike). */
export async function getMyAnomalyAlerts(): Promise<Alert[]> {
  const res = await api.get<{ success: boolean; data: Alert[] }>('/alerts/my')
  return res.data.data
}
