// API Client for Pidan Panel (v1)

export const BASE_URL = '/api/v1'
export const TOKEN_KEY = 'pidan_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export interface ApiErrorItem {
  message: string
  rule?: string
  field?: string
}

export class ApiError extends Error {
  errors: ApiErrorItem[]
  status: number

  constructor(status: number, errors: ApiErrorItem[]) {
    const firstMsg = errors?.[0]?.message || `Request failed with status ${status}`
    super(firstMsg)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`
  const token = getToken()

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string> || {})
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers
  })

  if (response.status === 204) {
    return null as unknown as T
  }

  let body: any = null
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    body = await response.json()
  } else {
    body = await response.text()
  }

  if (!response.ok) {
    const errors: ApiErrorItem[] = body?.errors || [{ message: typeof body === 'string' ? body : response.statusText }]
    throw new ApiError(response.status, errors)
  }

  if (body && typeof body === 'object' && body.data !== undefined && body.meta !== undefined) {
    return body
  }
  return body?.data !== undefined ? body.data : body
}

// SSE stream reader using fetch + ReadableStream with Bearer Authorization
export function streamSSE(
  path: string,
  onLine: (data: string) => void,
  onError?: (err: any) => void
): () => void {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`
  const controller = new AbortController()
  const token = getToken()

  const headers: Record<string, string> = {
    'Accept': 'text/event-stream',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  fetch(url, {
    headers,
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`SSE connection failed with status ${response.status}`)
      }
      if (!response.body) {
        throw new Error('ReadableStream not supported by response')
      }

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
          if (trimmed.startsWith('data:')) {
            const dataContent = line.slice(line.indexOf(':') + 1).trim()
            onLine(dataContent)
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError?.(err)
      }
    })

  // Return abort function to cleanly close stream
  return () => {
    controller.abort()
  }
}
