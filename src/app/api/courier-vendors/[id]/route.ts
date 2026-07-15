import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/courier-vendors/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const existing = await db.courierVendor.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.courierVendor.delete({ where: { id } })
  await db.auditLog.create({
    data: { action: 'DELETE', entity: 'CourierVendor', entityId: id, userName: 'System', details: `Deleted ${existing.code} — ${existing.name}` },
  })
  return NextResponse.json({ ok: true })
}

// PATCH /api/courier-vendors/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const existing = await db.courierVendor.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.courierVendor.update({ where: { id }, data: body })
  await db.auditLog.create({
    data: { action: 'UPDATE', entity: 'CourierVendor', entityId: id, userName: 'System', details: `Updated ${updated.code}` },
  })
  return NextResponse.json(updated)
}
