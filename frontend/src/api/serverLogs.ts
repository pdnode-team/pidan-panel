import { request, BASE_URL, getToken } from './client'

export interface LogArchiveFile {
  name: string
  size: number
  modifiedAt: string
  isCompressed: boolean
}

export interface LogArchiveListResponse {
  files: LogArchiveFile[]
}

export async function listLogArchives(serverId: number | string): Promise<LogArchiveListResponse> {
  const res = await request<any>(`/servers/${serverId}/logs/archives`)
  if (Array.isArray(res)) return { files: res }
  if (res && Array.isArray(res.files)) return res as LogArchiveListResponse
  return { files: [] }
}

export interface LogContentResponse {
  lines: string[]
  totalLines: number
  page: number
  perPage: number
  fileName: string
}

export async function getLogContent(
  serverId: number | string,
  fileName: string,
  options: { page?: number; perPage?: number } = {}
): Promise<LogContentResponse> {
  const params = new URLSearchParams()
  if (options.page) params.set('page', String(options.page))
  if (options.perPage) params.set('perPage', String(options.perPage))
  const qs = params.toString() ? `?${params.toString()}` : ''
  const encodedFile = encodeURIComponent(fileName)
  const res = await request<any>(`/servers/${serverId}/logs/archives/${encodedFile}${qs}`)
  if (typeof res === 'string') {
    const lines = res.split('\n')
    return { lines, totalLines: lines.length, page: options.page || 1, perPage: options.perPage || lines.length, fileName }
  }
  return {
    lines: res?.lines || [],
    totalLines: res?.totalLines ?? (res?.lines?.length || 0),
    page: res?.page || options.page || 1,
    perPage: res?.perPage || options.perPage || 200,
    fileName
  }
}

export function streamLatestLog(
  serverId: number | string,
  onLine: (line: string) => void,
  onError?: (err: any) => void
): () => void {
  const url = `${BASE_URL}/servers/${serverId}/logs/stream`
  const controller = new AbortController()
  const token = getToken()
  const headers: Record<string, string> = { Accept: 'text/event-stream' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  fetch(url, { headers, signal: controller.signal })
    .then(async (response) => {
      if (!response.ok) throw new Error(`SSE failed: ${response.status}`)
      if (!response.body) throw new Error('No readable stream')
      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          if (trimmed.startsWith('data:')) onLine(line.slice(line.indexOf(':') + 1).trim())
        }
      }
    })
    .catch((err) => { if (err.name !== 'AbortError') onError?.(err) })
  return () => controller.abort()
}

export function getLogDownloadUrl(serverId: number | string, fileName: string): string {
  const token = getToken()
  const encoded = encodeURIComponent(fileName)
  return `${BASE_URL}/servers/${serverId}/logs/archives/${encoded}/download?token=${token}`
}
