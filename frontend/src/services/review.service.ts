/**
 * Review / performance service — submit task reviews and fetch performance data.
 */
import api from './api'

export interface SubmitReviewPayload {
  internId:   string
  taskId:     string
  quality:    number  // 1–5
  timeliness: number  // 1–5
  initiative: number  // 1–5
  note?:      string
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
