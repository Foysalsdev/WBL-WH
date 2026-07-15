import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/sales-orders
export async function GET() {
  const sos = await db.salesOrder.findMany({
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { orderDate: 'desc' },
  })
  return NextResponse.json(sos)
}

// POST /api/sales-orders — create SO + items, compute total
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { customerId, orderDate, deliveryDate, notes, items } = body
  if (!customerId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'customerId and items[] are required' }, { status: 400 })
  }

  const year = new Date().getFullYear()
  const count = await db.salesOrder.count({ where: { soNumber: { startsWith: `SO-${year}-` } } })
  const soNumber = `SO-${year}-${String(count + 1).padStart(5, '0')}`

  const totalAmount = items.reduce((s: number, it: any) => s + it.quantity * it.unitPrice, 0)

  const so = await db.salesOrder.create({
    data: {
      soNumber,
      customerId,
      status: 'draft',
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      notes,
      totalAmount,
      items: { create: items.map((it: any) => ({ productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice })) },
    },
    include: { items: true },
  })
  await db.auditLog.create({ data: { action: 'CREATE', entity: 'SalesOrder', entityId: so.id, userName: 'System', details: `Created ${so.soNumber}` } })
  return NextResponse.json(so, { status: 201 })
}

// PATCH /api/sales-orders — update status; on "shipped", post stock out
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, status } = body
  const so = await db.salesOrder.findUnique({ where: { id }, include: { items: true } })
  if (!so) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.salesOrder.update({ where: { id }, data: { status } })

  if (status === 'shipped' && so.status !== 'shipped') {
    for (const it of so.items) {
      const stock = await db.stock.findUnique({ where: { productId: it.productId } })
      if (stock) {
        await db.stock.update({ where: { productId: it.productId }, data: { quantity: Math.max(0, stock.quantity - it.quantity) } })
      }
      await db.movement.create({ data: { productId: it.productId, type: 'OUT', quantity: -it.quantity, reference: so.soNumber, notes: `Shipment against ${so.soNumber}` } })
    }
    await db.auditLog.create({ data: { action: 'POST', entity: 'SalesOrder', entityId: so.id, userName: 'System', details: `Posted shipment for ${so.soNumber}` } })
  }

  await db.auditLog.create({ data: { action: 'UPDATE', entity: 'SalesOrder', entityId: so.id, userName: 'System', details: `${so.soNumber} → ${status}` } })
  return NextResponse.json(updated)
}
