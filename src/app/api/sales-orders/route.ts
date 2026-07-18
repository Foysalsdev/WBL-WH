import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/security'
import { auditLog, apiError, logTimeline } from '@/lib/api-middleware'
import { z } from 'zod'

// GET /api/sales-orders
export async function GET() {
  try {
    const sos = await db.salesOrder.findMany({
      where: { customer: { deletedAt: null } },
      include: {
        customer: true,
        items: { include: { product: true } },
        dispatches: { include: { items: { include: { product: true } } } },
      },
      orderBy: { orderDate: 'desc' },
      take: 200,
    })
    return NextResponse.json(sos)
  } catch (e) {
    return apiError(e)
  }
}

// POST /api/sales-orders — create SO + items, compute total
const SOInputSchema = z.object({
  customerId: z.string().min(1),
  orderDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(1e6),
    unitPrice: z.number().min(0).max(1e9),
  })).min(1, 'At least one item required'),
})

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = SOInputSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 422 })

  try {
    const { customerId, orderDate, deliveryDate, notes, items } = parsed.data

    // Validate stock availability for all items
    for (const item of items) {
      const stock = await db.stock.findUnique({ where: { productId: item.productId } })
      const available = stock ? (stock.quantity - stock.reserved) : 0
      if (item.quantity > available) {
        const product = await db.product.findUnique({ where: { id: item.productId }, select: { sku: true, name: true } })
        return NextResponse.json({
          error: `Insufficient stock for ${product?.sku || item.productId} (${product?.name || ''}) — ordered ${item.quantity}, only ${available} available`,
        }, { status: 422 })
      }
    }

    const year = new Date().getFullYear()
    const count = await db.salesOrder.count({ where: { soNumber: { startsWith: `SO-${year}-` } } })
    const soNumber = `SO-${year}-${String(count + 1).padStart(5, '0')}`

    const totalAmount = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0)

    const so = await db.salesOrder.create({
      data: {
        soNumber,
        customerId,
        status: 'draft',
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        notes: notes || null,
        totalAmount,
        items: { create: items.map((it) => ({ productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice })) },
      },
      include: { items: true },
    })
    await auditLog('CREATE', 'SalesOrder', so.id, user, `Created ${so.soNumber} — TK ${totalAmount}`)
    return NextResponse.json(so, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}

