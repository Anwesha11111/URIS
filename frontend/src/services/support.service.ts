/**
 * support.service.ts — Phase 5 (extended from Phase 3)
 *
 * Client-side service for the intern contact/query system.
 */
import api from './api'

export type SupportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL'

// Phase 5 expanded categories
export type SupportCategory =
  | 'TECHNICAL_ISSUE'
  | 'ACCESS_PROBLEM'
  | 'EMERGENCY'
  | 'TASK_BLOCKER'
  | 'HR_OPERATIONS'
  | 'INFRASTRUCTURE'
  | 'GENERAL'
  | 'OTHER'
  // Phase 3 legacy values — kept for backward compat
  | 'BLOCKER'
  | 'OPERATIONAL'

export type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

/** Intern-facing request (no internal notes) */
export interface SupportRequest {
  id:           string
  subject:      string
  message?:     string
  priority:     SupportPriority
  category:     SupportCategory
  status:       SupportStatus
  createdAt:    string
  updatedAt?:   string
  resolvedAt?:  string | null
  assignedTo?:  string | null   // resolved name, not ID
  user?: {
    id:    string
    name:  string
    email: string
    role:  string
  }
}

/** Admin-facing request (includes internal notes) */
export interface AdminSupportRequest extends SupportRequest {
  internalNotes?: string | null
  closedById?:    string | null
  assignedToId?:  string | null
  assignedToName?: string | null
}

export interface SubmitRequestPayload {
  subject:  string
  message:  string
  priority: SupportPriority
  category: SupportCategory
}

export interface SupportPagination {
  page:  number
  limit: number
  total: number
  pages: number
}

// ── Intern endpoints ──────────────────────────────────────────────────────────

/** Intern: submit a new support request */
export async function submitSupportRequest(payload: SubmitRequestPayload): Promise<SupportRequest> {
  const res = await api.post<{ success: boolean; data: SupportRequest }>('/support', payload)
  return res.data.data
}

/** Intern: list own requests (no internal notes) */
export async function getMyRequests(): Promise<SupportRequest[]> {
  const res = await api.get<{ success: boolean; data: SupportRequest[] }>('/support/my')
  return res.data.data
}

/** Intern: get own request detail (no internal notes) */
export async function getMyRequestById(id: string): Promise<SupportRequest> {
  const res = await api.get<{ success: boolean; data: SupportRequest }>(`/support/my/${id}`)
  return res.data.data
}

// ── Admin/Lead endpoints ──────────────────────────────────────────────────────

/** Admin/Lead: list all requests with optional filters */
export async function getAllRequests(params?: {
  status?:   SupportStatus
  priority?: SupportPriority
  category?: SupportCategory
  page?:     number
  limit?:    number
}): Promise<{ requests: AdminSupportRequest[]; pagination: SupportPagination }> {
  const res = await api.get<{
    success: boolean
    data: { requests: AdminSupportRequest[]; pagination: SupportPagination }
  }>('/support', { params })
  return res.data.data
}

/** Admin/Lead: get full request detail including internal notes */
export async function getRequestById(id: string): Promise<AdminSupportRequest> {
  const res = await api.get<{ success: boolean; data: AdminSupportRequest }>(`/support/${id}`)
  return res.data.data
}

/** Admin/Lead: assign a request to self or another user */
export async function assignRequest(id: string, assignedToId?: string): Promise<void> {
  await api.patch(`/support/${id}/assign`, { assignedToId })
}

/** Admin/Lead: update request status (lifecycle-validated on backend) */
export async function updateRequestStatus(id: string, status: SupportStatus): Promise<void> {
  await api.patch(`/support/${id}/status`, { status })
}

/** Admin/Lead: add or update internal notes (never shown to interns) */
export async function updateInternalNotes(id: string, notes: string): Promise<void> {
  await api.patch(`/support/${id}/notes`, { notes })
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<SupportCategory, string> = {
  TECHNICAL_ISSUE: 'Technical Issue',
  ACCESS_PROBLEM:  'Access Problem',
  EMERGENCY:       'Emergency',
  TASK_BLOCKER:    'Task Blocker',
  HR_OPERATIONS:   'HR / Operations',
  INFRASTRUCTURE:  'Infrastructure',
  GENERAL:         'General Query',
  OTHER:           'Other',
  // Legacy
  BLOCKER:         'Blocker',
  OPERATIONAL:     'Operational',
}

export const PRIORITY_COLORS: Record<SupportPriority, string> = {
  LOW:      '#4ade80',
  MEDIUM:   '#c9a84c',
  HIGH:     '#f59e0b',
  URGENT:   '#f87171',
  CRITICAL: '#ef4444',
}

export const STATUS_COLORS: Record<SupportStatus, string> = {
  OPEN:        '#c9a84c',
  IN_PROGRESS: '#b8d4f0',
  RESOLVED:    '#4ade80',
  CLOSED:      'rgba(184,212,240,0.3)',
}
