const API_BASE = '/api'

export class ApiClientError extends Error {
  detail: string
  status: number

  constructor(detail: string, status: number) {
    super(detail)
    this.detail = detail
    this.status = status
  }
}

function getToken(): string | null {
  return localStorage.getItem('dim_token')
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: 'Bearer ' + token } : {}
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T
  const text = await res.text()
  let data: unknown = text ? { detail: text } : {}

  if (text) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      data = { detail: text }
    }
  }

  if (!res.ok) {
    const detail =
      typeof (data as { detail?: unknown }).detail === 'string'
        ? ((data as { detail?: string }).detail ?? res.statusText)
        : res.statusText
    throw new ApiClientError(detail, res.status)
  }

  return data as T
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + path, init)
  return handleResponse<T>(res)
}

export async function get<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = new URL(API_BASE + path, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }
  const res = await fetch(url.toString(), {
    headers: { ...authHeaders() },
  })
  return handleResponse<T>(res)
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

export async function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
}

export async function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
}

export async function delete_<T>(path: string): Promise<T> {
  return request<T>(path, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
}

export async function postFormData<T>(path: string, formData: FormData): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  })
}