// PATCH /api/sales-orders — 5-step workflow with partial dispatch
export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { id, action } = body as any

  // ─── action: 'status' — simple status change (draft→confirmed, cancel) ───
  if (action === 'status') {
    const so = await db.salesOrder.findUnique({ where: { id } })
    if (!so) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = await db.salesOrder.update({ where: { id }, data: { status: body.status } })
    await auditLog('UPDATE', 'SalesOrder', so.id, user, `${so.soNumber} → ${body.status}`)
    return NextResponse.json(updated)
  }

  // ─── action: 'pick' — Step 1: record picked quantities + reserve stock ───
  if (action === 'pick') {
    const { pickedBy, items: pickItems } = body as any
    const so = await db.salesOrder.findUnique({ where: { id }, include: { items: { include: { product: { include: { stock: true } } } } } })
    if (!so) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (so.status !== 'confirmed') {
      return NextResponse.json({ error: `Cannot pick in '${so.status}' status — must be 'confirmed'` }, { status: 400 })
    }

    // Validate: cannot pick more than available stock (quantity - already reserved)
    for (const pi of pickItems) {
      const soItem = so.items.find((it) => it.id === pi.id)
      if (!soItem) continue
      const stock = soItem.product?.stock
      if (!stock) {
        return NextResponse.json({ error: `No stock record for ${soItem.product?.sku}` }, { status: 400 })
      }
      const available = stock.quantity - stock.reserved
      if (Number(pi.pickedQty) > available) {
        return NextResponse.json({
          error: `Cannot pick ${pi.pickedQty} units of ${soItem.product?.sku} — only ${available} available (${stock.quantity} on hand, ${stock.reserved} already reserved)`,
        }, { status: 400 })
      }
    }

    // Update pickedQty + reserve stock
    for (const pi of pickItems) {
      const soItem = so.items.find((it) => it.id === pi.id)
      if (!soItem) continue
      const pickQty = Number(pi.pickedQty)

      await db.salesOrderItem.update({
        where: { id: pi.id },
        data: { pickedQty: pickQty },
      })

      // Reserve stock
      const stock = await db.stock.findUnique({ where: { productId: soItem.productId } })
      if (stock) {
        await db.stock.update({
          where: { productId: soItem.productId },
          data: { reserved: stock.reserved + pickQty },
        })
      }
    }

    await db.salesOrder.update({
      where: { id },
      data: { status: 'picked', pickedBy: pickedBy || so.pickedBy, pickedAt: new Date() },
    })
    await logTimeline('SalesOrder', so.id, so.status, 'picked', 'pick', user, `${so.soNumber} picked`)
    await auditLog('POST', 'SalesOrder', so.id, user, `${so.soNumber} picked — stock reserved`)
    return NextResponse.json({ ok: true, status: 'picked' })
  }

  // ─── action: 'scan' — Step 2: barcode verification ───
  if (action === 'scan') {
    const { scannedBy, items: scanItems } = body as any
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
    await logTimeline('SalesOrder', so.id, so.status, 'scanned', 'scan', user, `${so.soNumber} scanned`)
    await auditLog('POST', 'SalesOrder', so.id, user, `${so.soNumber} scanned`)
    return NextResponse.json({ ok: true, status: 'scanned' })
  }

  // ─── action: 'invoice' — Step 3: record SAP invoice reference ───
  if (action === 'invoice') {
    const { readyBy, cartonCount, sapInvoiceRef } = body as any
    const so = await db.salesOrder.findUnique({ where: { id } })
    if (!so) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (so.status !== 'scanned') {
      return NextResponse.json({ error: `Cannot invoice in '${so.status}' status — must be 'scanned'` }, { status: 400 })
    }
    // SAP invoice ref is entered manually by user (not auto-generated)
    if (!sapInvoiceRef) {
      return NextResponse.json({ error: 'SAP invoice reference is required' }, { status: 422 })
    }
    await db.salesOrder.update({
      where: { id },
      data: {
        status: 'ready',
        sapInvoiceRef,
        sapInvoiceDate: new Date(),
        readyBy: readyBy || so.readyBy,
        cartonCount: Number(cartonCount) || 0,
      },
    })
    await auditLog('POST', 'SalesOrder', so.id, user, `${so.soNumber} ready — SAP ref ${sapInvoiceRef}`)
    await logTimeline('SalesOrder', so.id, so.status, 'ready', 'invoice', user, `${so.soNumber} ready — SAP ${sapInvoiceRef}`)
    return NextResponse.json({ ok: true, status: 'ready', sapInvoiceRef })
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
    } = body as any

    const so = await db.salesOrder.findUnique({ where: { id }, include: { items: true } })
    if (!so) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (so.status !== 'ready' && so.status !== 'partially_dispatched') {
      return NextResponse.json({ error: `Cannot dispatch in '${so.status}' status — must be 'ready' or 'partially_dispatched'` }, { status: 400 })
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

    // Update deliveredQty on SO items + deduct stock + release reservation + write movements
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
      // Deduct stock quantity AND release reservation
      const stock = await db.stock.findUnique({ where: { productId: di.productId } })
      if (stock) {
        await db.stock.update({
          where: { productId: di.productId },
          data: {
            quantity: Math.max(0, stock.quantity - qty),
            reserved: Math.max(0, stock.reserved - qty),
          },
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

    await auditLog('POST', 'Dispatch', dispatch.id, user, `${dispatchNo} created for ${so.soNumber} — ${totalQty} units via ${deliveryMethod}`)
    await logTimeline('SalesOrder', so.id, so.status, newStatus, 'dispatch', user, `${dispatchNo} via ${deliveryMethod}`, { dispatchNo, totalQty })
    await logTimeline('Dispatch', dispatch.id, null, 'created', 'dispatch', user, `${dispatchNo} for ${so.soNumber}`)

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
    const { dispatchId, podStatus, podReceivedBy, podNotes } = body as any

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

    await auditLog('CONFIRM', 'Dispatch', dispatchId, user, `${dispatch.dispatchNo} POD ${podStatus}`)
    await logTimeline('Dispatch', dispatchId, dispatch.podStatus, podStatus, 'pod', user, `${dispatch.dispatchNo} POD ${podStatus}`)

    return NextResponse.json({ ok: true, podStatus })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
