import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/warehouses/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()

  const existing = await db.warehouse.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })
  }

  const updated = await db.warehouse.update({
    where: { id },
    data: body,
    include: { locations: true },
  })

  await db.auditLog.create({
    data: {
      action: 'UPDATE',
      entity: 'Warehouse',
      entityId: id,
      userName: 'System',
      details: `Updated ${updated.code} — ${updated.name}`,
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/warehouses/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const existing = await db.warehouse.findUnique({
    where: { id },
    include: { locations: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })
  }

  // Delete locations first (cascade)
  await db.location.deleteMany({ where: { warehouseId: id } })
  await db.warehouse.delete({ where: { id } })

  await db.auditLog.create({
    data: {
      action: 'DELETE',
      entity: 'Warehouse',
      entityId: id,
      userName: 'System',
      details: `Deleted ${existing.code} — ${existing.name}`,
    },
  })

  return NextResponse.json({ ok: true })
}
