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

// PATCH /api/purchase-orders — update status OR post GRN (receive items with QC)
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, action } = body

  if (action === 'status') {
    const { status } = body
    const po = await db.purchaseOrder.findUnique({ where: { id } })
    if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = await db.purchaseOrder.update({ where: { id }, data: { status } })
    await db.auditLog.create({ data: { action: 'UPDATE', entity: 'PurchaseOrder', entityId: po.id, userName: 'System', details: `${po.poNumber} → ${status}` } })
    return NextResponse.json(updated)
  }

  if (action === 'receive') {
    // Post GRN: receive line items with quality-check breakdown
    const { grnNumber, vehicleNo, invoiceRef, receivedBy, items: receiptItems } = body
    const po = await db.purchaseOrder.findUnique({ where: { id }, include: { items: true } })
    if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (po.status === 'received') return NextResponse.json({ error: 'PO already fully received' }, { status: 400 })

    // generate GRN number if not provided
    const year = new Date().getFullYear()
    const finalGrn = grnNumber || (po.grnNumber) || (() => {
      const c = String(Math.floor(Math.random() * 9000) + 1000)
      return `GRN-${year}-${c}`
    })()

    // update each line item with received/passed/failed + putaway location
    let totalReceived = 0
    let totalFailed = 0
    for (const ri of receiptItems) {
      const it = po.items.find((x) => x.id === ri.id)
      if (!it) continue
      const newReceived = it.receivedQty + Number(ri.received)
      const newPassed = it.passedQty + Number(ri.passed)
      const newFailed = it.failedQty + Number(ri.failed)
      await db.purchaseOrderItem.update({
        where: { id: ri.id },
        data: { receivedQty: newReceived, passedQty: newPassed, failedQty: newFailed, putawayLocation: ri.putawayLocation || it.putawayLocation },
      })
      totalReceived += Number(ri.received)
      totalFailed += Number(ri.failed)
      // post stock-in for passed units
      if (Number(ri.passed) > 0) {
        const stock = await db.stock.findUnique({ where: { productId: it.productId } })
        if (stock) await db.stock.update({ where: { productId: it.productId }, data: { quantity: stock.quantity + Number(ri.passed) } })
        else await db.stock.create({ data: { productId: it.productId, quantity: Number(ri.passed), reserved: 0, damaged: 0 } })
        await db.movement.create({ data: { productId: it.productId, type: 'IN', quantity: Number(ri.passed), reference: finalGrn, notes: `GRN against ${po.poNumber} — QC passed` } })
      }
      // post damaged/rejected to damaged stock + adjustment movement
      if (Number(ri.failed) > 0) {
        const stock = await db.stock.findUnique({ where: { productId: it.productId } })
        if (stock) await db.stock.update({ where: { productId: it.productId }, data: { damaged: stock.damaged + Number(ri.failed) } })
        await db.movement.create({ data: { productId: it.productId, type: 'ADJUST', quantity: Number(ri.failed), reference: finalGrn, notes: `Rejected units from ${po.poNumber} — QC failed` } })
      }
    }

    // determine new status: received (all items fully received) or partial
    const refreshedPo = await db.purchaseOrder.findUnique({ where: { id }, include: { items: true } })
    const allComplete = refreshedPo!.items.every((it) => it.receivedQty >= it.quantity)
    const newStatus = allComplete ? 'received' : 'partial'

    await db.purchaseOrder.update({
      where: { id },
      data: {
        status: newStatus,
        grnNumber: finalGrn,
        vehicleNo: vehicleNo || po.vehicleNo,
        invoiceRef: invoiceRef || po.invoiceRef,
        receivedBy: receivedBy || po.receivedBy,
        receivedDate: allComplete ? new Date() : po.receivedDate,
      },
    })

    await db.auditLog.create({
      data: {
        action: 'POST', entity: 'StockMovement', entityId: po.id, userName: receivedBy || 'System',
        details: `GRN ${finalGrn} posted for ${po.poNumber} — ${totalReceived} units received (${totalFailed} rejected)`,
      },
    })
    return NextResponse.json({ ok: true, status: newStatus, grnNumber: finalGrn })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
