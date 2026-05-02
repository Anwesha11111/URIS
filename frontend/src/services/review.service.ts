/**
 * Review / performance service — submit task reviews and fetch performance data.
 */
import api from './api'

export interface SubmitReviewPayload {
  internId:          string
  taskId:            string
  qualityScore:      number  // 1–5, weight 0.40
  timelinessScore:   number  // 1–5, weight 0.35
  independenceScore: number  // 1–5, weight 0.25
  reviewNotes?:      string
}

export interface PerformanceData {
  performanceIndex: number
  reviewCount:      number
  isOverridden:     boolean
  source:           'computed' | 'override'
}

export async function submitReview(payload: SubmitReviewPayload): Promise<void> {
  await api.post('/review/submit', payload)
}

export async function getPerformance(internId: string): Promise<PerformanceData> {
  const res = await api.get<{ success: boolean; data: PerformanceData }>(
    `/performance/get/${internId}`
  )
  return res.data.data
}
