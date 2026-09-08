import { request } from './client'

export interface AuditLogRecord {
  id: number
  userId: number
  userEmail: string
  userFullName: string | null
  mcServerId: number | null
  serverName: string | null
  category: string // 'command' | 'power' | 'file' | 'config' | 'backup' | etc.
  action: string
  details: Record<string, any>
  status: 'success' | 'failed' | string
  errorMessage: string | null
  ipAddress: string
  createdAt: string
}

export interface AuditLogMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}

export interface AuditLogListResponse {
  data: AuditLogRecord[]
  meta: AuditLogMeta
}

export interface AuditLogQuery {
  page?: number
  perPage?: number
  serverId?: number | string
  userId?: number | string
  category?: string
  status?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

function buildQueryString(query: AuditLogQuery = {}): string {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.perPage) params.set('perPage', String(query.perPage))
  if (query.serverId) params.set('serverId', String(query.serverId))
  if (query.userId) params.set('userId', String(query.userId))
  if (query.category && query.category !== 'all') params.set('category', query.category)
  if (query.status && query.status !== 'all') params.set('status', query.status)
  if (query.search && query.search.trim()) params.set('search', query.search.trim())
  if (query.dateFrom) params.set('dateFrom', query.dateFrom)
  if (query.dateTo) params.set('dateTo', query.dateTo)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function getGlobalAuditLogs(query: AuditLogQuery = {}): Promise<AuditLogListResponse> {
  const qs = buildQueryString(query)
  const res = await request<any>(`/audit-logs${qs}`)
  if (res && res.data && res.meta) {
    return res as AuditLogListResponse
  }
  if (Array.isArray(res)) {
    return {
      data: res,
      meta: {
        total: res.length,
        perPage: query.perPage || 20,
        currentPage: query.page || 1,
        lastPage: Math.ceil(res.length / (query.perPage || 20)) || 1
      }
    }
  }
  return {
    data: res?.data || [],
    meta: res?.meta || { total: 0, perPage: 20, currentPage: 1, lastPage: 1 }
  }
}

export async function getServerAuditLogs(serverId: number | string, query: AuditLogQuery = {}): Promise<AuditLogListResponse> {
  const qs = buildQueryString(query)
  const res = await request<any>(`/servers/${serverId}/audit-logs${qs}`)
  if (res && res.data && res.meta) {
    return res as AuditLogListResponse
  }
  if (Array.isArray(res)) {
    return {
      data: res,
      meta: {
        total: res.length,
        perPage: query.perPage || 20,
        currentPage: query.page || 1,
        lastPage: Math.ceil(res.length / (query.perPage || 20)) || 1
      }
    }
  }
  return {
    data: res?.data || [],
    meta: res?.meta || { total: 0, perPage: 20, currentPage: 1, lastPage: 1 }
  }
}
