/**
 * Availability service — submit and retrieve weekly availability.
 */
import api from './api'

export interface BusyBlock {
  day: string
  reason: string
  severity: 'full' | 'partial'
}

export interface SubmitAvailabilityPayload {
  weekStatus: string
  busyBlocks: BusyBlock[]
  maxFreeBlockHours: number
  isExamWeek: boolean
  note?: string
}

export interface AvailabilityResult {
  availability: unknown
  TLI: number
  capacityScore: number
  capacityLabel: string
}

export async function submitAvailability(
  payload: SubmitAvailabilityPayload
): Promise<AvailabilityResult> {
  // Backend expects weekStatusToggle, not weekStatus
  const body = {
    busyBlocks: payload.busyBlocks,
    maxFreeBlockHours: payload.maxFreeBlockHours,
    weekStatusToggle: payload.weekStatus,
  }
  const res = await api.post<{ success: boolean; data: AvailabilityResult }>(
    '/availability/submit',
    body
  )
  return res.data.data
}
