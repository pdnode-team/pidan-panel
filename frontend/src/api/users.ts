import { request } from './client'

export interface UserRecord {
  id: number
  fullName: string | null
  email: string
  role: 'admin' | 'user'
  serverIds: number[]
  initials: string
  createdAt: string
  updatedAt: string
}

export interface UsersMeta {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
}

export interface UsersListResponse {
  data: UserRecord[]
  meta: UsersMeta
}

export interface CreateUserPayload {
  email: string
  password: string
  fullName?: string
  role?: 'admin' | 'user'
  serverIds?: number[]
}

export interface UpdateUserPayload {
  email?: string
  password?: string
  fullName?: string
  role?: 'admin' | 'user'
  serverIds?: number[]
}

export async function getUsers(params?: {
  page?: number
  perPage?: number
  search?: string
}): Promise<UsersListResponse> {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.perPage) query.set('perPage', String(params.perPage))
  if (params?.search) query.set('search', params.search)

  const qs = query.toString()
  return request<UsersListResponse>(`/users${qs ? `?${qs}` : ''}`)
}

export async function getUser(id: number | string): Promise<UserRecord> {
  return request<UserRecord>(`/users/${id}`)
}

export async function createUser(payload: CreateUserPayload): Promise<UserRecord> {
  return request<UserRecord>('/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateUser(
  id: number | string,
  payload: UpdateUserPayload
): Promise<UserRecord> {
  return request<UserRecord>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}

export async function deleteUser(id: number | string): Promise<{ success: boolean; message?: string }> {
  return request<{ success: boolean; message?: string }>(`/users/${id}`, {
    method: 'DELETE'
  })
}
