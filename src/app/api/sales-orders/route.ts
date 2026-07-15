import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/sales-orders
export async function GET() {
  const sos = await db.salesOrder.findMany({
    include: {
      customer: true,
      items: { include: { product: true } },
      dispatches: { include: { items: { include: { product: true } } } },
    },
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

// PATCH /api/sales-orders — 5-step workflow with partial dispatch
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, action } = body

  // ─── action: 'status' — simple status change (draft→confirmed, cancel) ───
  if (action === 'status') {
    const so = await db.salesOrder.findUnique({ where: { id } })
    if (!so) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = await db.salesOrder.update({ where: { id }, data: { status: body.status } })
    await db.auditLog.create({ data: { action: 'UPDATE', entity: 'SalesOrder', entityId: so.id, userName: 'System', details: `${so.soNumber} → ${body.status}` } })
    return NextResponse.json(updated)
  }

  // ─── action: 'pick' — Step 1: record picked quantities ───
  if (action === 'pick') {
    const { pickedBy, items: pickItems } = body
    const so = await db.salesOrder.findUnique({ where: { id }, include: { items: true } })
    if (!so) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (so.status !== 'confirmed') {
      return NextResponse.json({ error: `Cannot pick in '${so.status}' status — must be 'confirmed'` }, { status: 400 })
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

  // ─── action: 'scan' — Step 2: barcode verification ───
  if (action === 'scan') {
    const { scannedBy, items: scanItems } = body
    const so = await db.salesOrder.findUnique({ where: { id }, include: { items: true } })
    if (!so) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (so.status !== 'picked') {
      return NextResponse.json({ error: `Cannot scan in '${so.status}' status — must be 'picked'` }, { status: 400 })
    }
    for (const si of scanItems) {
      await db.salesOrderItem.update({ where: { id: si.id }, data: { scannedQty: Number(si.scannedQty) } })
    }
    await db.salesOrder.update({
      where: { id },
      data: { status: 'scanned', scannedBy: scannedBy || so.scannedBy, scannedAt: new Date() },
    })
    await db.auditLog.create({ data: { action: 'POST', entity: 'SalesOrder', entityId: so.id, userName: scannedBy || 'System', details: `${so.soNumber} scanned` } })
    return NextResponse.json({ ok: true, status: 'scanned' })
  }

  // ─── action: 'invoice' — Step 3: generate invoice ───
  if (action === 'invoice') {
    const { invoicedBy, cartonCount, invoiceNo } = body
    const so = await db.salesOrder.findUnique({ where: { id } })
    if (!so) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (so.status !== 'scanned') {
      return NextResponse.json({ error: `Cannot invoice in '${so.status}' status — must be 'scanned'` }, { status: 400 })
    }
    const year = new Date().getFullYear()
    const count = await db.salesOrder.count({ where: { invoiceNo: { startsWith: `INV-${year}-` } } })
    const finalInvoiceNo = invoiceNo || `INV-${year}-${String(count + 1).padStart(5, '0')}`
    await db.salesOrder.update({
      where: { id },
      data: {
        status: 'invoiced',
        invoiceNo: finalInvoiceNo,
        invoiceDate: new Date(),
        invoicedBy: invoicedBy || so.invoicedBy,
        cartonCount: Number(cartonCount) || 0,
      },
    })
    await db.auditLog.create({ data: { action: 'POST', entity: 'SalesOrder', entityId: so.id, userName: invoicedBy || 'System', details: `${so.soNumber} invoiced — ${finalInvoiceNo}` } })
    return NextResponse.json({ ok: true, status: 'invoiced', invoiceNo: finalInvoiceNo })
  }

  // ─── action: 'dispatch' — Step 4: partial dispatch with Transport/Courier ───
  // Creates a Dispatch record, deducts stock for delivered items only,
  // updates deliveredQty on SO items, and changes SO status to
  // 'partially_dispatched' or 'dispatched' depending on whether all
  // items are fully delivered.
  if (action === 'dispatch') {
    const {
      deliveryMethod,      // 'transport' | 'courier'
      vehicleNo, driverName, driverPhone,     // transport fields
      courierName, trackingNumber,             // courier fields
      challanNo, dispatchedBy, notes,
      items: dispatchItems,                    // [{ soItemId, productId, quantity, unitPrice }]
    } = body

    const so = await db.salesOrder.findUnique({ where: { id }, include: { items: true } })
    if (!so) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (so.status !== 'invoiced' && so.status !== 'partially_dispatched') {
      return NextResponse.json({ error: `Cannot dispatch in '${so.status}' status — must be 'invoiced' or 'partially_dispatched'` }, { status: 400 })
    }
    if (!deliveryMethod) return NextResponse.json({ error: 'deliveryMethod is required' }, { status: 400 })
    if (deliveryMethod === 'transport' && !vehicleNo) {
      return NextResponse.json({ error: 'Vehicle number required for transport delivery' }, { status: 400 })
    }
    if (deliveryMethod === 'courier' && !courierName) {
      return NextResponse.json({ error: 'Courier name required for courier delivery' }, { status: 400 })
    }
    if (!dispatchItems || dispatchItems.length === 0) {
      return NextResponse.json({ error: 'At least one item required for dispatch' }, { status: 400 })
    }

    // Validate dispatch quantities against remaining (picked - already delivered)
    for (const di of dispatchItems) {
      const soItem = so.items.find((it) => it.id === di.soItemId)
      if (!soItem) return NextResponse.json({ error: `SO item ${di.soItemId} not found` }, { status: 400 })
      const remaining = (soItem.pickedQty || soItem.quantity) - soItem.deliveredQty
      if (Number(di.quantity) > remaining) {
        return NextResponse.json({ error: `Cannot dispatch ${di.quantity} units — only ${remaining} remaining for ${soItem.productId}` }, { status: 400 })
      }
    }

    // Generate dispatch number and challan
    const year = new Date().getFullYear()
    const dspCount = await db.dispatch.count({ where: { dispatchNo: { startsWith: `DSP-${year}-` } } })
    const dispatchNo = `DSP-${year}-${String(dspCount + 1).padStart(5, '0')}`
    const finalChallan = challanNo || `CH-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`

    const totalQty = dispatchItems.reduce((s: number, di: any) => s + Number(di.quantity), 0)
    const totalAmount = dispatchItems.reduce((s: number, di: any) => s + Number(di.quantity) * Number(di.unitPrice), 0)

    // Create the Dispatch record with items
    const dispatch = await db.dispatch.create({
      data: {
        soId: id,
        dispatchNo,
        deliveryMethod,
        vehicleNo: deliveryMethod === 'transport' ? vehicleNo : null,
        driverName: deliveryMethod === 'transport' ? (driverName || null) : null,
        driverPhone: deliveryMethod === 'transport' ? (driverPhone || null) : null,
        courierName: deliveryMethod === 'courier' ? courierName : null,
        trackingNumber: deliveryMethod === 'courier' ? (trackingNumber || null) : null,
        challanNo: finalChallan,
        dispatchedBy: dispatchedBy || null,
        notes: notes || null,
        totalQty,
        totalAmount,
        items: {
          create: dispatchItems.map((di: any) => ({
            soItemId: di.soItemId,
            productId: di.productId,
            quantity: Number(di.quantity),
            unitPrice: Number(di.unitPrice),
          })),
        },
      },
    })

    // Update deliveredQty on SO items + deduct stock + write movements
    for (const di of dispatchItems) {
      const qty = Number(di.quantity)
      // Update SO item deliveredQty
      const soItem = so.items.find((it) => it.id === di.soItemId)
      if (soItem) {
        await db.salesOrderItem.update({
          where: { id: di.soItemId },
          data: { deliveredQty: soItem.deliveredQty + qty },
        })
      }
      // Deduct stock
      const stock = await db.stock.findUnique({ where: { productId: di.productId } })
      if (stock) {
        await db.stock.update({
          where: { productId: di.productId },
          data: { quantity: Math.max(0, stock.quantity - qty) },
        })
      }
      // Write movement
      await db.movement.create({
        data: {
          productId: di.productId,
          type: 'OUT',
          quantity: -qty,
          reference: so.soNumber,
          notes: `Dispatch ${dispatchNo} via ${deliveryMethod}`,
        },
      })
    }

    // Check if all items are now fully delivered
    const refreshedItems = await db.salesOrderItem.findMany({ where: { soId: id } })
    const allDelivered = refreshedItems.every((it) => it.deliveredQty >= (it.pickedQty || it.quantity))
    const newStatus = allDelivered ? 'dispatched' : 'partially_dispatched'

    await db.salesOrder.update({ where: { id }, data: { status: newStatus } })

    await db.auditLog.create({
      data: {
        action: 'POST', entity: 'Dispatch', entityId: dispatch.id, userName: dispatchedBy || 'System',
        details: `${dispatchNo} created for ${so.soNumber} — ${totalQty} units via ${deliveryMethod}`,
      },
    })

    return NextResponse.json({
      ok: true,
      dispatchNo,
      challanNo: finalChallan,
      status: newStatus,
      allDelivered,
    })
  }

  // ─── action: 'pod' — Step 5: per-dispatch POD ───
  // Now operates on a Dispatch record, not the SO directly
  if (action === 'pod') {
    const { dispatchId, podStatus, podReceivedBy, podNotes } = body

    const dispatch = await db.dispatch.findUnique({
      where: { id: dispatchId },
      include: { so: true },
    })
    if (!dispatch) return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 })
    if (dispatch.podStatus !== 'pending') {
      return NextResponse.json({ error: `POD already recorded for ${dispatch.dispatchNo}` }, { status: 400 })
    }

    await db.dispatch.update({
      where: { id: dispatchId },
      data: {
        podStatus,
        podReceivedBy: podReceivedBy || null,
        podDate: new Date(),
        podNotes: podNotes || null,
      },
    })

    // If this dispatch is confirmed, check if ALL dispatches for this SO are confirmed
    // If so, mark the SO as 'delivered'
    if (podStatus === 'confirmed') {
      const allDispatches = await db.dispatch.findMany({ where: { soId: dispatch.soId } })
      const allConfirmed = allDispatches.every((d) => d.podStatus === 'confirmed')
      if (allConfirmed) {
        await db.salesOrder.update({
          where: { id: dispatch.soId },
          data: { status: 'delivered', deliveryDate: new Date() },
        })
      }
    }

    await db.auditLog.create({
      data: {
        action: 'CONFIRM', entity: 'Dispatch', entityId: dispatchId,
        userName: podReceivedBy || 'System',
        details: `${dispatch.dispatchNo} POD ${podStatus}`,
      },
    })

    return NextResponse.json({ ok: true, podStatus })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
