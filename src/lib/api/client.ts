// ═══════════════════════════════════════════════════════════════
//  Typed API client — single fetch wrapper with error handling
// ═══════════════════════════════════════════════════════════════

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface FetchOptions extends RequestInit {
  /** Parse & validate JSON response (default: true) */
  json?: boolean
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { json = true, headers, ...rest } = options
  const res = await fetch(path, {
    headers: {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...rest,
  })

  if (!res.ok) {
    let details: unknown
    try { details = await res.json() } catch { details = undefined }
    const message = (details as any)?.error || res.statusText || 'Request failed'
    throw new ApiError(message, res.status, details)
  }

  if (res.status === 204) return undefined as T
  return json ? res.json() as T : (res.text() as unknown as T)
}

export const api = {
  get:    <T>(path: string, opts?: FetchOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post:   <T>(path: string, body?: unknown, opts?: FetchOptions) =>
    request<T>(path, { ...opts, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch:  <T>(path: string, body?: unknown, opts?: FetchOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, opts?: FetchOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
}
