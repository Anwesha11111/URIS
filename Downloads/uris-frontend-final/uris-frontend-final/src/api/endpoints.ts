import api from './client'

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: { name: string; email: string; password: string; role: string }) =>
    api.post('/auth/register', data),
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getInternDashboard: () =>
    api.get('/intern/dashboard'),

  getAdminOverview: () =>
    api.get('/admin/overview'),
}

// ─── AVAILABILITY ────────────────────────────────────────────────────────────
export const availabilityAPI = {
  submit: (data: {
    weekStatus: string
    busyBlocks: Array<{ day: string; reason: string; severity: string }>
    maxFreeBlockHours: number   // 1–6 (backend validates this)
    isExamWeek: boolean
    note?: string
  }) => api.post('/availability/submit', data),

  get: () => api.get('/availability/get'),
}

// ─── PERFORMANCE & REVIEW ────────────────────────────────────────────────────
export const performanceAPI = {
  getByInternId: (internId: string) =>
    api.get(`/performance/get/${internId}`),

  submitReview: (data: {
    internId: string
    taskId: string
    quality: number       // 1–5
    timeliness: number    // 1–5
    initiative: number    // 1–5
    note?: string
  }) => api.post('/review/submit', data),
  // Formula on backend: 0.5*quality + 0.3*timeliness + 0.2*initiative
}

// ─── CREDIBILITY ─────────────────────────────────────────────────────────────
export const credibilityAPI = {
  getMine: () =>
    api.get('/credibility/mine'),

  getByInternId: (internId: string) =>
    api.get(`/credibility/get?internId=${internId}`),
}

// ─── TASKS ───────────────────────────────────────────────────────────────────
export const tasksAPI = {
  getAll: () =>
    api.get('/tasks'),

  create: (data: {
    title: string
    internId: string
    planeTaskId?: string
    complexity: number    // 0–1 (backend validates strictly)
    status: string
  }) => api.post('/tasks/create', data),

  updateStatus: (data: {
    taskId: string
    status: string
    progress: number
  }) => api.post('/admin/task/status', data),
}

// ─── ASSIGNMENT ──────────────────────────────────────────────────────────────
export const assignmentAPI = {
  assignTask: (data: {
    internId: string
    taskId: string
  }) => api.post('/assign/assign-task', data),
}

// ─── ADMIN ───────────────────────────────────────────────────────────────────
export const adminAPI = {
  overrideScore: (data: {
    internId: string
    score: number
    reason?: string
  }) => api.post('/admin/override-score', data),

  getOverview: () =>
    api.get('/admin/overview'),
}
