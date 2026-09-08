import { request, BASE_URL, getToken } from './client'

export interface SystemStatusData {
  cpuPercent: number
  memoryPercent: number
  usedMemoryBytes: number
  totalMemoryBytes: number
  freeMemoryBytes: number
  nodeVersion: string
  panelVersion: string
  processUser: string
  panelTime: string
  loadAverage: number[]
  hostMachine: string
  osEnvironment: string
  containerEngine: string
}

export interface HealthCheckItem {
  name: string
  status: 'ok' | 'warning' | 'error' | string
  message?: string
  meta?: Record<string, any>
}

export interface HealthCheckResponse {
  isHealthy: boolean
  status: string
  finishedAt: string
  checks: HealthCheckItem[]
}

/**
 * Fetch real-time system resource metrics and host runtime overview
 */
export async function getSystemStatus(): Promise<SystemStatusData> {
  return request<SystemStatusData>('/system/status')
}

/**
 * Fetch global system health diagnostic report (Disk, Memory, SQLite DB, Docker Engine)
 * Handles both HTTP 200 (healthy) and HTTP 503 (degraded), as both return the diagnostic checks payload.
 */
export async function getHealthCheck(): Promise<HealthCheckResponse | null> {
  const url = `${BASE_URL}/health`
  const token = getToken()
  const headers: Record<string, string> = {
    'Accept': 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await fetch(url, { headers })
    const contentType = res.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json()
      if (data && Array.isArray(data.checks)) {
        return data as HealthCheckResponse
      }
    }
  } catch (err) {
    // network or ECONNREFUSED error
  }
  return null
}
