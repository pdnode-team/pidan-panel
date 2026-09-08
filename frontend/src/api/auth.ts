import { request } from './client'

export interface SetupStatusResponse {
  needsSetup: boolean
}

export interface UserProfile {
  id: number
  fullName: string | null
  email: string
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: UserProfile
  token: string
}

export interface SignupPayload {
  fullName?: string | null
  email: string
  password: string
  passwordConfirmation: string
}

export interface LoginPayload {
  email: string
  password: string
}

export async function checkSetupStatus(): Promise<SetupStatusResponse> {
  return request<SetupStatusResponse>('/system/setup-status')
}

export async function signupAdmin(payload: SignupPayload): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function logout(): Promise<void> {
  return request<void>('/logout', {
    method: 'POST'
  })
}

export async function getProfile(): Promise<UserProfile> {
  return request<UserProfile>('/profile')
}
