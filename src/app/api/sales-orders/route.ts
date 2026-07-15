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

// PATCH /api/sales-orders — perform lifecycle actions
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, action } = body

  if (action === 'status') {
    const so = await db.salesOrder.findUnique({ where: { id } })
    if (!so) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = await db.salesOrder.update({ where: { id }, data: { status: body.status } })
    await db.auditLog.create({ data: { action: 'UPDATE', entity: 'SalesOrder', entityId: so.id, userName: 'System', details: `${so.soNumber} → ${body.status}` } })
    return NextResponse.json(updated)
  }

  if (action === 'pick') {
    // Mark items as picked (updates pickedQty, sets pickedBy/At, status → picked)
    const { pickedBy, items: pickItems } = body
    const so = await db.salesOrder.findUnique({ where: { id }, include: { items: true } })
    if (!so) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!['confirmed', 'picked'].includes(so.status)) {
      return NextResponse.json({ error: `Cannot pick in ${so.status} status` }, { status: 400 })
    }
    for (const pi of pickItems) {
      await db.salesOrderItem.update({ where: { id: pi.id }, data: { pickedQty: Number(pi.pickedQty) } })
    }
    await db.salesOrder.update({
      where: { id },
      data: { status: 'picked', pickedBy: pickedBy || so.pickedBy, pickedAt: new Date() },
    })
    await db.auditLog.create({ data: { action: 'POST', entity: 'SalesOrder', entityId: so.id, userName: pickedBy || 'System', details: `${so.soNumber} picked` } })
    return NextResponse.json({ ok: true, status: 'picked' })
  }

  if (action === 'pack') {
    const { packedBy, cartonCount } = body
    const so = await db.salesOrder.findUnique({ where: { id } })
    if (!so) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (so.status !== 'picked') return NextResponse.json({ error: 'Must be picked first' }, { status: 400 })
    await db.salesOrder.update({
      where: { id },
      data: { status: 'packed', packedBy: packedBy || so.packedBy, packedAt: new Date(), cartonCount: Number(cartonCount) || 0 },
    })
    await db.auditLog.create({ data: { action: 'POST', entity: 'SalesOrder', entityId: so.id, userName: packedBy || 'System', details: `${so.soNumber} packed — ${cartonCount} cartons` } })
    return NextResponse.json({ ok: true, status: 'packed' })
  }

  if (action === 'dispatch') {
    const { challanNo, vehicleNo, driverName, driverPhone } = body
    const so = await db.salesOrder.findUnique({ where: { id }, include: { items: true } })
    if (!so) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (so.status !== 'packed') return NextResponse.json({ error: 'Must be packed first' }, { status: 400 })

    // generate challan if not provided
    const year = new Date().getFullYear()
    const finalChallan = challanNo || `CH-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`

    // deduct stock on dispatch
    for (const it of so.items) {
      const deduct = it.pickedQty || it.quantity
      const stock = await db.stock.findUnique({ where: { productId: it.productId } })
      if (stock) await db.stock.update({ where: { productId: it.productId }, data: { quantity: Math.max(0, stock.quantity - deduct) } })
      await db.movement.create({ data: { productId: it.productId, type: 'OUT', quantity: -deduct, reference: so.soNumber, notes: `Dispatched on ${finalChallan} to ${so.soNumber}` } })
    }

    await db.salesOrder.update({
      where: { id },
      data: {
        status: 'shipped',
        challanNo: finalChallan,
        vehicleNo: vehicleNo || null,
        driverName: driverName || null,
        driverPhone: driverPhone || null,
        shippedAt: new Date(),
        podStatus: 'pending',
      },
    })
    await db.auditLog.create({
      data: {
        action: 'POST', entity: 'SalesOrder', entityId: so.id, userName: 'System',
        details: `${so.soNumber} dispatched on ${finalChallan} (vehicle ${vehicleNo || '—'})`,
      },
    })
    return NextResponse.json({ ok: true, status: 'shipped', challanNo: finalChallan })
  }

  if (action === 'pod') {
    // Proof of delivery — confirm/failed/rescheduled
    const { podStatus, podReceivedBy, podNotes } = body
    const so = await db.salesOrder.findUnique({ where: { id } })
    if (!so) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (so.status !== 'shipped') return NextResponse.json({ error: 'Must be shipped first' }, { status: 400 })

    const newStatus = podStatus === 'confirmed' ? 'delivered' : so.status
    await db.salesOrder.update({
      where: { id },
      data: {
        status: newStatus,
        podStatus,
        podReceivedBy: podReceivedBy || null,
        podDate: new Date(),
        podNotes: podNotes || null,
        ...(podStatus === 'confirmed' ? { deliveryDate: new Date() } : {}),
      },
    })
    await db.auditLog.create({
      data: {
        action: 'CONFIRM', entity: 'SalesOrder', entityId: so.id, userName: podReceivedBy || 'System',
        details: `${so.soNumber} POD ${podStatus}${podNotes ? ` — ${podNotes}` : ''}`,
      },
    })
    return NextResponse.json({ ok: true, status: newStatus, podStatus })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
