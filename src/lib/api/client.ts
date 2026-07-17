// ═══════════════════════════════════════════════════════════════
//  Typed API client — single fetch wrapper with error handling
//  Auto-attaches auth token from Zustand persisted store.
//  Auto-redirects to login on 401.
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

// ─── Auth token storage (shared with zustand persist) ──────────
const AUTH_STORAGE_KEY = 'whp-auth'

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.token || null
  } catch {
    return null
  }
}

// ─── 401 handler — clear auth + redirect to login ──────────────
let logoutHandler: (() => void) | null = null

export function setLogoutHandler(handler: () => void) {
  logoutHandler = handler
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { json = true, headers, ...rest } = options

  const token = getAuthToken()
  const authHeaders: Record<string, string> = {}
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(path, {
      headers: {
        ...(json ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders,
        ...headers,
      },
      ...rest,
    })
  } catch (e: any) {
    throw new ApiError(e.message || 'Network error', 0, e)
  }

  // Handle 401 — token expired or invalid
  if (res.status === 401 && typeof window !== 'undefined') {
    if (logoutHandler) {
      logoutHandler()
    } else {
      // Fallback: clear localStorage + reload
      localStorage.removeItem(AUTH_STORAGE_KEY)
      window.location.reload()
    }
    throw new ApiError('Session expired. Please login again.', 401)
  }

  // Handle 429 — rate limited
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After')
    const secs = retryAfter ? Math.ceil(Number(retryAfter) / 60) : 1
    throw new ApiError(`Too many requests. Try again in ${secs} minute(s).`, 429)
  }

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
