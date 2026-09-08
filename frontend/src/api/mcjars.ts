import { request } from './client'

export interface JarType {
  type: string
  category: string
  name: string
  compatibility: string[]
  deprecated?: boolean
}

export interface JarVersion {
  version: string
  build?: number
  experimental?: boolean
  releaseDate?: string
}

export async function getJarTypes(): Promise<JarType[]> {
  return request<JarType[]>('/mcjars/types')
}

export async function getJarVersions(type: string): Promise<JarVersion[]> {
  return request<JarVersion[]>(`/mcjars/types/${encodeURIComponent(type)}`)
}
