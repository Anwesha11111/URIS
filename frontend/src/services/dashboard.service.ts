/**
 * Dashboard service — admin overview & intern dashboard data.
 */
import api from './api'

export interface InternRow {
  id: string
  name: string
  capacityScore: number
  tli: number
  rpi: number
  credibilityScore: number
  availability: string
  taskCount: number
  activeTasks?: number
  completedTasks?: number
  completionPct?: number
  skill_tags?: string[]
  college?: string
  email?: string
}

export interface AlertItem {
  type: string
  message: string
  severity: 'critical' | 'warning' | 'info'
}

export interface AdminOverview {
  totalInterns: number
  activeTasks: number
  openAlerts: number
  completedLast30: number
  interns: InternRow[]
  alerts: AlertItem[]
}

export interface InternDashboard {
  capacityScore: number
  performanceIndex: number
  credibility: number
  assignedTasks: Array<{
    id: string
    title: string
    status: string
    complexity: number
    progressPct: number
  }>
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const res = await api.get<{ success: boolean; data: AdminOverview }>('/admin/overview')
  return res.data.data
}

export async function getInternDashboard(): Promise<InternDashboard> {
  const res = await api.get<{ success: boolean; data: InternDashboard }>('/intern/dashboard')
  return res.data.data
}
