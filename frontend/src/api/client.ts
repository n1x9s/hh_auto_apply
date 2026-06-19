const API_BASE = "/api"

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown
  ) {
    super(`${status}: ${statusText}`)
    this.name = "ApiError"
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let data: unknown
    try {
      data = await response.json()
    } catch {
      data = await response.text()
    }
    throw new ApiError(response.status, response.statusText, data)
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

export async function apiGet<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  return handleResponse<T>(response)
}

export async function apiPost<T>(
  endpoint: string,
  data?: unknown
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  })

  return handleResponse<T>(response)
}

export async function apiPut<T>(
  endpoint: string,
  data?: unknown
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  })

  return handleResponse<T>(response)
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })

  return handleResponse<T>(response)
}
