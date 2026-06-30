/**
 * Internship Archive service — archive CRUD and completion workflow.
 */
import api from './api'

export type PerformanceRating =
  | 'OUTSTANDING' | 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'SATISFACTORY'

export type RecommendationStatus =
  | 'HIGHLY_RECOMMENDED' | 'RECOMMENDED' | 'RECOMMENDED_WITH_RESERVATIONS' | 'NOT_EVALUATED'

export type VerificationStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED'

export type ArchiveStatus = 'ACTIVE' | 'COMPLETED'

export interface InternshipArchiveRecord {
  id?: string
  internId: string
  fullName: string
  profilePhotoUrl?: string | null
  email: string
  department?: string | null
  reportingLead?: string | null
  currentRole: string
  internshipRole: string
  internshipStartDate?: string | null
  internshipEndDate?: string | null
  duration?: string | null
  status: ArchiveStatus
  workCategories: string[]
  keyContributions?: string | null
  featuredAchievements?: string | null
  adminReview?: string | null
  performanceRating?: PerformanceRating | null
  recommendationStatus: RecommendationStatus
  internalNotes?: string | null
  verificationId?: string | null
  verificationUrl?: string | null
  certificateNumber?: string | null
  verificationStatus: VerificationStatus
  qrGenerated: boolean
  qrImagePath?: string | null
  isExisting?: boolean
  completedAt?: string | null
  updatedAt?: string
}

export interface WorkCategoryGroups {
  categories: {
    RESEARCH: string[]
    TECHNICAL: string[]
    OPERATIONS: string[]
  }
  all: string[]
}

export type InternshipArchivePayload = Partial<Omit<InternshipArchiveRecord, 'internId' | 'isExisting'>>

export async function getArchivePrefill(internId: string): Promise<InternshipArchiveRecord> {
  const res = await api.get<{ success: boolean; data: InternshipArchiveRecord }>(
    `/admin/internship-archive/prefill/${internId}`,
  )
  return res.data.data
}

export async function getInternshipArchive(internId: string): Promise<InternshipArchiveRecord> {
  const res = await api.get<{ success: boolean; data: InternshipArchiveRecord }>(
    `/admin/internship-archive/${internId}`,
  )
  return res.data.data
}

export async function listInternshipArchives(status?: ArchiveStatus): Promise<InternshipArchiveRecord[]> {
  const params = status ? { status } : {}
  const res = await api.get<{ success: boolean; data: InternshipArchiveRecord[] }>(
    '/admin/internship-archives',
    { params },
  )
  return res.data.data
}

export async function saveInternshipArchive(
  internId: string,
  payload: InternshipArchivePayload,
): Promise<InternshipArchiveRecord> {
  const res = await api.put<{ success: boolean; data: InternshipArchiveRecord }>(
    `/admin/internship-archive/${internId}`,
    payload,
  )
  return res.data.data
}

export async function finishInternshipWithArchive(
  internId: string,
  archive: InternshipArchivePayload,
): Promise<InternshipArchiveRecord> {
  const res = await api.post<{ success: boolean; data: InternshipArchiveRecord }>(
    '/admin/finish-internship',
    { internId, archive },
  )
  return res.data.data
}

export async function getWorkCategories(): Promise<WorkCategoryGroups> {
  const res = await api.get<{ success: boolean; data: WorkCategoryGroups }>(
    '/admin/internship-archive/categories',
  )
  return res.data.data
}

export interface PublicVerificationRecord {
  verificationId: string
  fullName: string
  department?: string | null
  internshipRole: string
  duration?: string | null
  status: ArchiveStatus
  adminReview?: string | null
  verificationStatus: VerificationStatus
}

export async function getPublicVerification(verificationId: string): Promise<PublicVerificationRecord> {
  const res = await api.get<{ success: boolean; data: PublicVerificationRecord }>(
    `/verify/${encodeURIComponent(verificationId)}`,
  )
  return res.data.data
}

export async function regenerateVerificationQr(internId: string): Promise<InternshipArchiveRecord> {
  const res = await api.post<{ success: boolean; data: InternshipArchiveRecord }>(
    `/admin/internship-archive/${internId}/regenerate-qr`,
  )
  return res.data.data
}

export function getQrImageUrl(qrImagePath?: string | null): string | null {
  if (!qrImagePath) return null
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
  return `${base.replace(/\/$/, '')}${qrImagePath}`
}

export const PERFORMANCE_RATING_OPTIONS: { value: PerformanceRating; label: string }[] = [
  { value: 'OUTSTANDING', label: 'Outstanding' },
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'VERY_GOOD', label: 'Very Good' },
  { value: 'GOOD', label: 'Good' },
  { value: 'SATISFACTORY', label: 'Satisfactory' },
]

export const RECOMMENDATION_OPTIONS: { value: RecommendationStatus; label: string }[] = [
  { value: 'HIGHLY_RECOMMENDED', label: 'Highly Recommended' },
  { value: 'RECOMMENDED', label: 'Recommended' },
  { value: 'RECOMMENDED_WITH_RESERVATIONS', label: 'Recommended with Reservations' },
  { value: 'NOT_EVALUATED', label: 'Not Evaluated' },
]

export const VERIFICATION_STATUS_OPTIONS: { value: VerificationStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: 'EXPIRED', label: 'Expired' },
]

export const INTERNSHIP_ROLE_OPTIONS = [
  { value: 'TECHNICAL_INTERN', label: 'Technical Intern' },
  { value: 'RESEARCH_INTERN', label: 'Research Intern' },
  { value: 'OPERATIONS_INTERN', label: 'Operations Intern' },
]

export function formatArchiveDate(d?: string | null): string {
  if (!d) return ''
  return d.slice(0, 10)
}
