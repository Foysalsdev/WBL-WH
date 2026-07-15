import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/users/[id] — update user (role, active, name)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()

  const existing = await db.user.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { password, ...updateData } = body

  // If password provided, hash it (in production: bcrypt)
  if (password) {
    updateData.passwordHash = `$2a$10$dummy_${password}_${Date.now()}`
  }

  const updated = await db.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  await db.auditLog.create({
    data: { action: 'UPDATE', entity: 'User', entityId: id, userName: 'System', details: `Updated ${updated.email} — role: ${updated.role}` },
  })

  return NextResponse.json(updated)
}

// DELETE /api/users/[id] — deactivate user (soft delete)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const existing = await db.user.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Soft delete — deactivate instead of hard delete
  await db.user.update({ where: { id }, data: { active: false } })
  await db.auditLog.create({
    data: { action: 'DELETE', entity: 'User', entityId: id, userName: 'System', details: `Deactivated ${existing.email}` },
  })

  return NextResponse.json({ ok: true })
}
