import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, verifyPassword, hashPassword, PASSWORD_SCHEMA } from '@/lib/security'
import { auditLog } from '@/lib/api-middleware'
import { z } from 'zod'

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: PASSWORD_SCHEMA,
})

// POST /api/auth/change-password
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ChangePasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 422 })
  }

  const { currentPassword, newPassword } = parsed.data

  const dbUser = await db.user.findUnique({ where: { id: user.id } })
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const valid = await verifyPassword(currentPassword, dbUser.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ error: 'New password must be different from current' }, { status: 422 })
  }

  const newHash = await hashPassword(newPassword)
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      passwordChangedAt: new Date(),
    },
  })

  await auditLog('UPDATE', 'User', user.id, user, 'Password changed')
  return NextResponse.json({ ok: true, message: 'Password changed successfully' })
}
