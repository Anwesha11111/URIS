/**
 * Activity service — fetch activity summary and record client-side events.
 */
import api from './api'

export interface DailyActivity {
  date:        string   // YYYY-MM-DD
  activeHours: number
  idleHours:   number
}

export interface ActivitySummary {
  totalActiveHours:  number
  totalIdleHours:    number
  loginCount:        number
  productivityScore: number   // 0–100
  dailyBreakdown:    DailyActivity[]
}

/** Fetch the 7-day activity summary for the current user. */
export async function getActivitySummary(): Promise<ActivitySummary> {
  const res = await api.get<{ success: boolean; data: ActivitySummary }>('/activity/summary')
  return res.data.data
}

/**
 * Record a TASK_WORK or IDLE period from the client.
 * Called by the inactivity hook when the user returns from idle.
 *
 * @param type     'TASK_WORK' | 'IDLE'
 * @param duration seconds
 */
export async function recordActivity(type: 'TASK_WORK' | 'IDLE', duration: number): Promise<void> {
  await api.post('/auth/activity', { type, duration })
}
