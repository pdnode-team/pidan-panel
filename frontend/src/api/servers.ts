import { request, streamSSE } from './client'

export interface ServerAutoRestartState {
  isWaitingRestart: boolean
  nextRetryInSeconds: number
  crashAttempts: number
  maxRetries: number
  haltedReason: string | null
}

export interface ServerRuntime {
  status: 'running' | 'stopped' | 'starting' | 'stopping' | 'restarting' | 'error'
  containerId?: string | null
  memoryLimitMb?: number
  serverPort?: number
  autoRestart?: ServerAutoRestartState
}

export interface ServerInstance {
  id: number
  name: string
  identifier: string
  serverJar: string
  dockerImage: string
  minMemoryMb: number
  maxMemoryMb: number
  serverPort: number
  javaArgs?: string
  containerName?: string
  dataDirectory?: string
  stopTimeoutSeconds?: number
  autoStartOnBoot?: boolean
  autoRestartOnCrash?: boolean
  crashBackoffInitialSeconds?: number
  crashBackoffMaxSeconds?: number
  crashMaxRetries?: number
  runtime: ServerRuntime
  createdAt: string
  updatedAt: string
}

export interface CreateServerPayload {
  name: string
  identifier: string
  serverJar?: string
  dockerImage?: string
  minMemoryMb?: number
  maxMemoryMb?: number
  serverPort: number
  javaArgs?: string
  stopTimeoutSeconds?: number
  autoStartOnBoot?: boolean
  autoRestartOnCrash?: boolean
  crashBackoffInitialSeconds?: number
  crashBackoffMaxSeconds?: number
  crashMaxRetries?: number
}

export interface ServerStats {
  online?: boolean
  cpuPercent?: number
  memoryBytes?: number
  memoryUsageBytes?: number
  memoryLimitBytes?: number
  memoryPercent?: number
  diskBytes?: number
  networkRxBytes?: number
  networkTxBytes?: number
}

export async function getServers(page = 1, limit = 20): Promise<{ data: ServerInstance[]; meta: any }> {
  const res = await request<any>(`/servers?page=${page}&limit=${limit}`)
  // If wrapped in { data: ..., meta: ... }
  if (res && res.data && Array.isArray(res.data)) {
    return res
  }
  if (Array.isArray(res)) {
    return { data: res, meta: { total: res.length } }
  }
  return { data: [], meta: { total: 0 } }
}

export async function getServer(id: number | string): Promise<ServerInstance> {
  return request<ServerInstance>(`/servers/${id}`)
}

