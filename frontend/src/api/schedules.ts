import { request } from './client'

export type ScheduleAction = 'backup' | 'command' | 'restart' | 'start' | 'stop'

export interface ServerSchedule {
  id: number
  serverId: number
  name: string
  cron: string
  action: ScheduleAction
  payload?: Record<string, any>
  isActive: boolean
  lastRunAt?: string | null
  lastRunStatus?: 'success' | 'failed' | null
  lastRunMessage?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateSchedulePayload {
  name: string
  cron: string
  action: ScheduleAction
  payload?: Record<string, any>
  isActive?: boolean
}

export interface UpdateSchedulePayload {
  name?: string
  cron?: string
  action?: ScheduleAction
  payload?: Record<string, any>
  isActive?: boolean
}

/**
 * Get all scheduled tasks for a server instance (Admin Only)
 */
export async function getServerSchedules(serverId: number | string): Promise<ServerSchedule[]> {
  const res = await request<any>(`/servers/${serverId}/schedules`)
  if (Array.isArray(res)) return res
  if (res && Array.isArray(res.data)) return res.data
  return []
}

/**
 * Create a new scheduled task (Admin Only)
 */
export async function createServerSchedule(
  serverId: number | string,
  payload: CreateSchedulePayload
): Promise<ServerSchedule> {
  const res = await request<any>(`/servers/${serverId}/schedules`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return res?.data || res
}

/**
 * Get a specific scheduled task by ID (Admin Only)
 */
export async function getServerSchedule(
  serverId: number | string,
  scheduleId: number | string
): Promise<ServerSchedule> {
  const res = await request<any>(`/servers/${serverId}/schedules/${scheduleId}`)
  return res?.data || res
}

/**
 * Update an existing scheduled task (Admin Only)
 */
export async function updateServerSchedule(
  serverId: number | string,
  scheduleId: number | string,
  payload: UpdateSchedulePayload
): Promise<ServerSchedule> {
  const res = await request<any>(`/servers/${serverId}/schedules/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
  return res?.data || res
}

/**
 * Delete a scheduled task (Admin Only)
 */
export async function deleteServerSchedule(
  serverId: number | string,
  scheduleId: number | string
): Promise<void> {
  return request<void>(`/servers/${serverId}/schedules/${scheduleId}`, {
    method: 'DELETE'
  })
}

/**
 * Immediately execute a scheduled task once manually (Admin Only)
 */
export async function runServerSchedule(
  serverId: number | string,
  scheduleId: number | string
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(
    `/servers/${serverId}/schedules/${scheduleId}/runs`,
    { method: 'POST' }
  )
}
