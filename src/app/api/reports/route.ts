import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/reports?type=stock|movements|valuation
export async function GET(req: Request) {
  const url = new URL(req.url)
  const type = url.searchParams.get('type') || 'stock'

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

  if (type === 'movements') {
    const movs = await db.movement.findMany({ take: 200, orderBy: { createdAt: 'desc' }, include: { product: true } })
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

  if (type === 'valuation') {
    const rows = await db.stock.findMany({ include: { product: true } })
    const byCat = new Map<string, { units: number; value: number }>()
    for (const r of rows) {
      const c = r.product.category || 'Other'
      const cur = byCat.get(c) || { units: 0, value: 0 }
      cur.units += r.quantity
      cur.value += r.quantity * r.product.costPrice
      byCat.set(c, cur)
    }
    return NextResponse.json({ rows: Array.from(byCat, ([category, v]) => ({ category, ...v })) })
  }

  return NextResponse.json({ error: 'unknown type' }, { status: 400 })
}
