import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withValidation, withRateLimit, auditLog, apiError, type AuthContext } from '@/lib/api-middleware'
import { hashPassword, EMAIL_SCHEMA, PASSWORD_SCHEMA } from '@/lib/security'
import { z } from 'zod'

const UserInputSchema = z.object({
  name: z.string().min(1).max(255).trim(),
  email: EMAIL_SCHEMA,
  role: z.enum(['admin', 'manager', 'staff', 'viewer']),
  password: PASSWORD_SCHEMA,
  active: z.boolean().default(true),
})

export const GET = withRateLimit(
  withAuth(async (req: NextRequest, ctx: AuthContext) => {
    try {
      // Only admin can list users
      if (ctx.user?.role !== 'admin') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
      const users = await db.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true, email: true, name: true, role: true, avatar: true,
          active: true, lastLoginAt: true, passwordChangedAt: true, createdAt: true, updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      return NextResponse.json(users)
    } catch (e) {
      return apiError(e)
    }
  }),
  { windowMs: 60_000, maxRequests: 30, keyPrefix: 'users-list' }
)

export const POST = withAuth(
  withValidation(UserInputSchema, async (req: NextRequest, data, ctx: AuthContext) => {
    try {
      if (ctx.user?.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can create users' }, { status: 403 })
      }

      const existing = await db.user.findUnique({ where: { email: data.email } })
      if (existing && !existing.deletedAt) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
      }

      const passwordHash = await hashPassword(data.password)
      const { password, ...userData } = data
      const user = await db.user.create({
        data: {
          ...userData,
          passwordHash,
          passwordChangedAt: new Date(),
        },
        select: {
          id: true, email: true, name: true, role: true, active: true, createdAt: true,
        },
      })

      await auditLog('CREATE', 'User', user.id, ctx.user, `Created ${user.email} (${user.role})`)
      return NextResponse.json(user, { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
      return apiError(e)
    }
  }),
  { required: true, module: 'users', action: 'create' }
)
