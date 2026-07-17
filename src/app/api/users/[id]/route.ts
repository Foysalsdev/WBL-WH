import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auditLog, apiError, softDelete } from '@/lib/api-middleware'
import { getUserFromRequest, hashPassword, PASSWORD_SCHEMA } from '@/lib/security'
import { z } from 'zod'

const UserUpdateSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  email: z.string().email().max(254).optional(),
  role: z.enum(['admin', 'manager', 'staff', 'viewer']).optional(),
  active: z.boolean().optional(),
  password: PASSWORD_SCHEMA.optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const currentUser = await getUserFromRequest(req)
  if (!currentUser) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  if (currentUser.role !== 'admin' && currentUser.id !== id) {
    return NextResponse.json({ error: 'Only admins can edit other users' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = UserUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 422 })

  try {
    const existing = await db.user.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { password, ...updateData } = parsed.data
    if (password) {
      updateData.passwordHash = await hashPassword(password)
      updateData.passwordChangedAt = new Date()
    }

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, active: true, updatedAt: true },
    })

    await auditLog('UPDATE', 'User', id, currentUser, `Updated ${updated.email}${password ? ' (password changed)' : ''}`)
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    return apiError(e)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const currentUser = await getUserFromRequest(req)
  if (!currentUser) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  if (currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can delete users' }, { status: 403 })
  }

  if (currentUser.id === id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 422 })
  }

  try {
    const existing = await db.user.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await softDelete(db.user, id)
    await auditLog('DELETE', 'User', id, currentUser, `Soft-deleted ${existing.email}`)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
