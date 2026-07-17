import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/security'
import { auditLog, apiError, notDeleted } from '@/lib/api-middleware'
import { z } from 'zod'

// GET /api/purchase-orders
export async function GET(req: NextRequest) {
  try {
    const pos = await db.purchaseOrder.findMany({
      where: { supplier: { deletedAt: null } },
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { orderDate: 'desc' },
      take: 200,
    })
    return NextResponse.json(pos)
  } catch (e) {
    return apiError(e)
  }
}

// POST /api/purchase-orders — create PO + items, compute total
const POInputSchema = z.object({
  supplierId: z.string().min(1),
  orderDate: z.string().optional(),
  expectedDate: z.string().optional(),
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

  const parsed = POInputSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 422 })

  try {
    const { supplierId, orderDate, expectedDate, notes, items } = parsed.data

    const year = new Date().getFullYear()
    const count = await db.purchaseOrder.count({ where: { poNumber: { startsWith: `PO-${year}-` } } })
    const poNumber = `PO-${year}-${String(count + 1).padStart(5, '0')}`

    const totalAmount = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0)

    const po = await db.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        status: 'draft',
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes: notes || null,
        totalAmount,
        items: { create: items.map((it) => ({ productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice })) },
      },
      include: { items: true },
    })
    await auditLog('CREATE', 'PurchaseOrder', po.id, user, `Created ${po.poNumber} — TK ${totalAmount}`)
    return NextResponse.json(po, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}

// PATCH /api/purchase-orders — update status OR post GRN (receive items with QC)
export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const { id, action } = body as any

  if (action === 'status') {
    const { status } = body as any
    const po = await db.purchaseOrder.findUnique({ where: { id } })
    if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const updated = await db.purchaseOrder.update({ where: { id }, data: { status } })
    await auditLog('UPDATE', 'PurchaseOrder', po.id, user, `${po.poNumber} → ${status}`)
    return NextResponse.json(updated)
  }

  if (action === 'receive') {
    const { grnNumber, vehicleNo, invoiceRef, receivedBy, items: receiptItems } = body as any
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

    await auditLog('POST', 'StockMovement', po.id, user, `GRN ${finalGrn} posted for ${po.poNumber} — ${totalReceived} units received (${totalFailed} rejected)`)
    return NextResponse.json({ ok: true, status: newStatus, grnNumber: finalGrn })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
