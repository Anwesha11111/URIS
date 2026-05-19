/**
 * archive.service.ts — Phase 6 (extended from Phase 3)
 *
 * Client-side service for user lifecycle management (CORE_ADMIN only).
 */
import api from './api'

export type ArchiveStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'REMOVED'

/** Record from the ArchivedUser table (snapshot-based) */
export interface ArchivedUserRecord {
  id:           string
  originalId:   string
  snapshot:     {
    id:       string
    email:    string
    name:     string
    role:     string
    status:   string
    internId: string | null
    teams?:   Array<{ teamId: string; teamName: string | null; role: string }>
  }
  status:       ArchiveStatus
  archivedAt:   string
  archivedById: string | null
}

/** Record from the User table (live status) */
export interface UserLifecycleRecord {
  id:        string
  email:     string
  name:      string
  role:      string
  status:    string   // "active" | "inactive" | "archived" | "removed" | "pending" | "alumni"
  createdAt: string
  internId:  string | null
  teams:     string[]
}

export interface ArchivePagination {
  page:  number
  limit: number
  total: number
  pages: number
}

// ── Lifecycle operations ──────────────────────────────────────────────────────

/** Deactivate a user (ACTIVE → INACTIVE) */
export async function deactivateUser(userId: string, reason?: string): Promise<void> {
  await api.post('/archive/deactivate', { userId, reason })
}

/** Archive a user — writes snapshot, sets status to ARCHIVED */
export async function archiveUser(userId: string, reason?: string): Promise<void> {
  await api.post('/archive/archive', { userId, reason })
}

/** Restore an inactive or archived user back to ACTIVE */
export async function restoreUser(userId: string): Promise<void> {
  await api.post('/archive/restore', { userId })
}

/** Mark a user as REMOVED (compliance hold — CORE_ADMIN only) */
export async function markUserRemoved(userId: string, reason?: string): Promise<void> {
  await api.post('/archive/remove', { userId, reason })
}

// ── List endpoints ────────────────────────────────────────────────────────────

/** List archived/inactive/removed users from the ArchivedUser snapshot table */
export async function listArchivedUsers(params?: {
  status?: ArchiveStatus
  page?:   number
  limit?:  number
}): Promise<{ records: ArchivedUserRecord[]; pagination: ArchivePagination }> {
  const res = await api.get<{
    success: boolean
    data: { records: ArchivedUserRecord[]; pagination: ArchivePagination }
  }>('/archive', { params })
  return res.data.data
}

/** List ALL users for lifecycle management (active + non-active) */
export async function listAllUsers(params?: {
  status?: string
  page?:   number
  limit?:  number
}): Promise<{ users: UserLifecycleRecord[]; pagination: ArchivePagination }> {
  const res = await api.get<{
    success: boolean
    data: { users: UserLifecycleRecord[]; pagination: ArchivePagination }
  }>('/archive/users', { params })
  return res.data.data
}
