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
