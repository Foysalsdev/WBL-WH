import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, generateSessionToken, rateLimit, getClientIP, EMAIL_SCHEMA } from '@/lib/security'
import { z } from 'zod'

// POST /api/auth/login — email/password login with bcrypt verification
const LoginSchema = z.object({
  email: EMAIL_SCHEMA,
  password: z.string().min(1).max(128),
})

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  const rateKey = `login:${ip}`

  // Rate limit: 5 attempts per 15 min per IP
  const rl = rateLimit(rateKey, { windowMs: 15 * 60 * 1000, maxRequests: 5 })
  if (!rl.allowed) {
    const mins = Math.ceil((rl.resetAt - Date.now()) / 60000)
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${mins} minutes.` },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rl.resetAt),
        },
      }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 }
    )
  }

  const { email, password } = parsed.data

  const user = await db.user.findUnique({
    where: { email },
  })

  // Always run bcrypt to prevent timing attacks
  if (!user || !user.active) {
    await verifyPassword(password, '$2b$12$dummyhashforallfailedattemptspaddingforlen')
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    // Log failed attempt
    await db.auditLog.create({
      data: {
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        userName: user.email,
        details: `Failed login attempt from ${ip}`,
      },
    })
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Get role permissions
  const role = await db.role.findUnique({
    where: { name: user.role },
    include: { permissions: true },
  })

  // Generate proper session token
  const token = generateSessionToken(user.id)

  // Log successful login
  await db.auditLog.create({
    data: {
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      userName: user.name,
      details: `Login from ${ip}`,
    },
  })

  // Strip password hash
  const { passwordHash, ...userWithoutHash } = user

  const res = NextResponse.json({
    user: userWithoutHash,
    permissions: role?.permissions.map(p => `${p.module}.${p.action}`) || [],
    token,
  })

  // Set HTTP-only cookie (7-day expiry, secure in production)
  const isProd = process.env.NODE_ENV === 'production'
  res.cookies.set('whp-token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })

  return res
}
