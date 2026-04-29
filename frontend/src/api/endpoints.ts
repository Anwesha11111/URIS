/**
 * Legacy endpoint wrappers — kept for backward compatibility.
 * New code should import directly from the services layer:
 *   import { getAdminOverview } from '../services/dashboard.service'
 *   import { getAllTasks }       from '../services/tasks.service'
 *   etc.
 */
import api from '../services/api'

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: { name: string; email: string; password: string; role: string }) =>
    api.post('/auth/register', data),
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getInternDashboard: () => api.get('/intern/dashboard'),
  getAdminOverview:   () => api.get('/admin/overview'),
}

// ─── AVAILABILITY ────────────────────────────────────────────────────────────
export const availabilityAPI = {
  submit: (data: {
    weekStatus: string
    busyBlocks: Array<{ day: string; reason: string; severity: string }>
    maxFreeBlockHours: number
    isExamWeek: boolean
    note?: string
  }) => api.post('/availability/submit', {
    busyBlocks:        data.busyBlocks,
    maxFreeBlockHours: data.maxFreeBlockHours,
    weekStatusToggle:  data.weekStatus,
  }),

  get: () => api.get('/availability/get'),
}

// ─── PERFORMANCE & REVIEW ────────────────────────────────────────────────────
export const performanceAPI = {
  getByInternId: (internId: string) =>
    api.get(`/performance/get/${internId}`),

  submitReview: (data: {
    internId: string; taskId: string
    quality: number; timeliness: number; initiative: number; note?: string
  }) => api.post('/review/submit', data),
}

// ─── CREDIBILITY ─────────────────────────────────────────────────────────────
export const credibilityAPI = {
  getMine:          ()           => api.get('/credibility/mine'),
  getByInternId:    (id: string) => api.get(`/credibility/get?internId=${id}`),
}

// ─── TASKS ───────────────────────────────────────────────────────────────────
export const tasksAPI = {
  getAll: () => api.get('/tasks'),

  create: (data: {
    title: string; internId: string; planeTaskId?: string
    complexity: number; status: string
  }) => api.post('/tasks/create', data),

  updateStatus: (data: { taskId: string; status: string; progress: number }) =>
    api.post('/admin/task/status', data),
}

// ─── ASSIGNMENT ──────────────────────────────────────────────────────────────
export const assignmentAPI = {
  assignTask: (data: { internId: string; taskId: string }) =>
    api.post('/assign/assign-task', data),
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────
export const adminAPI = {
  overrideScore: (data: { internId: string; score: number; reason?: string }) =>
    api.post('/admin/override-score', { internId: data.internId, overrideScore: data.score, reason: data.reason }),

  getOverview: () => api.get('/admin/overview'),
}
