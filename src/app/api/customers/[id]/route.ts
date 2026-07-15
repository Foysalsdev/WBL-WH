import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/customers/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()

  const existing = await db.customer.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  const updated = await db.customer.update({ where: { id }, data: body })

  await db.auditLog.create({
    data: {
      action: 'UPDATE',
      entity: 'Customer',
      entityId: id,
      userName: 'System',
      details: `Updated ${updated.code} — ${updated.name}`,
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/customers/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const existing = await db.customer.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // Safety: don't delete if there are sales orders
  const orderCount = await db.salesOrder.count({ where: { customerId: id } })
  if (orderCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete dealer with ${orderCount} sales order(s). Remove or reassign orders first.` },
      { status: 409 },
    )
  }

  await db.customer.delete({ where: { id } })

  await db.auditLog.create({
    data: {
      action: 'DELETE',
      entity: 'Customer',
      entityId: id,
      userName: 'System',
      details: `Deleted ${existing.code} — ${existing.name}`,
    },
  })

  return NextResponse.json({ ok: true })
}
