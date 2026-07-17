// ═══════════════════════════════════════════════════════════════
//  Security utilities — password hashing, validation, rate limit
// ═══════════════════════════════════════════════════════════════

import bcrypt from 'bcryptjs'
import { z } from 'zod'

// ─── Password Hashing ──────────────────────────────────────────
const BCRYPT_COST = 12  // production-grade

export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }
  return bcrypt.hash(plain, BCRYPT_COST)
}

export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  if (!hash) return false
  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}

// ─── Password Policy ───────────────────────────────────────────
export const PASSWORD_SCHEMA = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const EMAIL_SCHEMA = z.string().email().max(254).toLowerCase()

// ─── Session Token ─────────────────────────────────────────────
// In production: use proper JWT with NEXTAUTH_SECRET
// For now: cryptographically random token (stateless, no DB lookup)
import crypto from 'crypto'

export function generateSessionToken(userId: string): string {
  const payload = `${userId}.${Date.now()}.${crypto.randomBytes(32).toString('hex')}`
  const secret = process.env.NEXTAUTH_SECRET || 'dev-only-insecure-secret-change-me'
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${hmac}`
}

export function verifySessionToken(token: string): { userId: string; issuedAt: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 4) return null
    const [userId, ts, rand, sig] = parts
    const payload = `${userId}.${ts}.${rand}`
    const secret = process.env.NEXTAUTH_SECRET || 'dev-only-insecure-secret-change-me'
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    if (sig !== expectedSig) return null
    const issuedAt = Number(ts)
    // 7-day expiry
    if (Date.now() - issuedAt > 7 * 24 * 60 * 60 * 1000) return null
    return { userId, issuedAt }
  } catch {
    return null
  }
}

// ─── Request Validation Helper ─────────────────────────────────
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  const r = schema.safeParse(body)
  if (r.success) return { success: true, data: r.data }
  return {
    success: false,
    error: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
  }
}

// ─── In-memory Rate Limiter ────────────────────────────────────
// For production: use Upstash Redis or Cloudflare Rate Limiting API
interface RateBucket {
  count: number
  resetAt: number
}
const rateBuckets = new Map<string, RateBucket>()

// Periodically clean up expired buckets (every 5 min)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of rateBuckets.entries()) {
      if (bucket.resetAt < now) rateBuckets.delete(key)
    }
  }, 5 * 60 * 1000).unref?.()
}

interface RateLimitOptions {
  windowMs: number  // e.g. 60_000 = 1 min
  maxRequests: number  // max requests in window
}

export function rateLimit(key: string, opts: RateLimitOptions): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const bucket = rateBuckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    return { allowed: true, remaining: opts.maxRequests - 1, resetAt: now + opts.windowMs }
  }

  bucket.count++
  if (bucket.count > opts.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt }
  }

  return { allowed: true, remaining: opts.maxRequests - bucket.count, resetAt: bucket.resetAt }
}

// ─── Get Client IP ─────────────────────────────────────────────
export function getClientIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

// ─── Get User from Request ─────────────────────────────────────
export async function getUserFromRequest(req: Request): Promise<{ id: string; email: string; name: string; role: string } | null> {
  // Check Authorization header
  const authHeader = req.headers.get('authorization')
  const cookie = req.headers.get('cookie') || ''
  const tokenMatch = cookie.match(/whp-token=([^;]+)/)
  const token = authHeader?.replace('Bearer ', '') || tokenMatch?.[1]
  if (!token) return null

  const session = verifySessionToken(token)
  if (!session) return null

  // Lazy import db to avoid circular deps
  const { db } = await import('@/lib/db')
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, active: true },
  })
  if (!user || !user.active) return null
  return user
}
