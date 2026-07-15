import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/transport-vendors/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const existing = await db.transportVendor.findUnique({ where: { id }, include: { vehicles: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.vehicle.deleteMany({ where: { transportVendorId: id } })
  await db.transportVendor.delete({ where: { id } })

  await db.auditLog.create({
    data: { action: 'DELETE', entity: 'TransportVendor', entityId: id, userName: 'System', details: `Deleted ${existing.code} — ${existing.name}` },
  })
  return NextResponse.json({ ok: true })
}

// PATCH /api/transport-vendors/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const existing = await db.transportVendor.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.transportVendor.update({ where: { id }, data: body, include: { vehicles: true } })
  await db.auditLog.create({
    data: { action: 'UPDATE', entity: 'TransportVendor', entityId: id, userName: 'System', details: `Updated ${updated.code}` },
  })
  return NextResponse.json(updated)
}
