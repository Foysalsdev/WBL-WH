// ═══════════════════════════════════════════════════════════════
//  API Middleware helpers — auth, validation, audit logging
//  Wrap any API route handler with these for consistent behavior.
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, rateLimit, getClientIP, validateBody } from './security'
import { z } from 'zod'

// ─── Auth Context ──────────────────────────────────────────────
export interface AuthContext {
  user: {
    id: string
    email: string
    name: string
    role: string
  } | null
}

// ─── WithAuth wrapper ──────────────────────────────────────────
// Wraps a handler with optional authentication + RBAC check
export function withAuth(
  handler: (req: NextRequest, ctx: AuthContext) => Promise<NextResponse>,
  opts: { required?: boolean; module?: string; action?: string } = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    let user: AuthContext['user'] = null
    try {
      user = await getUserFromRequest(req)
    } catch {
      // DB error — fail closed if auth required
      if (opts.required) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
      }
    }

    if (opts.required && !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // RBAC check
    if (user && opts.module && opts.action && user.role !== 'admin') {
      const role = await db.role.findUnique({
        where: { name: user.role },
        include: { permissions: true },
      })
      const has = role?.permissions.some(p => p.module === opts.module && p.action === opts.action)
      if (!has) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    return handler(req, { user })
  }
}

// ─── WithValidation wrapper ────────────────────────────────────
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (req: NextRequest, data: T, ctx: AuthContext) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const r = validateBody(schema, body)
    if (!r.success) {
      return NextResponse.json({ error: r.error }, { status: 422 })
    }

    let user: AuthContext['user'] = null
    try {
      user = await getUserFromRequest(req)
    } catch {
      // ignore — auth not required for this wrapper
    }

    return handler(req, r.data, { user })
  }
}

// ─── WithRateLimit wrapper ─────────────────────────────────────
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  opts: { windowMs: number; maxRequests: number; keyPrefix?: string }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = getClientIP(req)
    const key = `${opts.keyPrefix || 'api'}:${ip}`
    const rl = rateLimit(key, opts)
    if (!rl.allowed) {
      const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rl.resetAt),
          },
        }
      )
    }
    const res = await handler(req)
    res.headers.set('X-RateLimit-Remaining', String(rl.remaining))
    res.headers.set('X-RateLimit-Reset', String(rl.resetAt))
    return res
  }
}

// ─── Audit Log Helper ──────────────────────────────────────────
export async function auditLog(
  action: string,
  entity: string,
  entityId: string | null,
  user: AuthContext['user'],
  details: string
) {
  try {
    await db.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        userName: user?.name || user?.email || 'System',
        details,
      },
    })
  } catch (e) {
    console.error('[auditLog] failed:', e)
  }
}

// ─── Error Handler ─────────────────────────────────────────────
export function apiError(error: unknown, status = 500): NextResponse {
  const msg = error instanceof Error ? error.message : 'Internal server error'
  if (process.env.NODE_ENV !== 'test') {
    console.error('[API Error]', msg, error)
  }
  return NextResponse.json(
    { error: status === 500 ? 'Internal server error' : msg },
    { status }
  )
}
