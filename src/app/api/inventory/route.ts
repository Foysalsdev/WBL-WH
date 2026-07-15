import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/inventory — list stock with product info + low-stock flag
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search')?.trim()
  const onlyLow = req.nextUrl.searchParams.get('low') === '1'

  const rows = await db.stock.findMany({
    include: { product: true },
    orderBy: { product: { sku: 'asc' } },
  })

  // Filter in JS — keeps the shape predictable for downstream consumers
  let data = rows
    .filter((r) => r.product && r.product.isActive)
    .map((r) => ({
      id: r.id,
      productId: r.productId,
      sku: r.product.sku,
      name: r.product.name,
      category: r.product.category,
      unit: r.product.unit,
      costPrice: r.product.costPrice,
      salePrice: r.product.salePrice,
      quantity: r.quantity,
      reserved: r.reserved,
      damaged: r.damaged,
      available: r.quantity - r.reserved,
      reorderLevel: r.product.reorderLevel,
      value: r.quantity * r.product.costPrice,
      isLow: r.quantity <= r.product.reorderLevel,
    }))

  // Apply search filter (server-side so client-side sort is fast)
  if (search) {
    const q = search.toLowerCase()
    data = data.filter((d) =>
      d.sku.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      (d.category || '').toLowerCase().includes(q),
    )
  }

  // Apply low-stock filter
  if (onlyLow) {
    data = data.filter((d) => d.isLow)
  }

  return NextResponse.json(data)
}

// POST /api/inventory — adjust stock quantity (signed delta) and write an immutable Movement
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { productId, type, quantity, reference, notes } = body

  if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  const delta = Number(quantity)
  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: 'quantity must be a non-zero number' }, { status: 400 })
  }

  const stock = await db.stock.findUnique({ where: { productId } })
  if (!stock) return NextResponse.json({ error: 'Stock record not found' }, { status: 404 })

  const newQty = Math.max(0, stock.quantity + delta)
  await db.stock.update({
    where: { productId },
    data: { quantity: newQty },
  })

  const movType = (type || 'ADJUST').toUpperCase()
  const mov = await db.movement.create({
    data: {
      productId,
      type: movType,
      quantity: delta,
      reference: reference || `ADJ-${Date.now().toString().slice(-6)}`,
      notes: notes || null,
    },
  })

  await db.auditLog.create({
    data: {
      action: 'ADJUST',
      entity: 'Stock',
      entityId: productId,
      userName: 'System',
      details: `Stock adjusted by ${delta > 0 ? '+' : ''}${delta} (now ${newQty})`,
    },
  })

  return NextResponse.json({
    ok: true,
    movement: mov,
    newQuantity: newQty,
  })
}
