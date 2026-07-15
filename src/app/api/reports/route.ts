import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/reports?type=stock|movements|valuation|sales|purchases
export async function GET(req: Request) {
  const url = new URL(req.url)
  const type = url.searchParams.get('type') || 'stock'

  // ─── Stock Report ───
  if (type === 'stock') {
    const rows = await db.stock.findMany({ include: { product: true }, orderBy: { product: { sku: 'asc' } } })
    const data = rows.map((r) => ({
      sku: r.product.sku,
      name: r.product.name,
      category: r.product.category,
      onHand: r.quantity,
      reserved: r.reserved,
      damaged: r.damaged,
      available: r.quantity - r.reserved,
      unitCost: r.product.costPrice,
      unitPrice: r.product.salePrice,
      value: r.quantity * r.product.costPrice,
      reorderLevel: r.product.reorderLevel,
    }))
    const totalValue = data.reduce((s, r) => s + r.value, 0)
    return NextResponse.json({ rows: data, totalValue })
  }

  // ─── Movement Ledger ───
  if (type === 'movements') {
    const movs = await db.movement.findMany({ take: 500, orderBy: { createdAt: 'desc' }, include: { product: true } })
    return NextResponse.json({ rows: movs.map((m) => ({
      date: m.createdAt,
      type: m.type,
      quantity: m.quantity,
      reference: m.reference,
      notes: m.notes,
      sku: m.product.sku,
      name: m.product.name,
    })) })
  }

  // ─── Valuation by Category ───
  if (type === 'valuation') {
    const rows = await db.stock.findMany({ include: { product: true } })
    const byCat = new Map<string, { units: number; value: number; saleValue: number }>()
    for (const r of rows) {
      const c = r.product.category || 'Other'
      const cur = byCat.get(c) || { units: 0, value: 0, saleValue: 0 }
      cur.units += r.quantity
      cur.value += r.quantity * r.product.costPrice
      cur.saleValue += r.quantity * r.product.salePrice
      byCat.set(c, cur)
    }
    const result = Array.from(byCat, ([category, v]) => ({ category, ...v }))
    const totalCost = result.reduce((s, r) => s + r.value, 0)
    const totalSale = result.reduce((s, r) => s + r.saleValue, 0)
    return NextResponse.json({ rows: result, totalCost, totalSale })
  }

  // ─── Sales Summary ───
  if (type === 'sales') {
    const sos = await db.salesOrder.findMany({
      include: { customer: true, items: true, dispatches: true },
      orderBy: { orderDate: 'desc' },
    })
    const rows = sos.map((so) => ({
      soNumber: so.soNumber,
      invoiceNo: so.invoiceNo,
      dealer: so.customer?.name || '—',
      dealerCode: so.customer?.code || '—',
      city: so.customer?.city || '—',
      status: so.status,
      orderDate: so.orderDate,
      deliveryDate: so.deliveryDate,
      totalQty: so.items.reduce((s, it) => s + it.quantity, 0),
      deliveredQty: so.items.reduce((s, it) => s + (it.deliveredQty || 0), 0),
      totalAmount: so.totalAmount,
      dispatchCount: so.dispatches.length,
    }))
    const totalSales = rows.reduce((s, r) => s + r.totalAmount, 0)
    const totalDelivered = rows.reduce((s, r) => s + r.deliveredQty, 0)
    const totalUnits = rows.reduce((s, r) => s + r.totalQty, 0)
    return NextResponse.json({ rows, totalSales, totalDelivered, totalUnits })
  }

  // ─── Purchase Summary ───
  if (type === 'purchases') {
    const pos = await db.purchaseOrder.findMany({
      include: { supplier: true, items: true },
      orderBy: { orderDate: 'desc' },
    })
    const rows = pos.map((po) => ({
      poNumber: po.poNumber,
      grnNumber: po.grnNumber,
      supplier: po.supplier?.name || '—',
      supplierCode: po.supplier?.code || '—',
      status: po.status,
      orderDate: po.orderDate,
      receivedDate: po.receivedDate,
      totalQty: po.items.reduce((s, it) => s + it.quantity, 0),
      receivedQty: po.items.reduce((s, it) => s + (it.receivedQty || 0), 0),
      failedQty: po.items.reduce((s, it) => s + (it.failedQty || 0), 0),
      totalAmount: po.totalAmount,
    }))
    const totalPurchases = rows.reduce((s, r) => s + r.totalAmount, 0)
    const totalReceived = rows.reduce((s, r) => s + r.receivedQty, 0)
    const totalUnits = rows.reduce((s, r) => s + r.totalQty, 0)
    return NextResponse.json({ rows, totalPurchases, totalReceived, totalUnits })
  }

  return NextResponse.json({ error: 'unknown type' }, { status: 400 })
}