export async function createServer(payload: CreateServerPayload): Promise<ServerInstance> {
  return request<ServerInstance>('/servers', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateServer(id: number | string, payload: Partial<CreateServerPayload>): Promise<ServerInstance> {
  return request<ServerInstance>(`/servers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}

export async function deleteServer(id: number | string, deleteFiles = false): Promise<void> {
  const query = deleteFiles ? '?deleteFiles=true' : ''
  return request<void>(`/servers/${id}${query}`, {
    method: 'DELETE',
    body: JSON.stringify({ deleteFiles })
  })
}

export interface PowerState {
  status: 'running' | 'stopped' | 'starting' | 'stopping' | 'restarting' | 'error'
  containerId?: string | null
  memoryLimitMb?: number
  serverPort?: number
  autoRestart?: ServerAutoRestartState
}

export async function getPowerState(id: number | string): Promise<PowerState> {
  return request<PowerState>(`/servers/${id}/power`)
}

export async function startServer(id: number | string): Promise<any> {
  return request<any>(`/servers/${id}/power`, {
    method: 'POST'
  })
}

export async function stopServer(id: number | string, force = false): Promise<void> {
  return request<void>(`/servers/${id}/power${force ? '?force=true' : ''}`, {
    method: 'DELETE'
  })
}

export async function restartServer(id: number | string): Promise<any> {
  return request<any>(`/servers/${id}/power`, {
    method: 'PATCH'
  })
}

export async function sendCommand(id: number | string, command: string): Promise<void> {
  return request<void>(`/servers/${id}/commands`, {
    method: 'POST',
    body: JSON.stringify({ command })
  })
}

export async function getServerStats(id: number | string): Promise<ServerStats> {
  return request<ServerStats>(`/servers/${id}/stats`)
}

export function streamServerLogs(
  id: number | string,
  onLine: (line: string) => void,
  onError?: (err: any) => void
): () => void {
  return streamSSE(`/servers/${id}/logs`, onLine, onError)
}

// --- MCJars & Server Core Installation APIs ---
export interface JavaImageOption {
  label: string
  image: string
  javaVersion: number
  versionRange: string
  description: string
}

export const JAVA_IMAGE_OPTIONS: JavaImageOption[] = [
  {
    label: 'Java 25 (Temurin)',
    image: 'eclipse-temurin:25-jre-alpine',
    javaVersion: 25,
    versionRange: 'MC 26.1+',
    description: 'Required for Minecraft 26.1 and newer'
  },
  {
    label: 'Java 21 (Temurin LTS)',
    image: 'eclipse-temurin:21-jre-alpine',
    javaVersion: 21,
    versionRange: 'MC 1.20.5 ~ 1.21+',
    description: 'Recommended for Minecraft 1.20.5 - 1.21+'
  },
  {
    label: 'Java 17 (Temurin LTS)',
    image: 'eclipse-temurin:17-jre-alpine',
    javaVersion: 17,
    versionRange: 'MC 1.17 ~ 1.20.4',
    description: 'Recommended for Minecraft 1.17 - 1.20.4'
  },
  {
    label: 'Java 11 (Temurin LTS)',
    image: 'eclipse-temurin:11-jre-alpine',
    javaVersion: 11,
    versionRange: 'MC 1.16 ~ 1.16.5',
    description: 'Recommended for Minecraft 1.16 - 1.16.5'
  },
  {
    label: 'Java 8 (Temurin LTS)',
    image: 'eclipse-temurin:8-jre-alpine',
    javaVersion: 8,
    versionRange: 'MC 1.12.2 and older',
    description: 'Recommended for Minecraft 1.12.2 and older'
  }
]

export function matchDefaultJavaImage(javaVersion?: number, mcVersion?: string): string {
  // 1. Prioritize parsing mcVersion string because backend metadata does not guarantee returning java
  if (mcVersion) {
    const trimmed = mcVersion.trim().toLowerCase()

    // Match year-based versions (e.g. 26.1, 26.1.1, 26w12a, 27.0)
    const matchYear = trimmed.match(/^(\d{2,})\./)
    if (matchYear) {
      const year = parseInt(matchYear[1], 10)
      if (year >= 26) {
        return 'eclipse-temurin:25-jre-alpine' // Minecraft 26.1+ -> Java 25
      }
    }

    // Match classic 1.x.y versions
    const matchClassic = trimmed.match(/^1\.(\d+)(?:\.(\d+))?/)
    if (matchClassic) {
      const minor = parseInt(matchClassic[1], 10)
      const patch = matchClassic[2] ? parseInt(matchClassic[2], 10) : 0

      if (minor >= 21 || (minor === 20 && patch >= 5)) {
        return 'eclipse-temurin:21-jre-alpine' // 1.20.5 - 1.21+ -> Java 21
      }
      if (minor >= 17) {
        return 'eclipse-temurin:17-jre-alpine' // 1.17 - 1.20.4 -> Java 17
      }
      if (minor === 16) {
        return 'eclipse-temurin:11-jre-alpine' // 1.16.x -> Java 11
      }
      return 'eclipse-temurin:8-jre-alpine' // <= 1.15 (1.12.2, etc.) -> Java 8
    }
  }

  // 2. If explicit javaVersion is available
  if (javaVersion) {
    if (javaVersion >= 25) return 'eclipse-temurin:25-jre-alpine'
    if (javaVersion >= 21) return 'eclipse-temurin:21-jre-alpine'
    if (javaVersion >= 17) return 'eclipse-temurin:17-jre-alpine'
    if (javaVersion >= 11) return 'eclipse-temurin:11-jre-alpine'
    return 'eclipse-temurin:8-jre-alpine'
  }

  return 'eclipse-temurin:21-jre-alpine'
}

export interface JarType {
  type: string
  category: string
  name: string
  compatibility: string[]
  icon?: string
  description?: string
  builds?: number
  deprecated?: boolean
}

export interface JarVersion {
  version: string
  build?: number
  java?: number
  experimental?: boolean
  releaseDate?: string
  isZip?: boolean
  zipUrl?: string
  jarUrl?: string
}

export interface InstallJarPayload {
  type?: string
  version?: string
  url?: string
  targetFileName?: string
  updateServerJar?: boolean
}

export async function getJarTypes(): Promise<JarType[]> {
  const res = await request<any>('/mcjars/types')
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object') {
    const rawObj = res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : res
    if (Array.isArray(rawObj)) return rawObj
    return Object.entries(rawObj).map(([key, val]: [string, any]) => ({
      type: key,
      name: val.name || key.toUpperCase(),
      category: val.category || (val.deprecated ? 'deprecated' : 'server'),
      compatibility: val.compatibility || (val.experimental ? ['experimental'] : ['stable']),
      icon: val.icon,
      description: val.description,
      builds: val.builds
    }))
  }
  return []
}

export async function getJarVersions(type: string): Promise<JarVersion[]> {
  const res = await request<any>(`/mcjars/types/${type}`)
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object') {
    const rawObj = res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : res
    if (Array.isArray(rawObj)) return rawObj
    return Object.entries(rawObj).map(([ver, val]: [string, any]) => ({
      version: val.version || ver,
      build: val.buildNumber || val.build,
      java: val.java,
      experimental: val.experimental || (val.supported === false),
      releaseDate: val.releaseDate,
      isZip: val.isZip,
      zipUrl: val.zipUrl,
      jarUrl: val.jarUrl
    })).sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: 'base' }))
  }
  return []
}

export async function installJar(
  serverId: number | string,
  payload: InstallJarPayload
): Promise<{ success: boolean; message: string; fileName: string }> {
  return request<{ success: boolean; message: string; fileName: string }>(`/servers/${serverId}/jars`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

// --- Instance File System APIs ---
export interface ServerFileItem {
  name: string
  path: string
  isDirectory: boolean
  sizeBytes?: number
  size?: number
  modifiedAt: string
  extension: string
}

export async function getServerFiles(
  serverId: number | string,
  path = ''
): Promise<ServerFileItem[]> {
  const query = path ? `?path=${encodeURIComponent(path)}` : ''
  const res = await request<any>(`/servers/${serverId}/files${query}`)
  if (Array.isArray(res)) return res
  if (res && Array.isArray(res.data)) return res.data
  return []
}

export async function getFileContent(
  serverId: number | string,
  path: string
): Promise<{ path: string; content: string }> {
  return request<{ path: string; content: string }>(
    `/servers/${serverId}/files/content?path=${encodeURIComponent(path)}`
  )
}

export async function saveFileContent(
  serverId: number | string,
  path: string,
  content: string
): Promise<void> {
  return request<void>(`/servers/${serverId}/files`, {
    method: 'POST',
    body: JSON.stringify({ path, content })
  })
}

export async function uploadServerFile(
  serverId: number | string,
  path: string,
  file: File
): Promise<void> {
  const formData = new FormData()
  formData.append('path', path)
  formData.append('file', file)
  return request<void>(`/servers/${serverId}/files`, {
    method: 'POST',
    body: formData
  })
}

export async function renameServerFile(
  serverId: number | string,
  oldPath: string,
  newPath: string
): Promise<void> {
  return request<void>(`/servers/${serverId}/files`, {
    method: 'PATCH',
    body: JSON.stringify({ oldPath, newPath })
  })
}

export async function deleteServerFile(
  serverId: number | string,
  path: string
): Promise<void> {
  return request<void>(`/servers/${serverId}/files?path=${encodeURIComponent(path)}`, {
    method: 'DELETE'
  })
}


