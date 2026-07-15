import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/purchase-orders
export async function GET() {
  const pos = await db.purchaseOrder.findMany({
    include: { supplier: true, items: { include: { product: true } } },
    orderBy: { orderDate: 'desc' },
  })
  return NextResponse.json(pos)
}

// POST /api/purchase-orders  — create PO + items, compute total
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { supplierId, orderDate, expectedDate, notes, items } = body
  if (!supplierId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'supplierId and items[] are required' }, { status: 400 })
  }

  // generate next PO number: PO-2026-00004
  const year = new Date().getFullYear()
  const count = await db.purchaseOrder.count({ where: { poNumber: { startsWith: `PO-${year}-` } } })
  const poNumber = `PO-${year}-${String(count + 1).padStart(5, '0')}`

  const totalAmount = items.reduce((s: number, it: any) => s + it.quantity * it.unitPrice, 0)

  const po = await db.purchaseOrder.create({
    data: {
      poNumber,
      supplierId,
      status: 'draft',
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      notes,
      totalAmount,
      items: { create: items.map((it: any) => ({ productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice })) },
    },
    include: { items: true },
  })
  await db.auditLog.create({ data: { action: 'CREATE', entity: 'PurchaseOrder', entityId: po.id, userName: 'System', details: `Created ${po.poNumber}` } })
  return NextResponse.json(po, { status: 201 })
}

// PATCH /api/purchase-orders — update status; on "received", post stock in
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, status } = body
  const po = await db.purchaseOrder.findUnique({ where: { id }, include: { items: true } })
  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.purchaseOrder.update({ where: { id }, data: { status } })

  if (status === 'received' && po.status !== 'received') {
    // post stock in for every line item (atomic-ish)
    for (const it of po.items) {
      const stock = await db.stock.findUnique({ where: { productId: it.productId } })
      if (stock) {
        await db.stock.update({ where: { productId: it.productId }, data: { quantity: stock.quantity + it.quantity } })
      } else {
        await db.stock.create({ data: { productId: it.productId, quantity: it.quantity, reserved: 0, damaged: 0 } })
      }
      await db.movement.create({ data: { productId: it.productId, type: 'IN', quantity: it.quantity, reference: po.poNumber, notes: `GRN against ${po.poNumber}` } })
    }
    await db.purchaseOrder.update({ where: { id }, data: { receivedDate: new Date() } })
    await db.auditLog.create({ data: { action: 'POST', entity: 'PurchaseOrder', entityId: po.id, userName: 'System', details: `Posted GRN for ${po.poNumber}` } })
  }

  await db.auditLog.create({ data: { action: 'UPDATE', entity: 'PurchaseOrder', entityId: po.id, userName: 'System', details: `${po.poNumber} → ${status}` } })
  return NextResponse.json(updated)
}
