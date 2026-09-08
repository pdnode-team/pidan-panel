import { request, getToken } from './client'

export interface BackupItem {
  id: number
  serverId?: number
  name: string
  fileName?: string
  file_name?: string
  sizeBytes?: number
  size_bytes?: number
  status: 'in_progress' | 'ready' | 'failed'
  errorMessage?: string | null
  error_message?: string | null
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

export interface BackupsMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}

export interface BackupsListResponse {
  data: BackupItem[]
  meta: BackupsMeta
}

export async function getBackups(
  serverId: number | string,
  params?: { page?: number; perPage?: number }
): Promise<BackupsListResponse> {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.perPage) query.set('perPage', String(params.perPage))

  const qs = query.toString()
  const res = await request<any>(`/servers/${serverId}/backups${qs ? `?${qs}` : ''}`)

  if (Array.isArray(res)) {
    return {
      data: res,
      meta: {
        total: res.length,
        perPage: params?.perPage || 20,
        currentPage: params?.page || 1,
        lastPage: 1
      }
    }
  }

  if (res && Array.isArray(res.data)) {
    return {
      data: res.data,
      meta: res.meta || {
        total: res.data.length,
        perPage: params?.perPage || 20,
        currentPage: params?.page || 1,
        lastPage: 1
      }
    }
  }

  return {
    data: [],
    meta: {
      total: 0,
      perPage: 20,
      currentPage: 1,
      lastPage: 1
    }
  }
}

export async function getBackup(
  serverId: number | string,
  backupId: number | string
): Promise<BackupItem> {
  return request<BackupItem>(`/servers/${serverId}/backups/${backupId}`)
}

export async function createBackup(
  serverId: number | string,
  payload?: { name?: string; excludes?: string[] }
): Promise<BackupItem> {
  return request<BackupItem>(`/servers/${serverId}/backups`, {
    method: 'POST',
    body: JSON.stringify(payload || {})
  })
}

export async function restoreBackup(
  serverId: number | string,
  backupId: number | string
): Promise<{ status: string; backupId: number; message: string }> {
  return request<{ status: string; backupId: number; message: string }>(
    `/servers/${serverId}/backups/${backupId}/restorations`,
    {
      method: 'POST'
    }
  )
}

export async function deleteBackup(
  serverId: number | string,
  backupId: number | string
): Promise<void> {
  return request<void>(`/servers/${serverId}/backups/${backupId}`, {
    method: 'DELETE'
  })
}

export async function downloadBackupArchive(
  serverId: number | string,
  backupId: number | string,
  fileName?: string
): Promise<void> {
  const token = getToken()
  const response = await fetch(`/api/v1/servers/${serverId}/backups/${backupId}/download`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })

  if (!response.ok) {
    let errorText = 'Failed to download backup archive'
    try {
      const errJson = await response.json()
      errorText = errJson?.errors?.[0]?.message || errJson?.message || errorText
    } catch {
      errorText = (await response.text()) || errorText
    }
    throw new Error(errorText)
  }

  const blob = await response.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = fileName || `backup-server-${serverId}-${backupId}.zip`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(downloadUrl)
}
