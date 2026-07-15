import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/suppliers/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()

  const existing = await db.supplier.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
  }

  const updated = await db.supplier.update({ where: { id }, data: body })

  await db.auditLog.create({
    data: {
      action: 'UPDATE',
      entity: 'Supplier',
      entityId: id,
      userName: 'System',
      details: `Updated ${updated.code} — ${updated.name}`,
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/suppliers/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const existing = await db.supplier.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
  }

  // Safety: don't delete if there are purchase orders
  const orderCount = await db.purchaseOrder.count({ where: { supplierId: id } })
  if (orderCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete supplier with ${orderCount} purchase order(s). Remove or reassign orders first.` },
      { status: 409 },
    )
  }

  await db.supplier.delete({ where: { id } })

  await db.auditLog.create({
    data: {
      action: 'DELETE',
      entity: 'Supplier',
      entityId: id,
      userName: 'System',
      details: `Deleted ${existing.code} — ${existing.name}`,
    },
  })

  return NextResponse.json({ ok: true })
}
