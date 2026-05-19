/**
 * Admin service — score overrides, task assignment, task status updates.
 */
import api from './api'

export interface OverrideScorePayload {
  internId: string
  score: number
  reason?: string
}

export interface AssignTaskPayload {
  internId: string
  taskId: string
}

export async function overrideScore(payload: OverrideScorePayload): Promise<void> {
  // Backend field is `overrideScore`, not `score`
  await api.post('/admin/override-score', {
    internId: payload.internId,
    overrideScore: payload.score,
    reason: payload.reason,
  })
}

export async function assignTask(payload: AssignTaskPayload): Promise<void> {
  await api.post('/assign/assign-task', payload)
}

export interface AvailabilityDeadline {
  day:    number  // 0=Sun, 1=Mon, ..., 6=Sat
  hour:   number  // 0–23
  minute: number  // 0–59
}

export async function getAvailabilityDeadline(): Promise<AvailabilityDeadline> {
  const res = await api.get<{ success: boolean; data: AvailabilityDeadline }>('/admin/availability-deadline')
  return res.data.data
}

export async function setAvailabilityDeadline(payload: AvailabilityDeadline): Promise<void> {
  await api.post('/admin/availability-deadline', payload)
}

export interface PendingUser {
  id:        string
  email:     string
  role:      string
  createdAt: string
}

export async function getPendingUsers(): Promise<PendingUser[]> {
  const res = await api.get<{ success: boolean; data: PendingUser[] }>('/admin/pending-users')
  return res.data.data
}

export async function approveUser(userId: string): Promise<void> {
  await api.post('/admin/approve-user', { userId })
}

export async function finishInternship(internId: string): Promise<void> {
  await api.post('/admin/finish-internship', { internId })
}

// ── Phase 2: IP Block Management ─────────────────────────────────────────────

export interface BlockedIP {
  id:          string
  ipAddress:   string
  reason:      string | null
  blockedAt:   string
  expiresAt:   string | null
  blockedById: string | null
}

export async function listBlockedIPs(): Promise<BlockedIP[]> {
  const res = await api.get<{ success: boolean; data: BlockedIP[] }>('/admin/blocked-ips')
  return res.data.data
}

export async function blockIP(payload: {
  ipAddress: string
  reason?:   string
  expiresAt?: string   // ISO date string, omit for permanent
}): Promise<BlockedIP> {
  const res = await api.post<{ success: boolean; data: BlockedIP }>('/admin/block-ip', payload)
  return res.data.data
}

export async function unblockIP(ipAddress: string): Promise<void> {
  await api.post('/admin/unblock-ip', { ipAddress })
}

// ── Phase 2: Login Log Viewer ─────────────────────────────────────────────────

export interface LoginLogEntry {
  id:         string
  userId:     string | null
  email:      string
  ipAddress:  string
  userAgent:  string | null
  success:    boolean
  failReason: string | null
  createdAt:  string
}

export interface LoginLogResponse {
  logs:       LoginLogEntry[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

export async function getLoginLogs(params?: {
  page?:      number
  limit?:     number
  success?:   boolean
  ipAddress?: string
  email?:     string
}): Promise<LoginLogResponse> {
  const res = await api.get<{ success: boolean; data: LoginLogResponse }>('/admin/login-logs', {
    params,
  })
  return res.data.data
}

// ── Phase 2: Role Change (Promotion-safe) ─────────────────────────────────────

export async function changeUserRole(payload: {
  userId:  string
  newRole: string
  reason?: string
}): Promise<{ userId: string; previousRole: string; newRole: string }> {
  const res = await api.post<{
    success: boolean
    data: { userId: string; previousRole: string; newRole: string }
  }>('/admin/change-role', payload)
  return res.data.data
}
