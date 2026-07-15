import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/dashboard — aggregated KPIs + charts
export async function GET() {
  const [
    products,
    stockRows,
    lowStockRows,
    movements,
    pos,
    sos,
    customers,
    suppliers,
    warehouses,
    audit,
  ] = await Promise.all([
    db.product.count({ where: { isActive: true } }),
    db.stock.findMany({ include: { product: true } }),
    db.stock.findMany({ include: { product: true } }),
    db.movement.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { product: true } }),
    db.purchaseOrder.findMany({ include: { supplier: true, items: true } }),
    db.salesOrder.findMany({ include: { customer: true, items: true } }),
    db.customer.count(),
    db.supplier.count(),
    db.warehouse.count(),
    db.auditLog.findMany({ take: 8, orderBy: { createdAt: 'desc' } }),
  ])

  const totalUnits = stockRows.reduce((s, r) => s + r.quantity, 0)
  const totalValue = stockRows.reduce((s, r) => s + r.quantity * (r.product.costPrice || 0), 0)
  const damagedUnits = stockRows.reduce((s, r) => s + r.damaged, 0)
  const reservedUnits = stockRows.reduce((s, r) => s + r.reserved, 0)
  const lowStock = lowStockRows
    .filter((r) => r.quantity <= r.product.reorderLevel)
    .map((r) => ({
      id: r.product.id,
      sku: r.product.sku,
      name: r.product.name,
      onHand: r.quantity,
      reorderLevel: r.product.reorderLevel,
    }))

  // Stock value by category
  const catMap = new Map<string, { units: number; value: number }>()
  for (const r of stockRows) {
    const c = r.product.category || 'Uncategorized'
    const cur = catMap.get(c) || { units: 0, value: 0 }
    cur.units += r.quantity
    cur.value += r.quantity * r.product.costPrice
    catMap.set(c, cur)
  }
  const byCategory = Array.from(catMap, ([name, v]) => ({ name, ...v }))

  // Movements last 14 days (in/out totals)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 14)
  const recentMov = await db.movement.findMany({ where: { createdAt: { gte: cutoff } } })
  const dayMap = new Map<string, { in: number; out: number }>()
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dayMap.set(key, { in: 0, out: 0 })
  }
  for (const m of recentMov) {
    const key = m.createdAt.toISOString().slice(0, 10)
    if (!dayMap.has(key)) continue
    const v = dayMap.get(key)!
    if (m.type === 'IN') v.in += m.quantity
    if (m.type === 'OUT') v.out += Math.abs(m.quantity)
  }
  const trend = Array.from(dayMap, ([date, v]) => ({ date: date.slice(5), in: v.in, out: v.out }))

  // Order counts by status
  const poByStatus = groupBy(pos, 'status')
  const soByStatus = groupBy(sos, 'status')

  // Total sales & purchase value
  const totalSales = sos.reduce((s, o) => s + o.totalAmount, 0)
  const totalPurchase = pos.reduce((s, o) => s + o.totalAmount, 0)

  return NextResponse.json({
    kpi: {
      products,
      customers,
      suppliers,
      warehouses,
      totalUnits,
      totalValue,
      damagedUnits,
      reservedUnits,
      lowStockCount: lowStock.length,
      totalSales,
      totalPurchase,
      openPOs: pos.filter((p) => p.status === 'ordered' || p.status === 'draft').length,
      openSOs: sos.filter((s) => !['delivered', 'cancelled'].includes(s.status)).length,
    },
    charts: {
      byCategory,
      trend,
      poByStatus: Object.entries(poByStatus).map(([status, count]) => ({ status, count })),
      soByStatus: Object.entries(soByStatus).map(([status, count]) => ({ status, count })),
    },
    recent: {
      movements: movements.map((m) => ({
        id: m.id,
        type: m.type,
        quantity: m.quantity,
        reference: m.reference,
        notes: m.notes,
        createdAt: m.createdAt,
        productSku: m.product.sku,
        productName: m.product.name,
      })),
      audit,
    },
    lowStock,
  })
}

function groupBy<T extends Record<string, any>>(arr: T[], key: keyof T): Record<string, number> {
  return arr.reduce((acc, item) => {
    const k = String(item[key])
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}
