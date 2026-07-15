import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/inventory — list stock with product info + low-stock flag
export async function GET(req: NextRequest) {
  const rows = await db.stock.findMany({ include: { product: true }, orderBy: { product: { sku: 'asc' } } })
  const data = rows.map((r) => ({
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
  return NextResponse.json(data)
}

// POST /api/inventory — adjust stock (+/- damaged/reserved/quantity) and write a Movement
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { productId, type, quantity, reference, notes } = body
  // type: ADJUST (positive or negative), or set absolute damaged/reserved
  const stock = await db.stock.findUnique({ where: { productId } })
  if (!stock) return NextResponse.json({ error: 'Stock not found' }, { status: 404 })

  const delta = Number(quantity) || 0
  const newQty = Math.max(0, stock.quantity + delta)
  await db.stock.update({ where: { productId }, data: { quantity: newQty } })
  const mov = await db.movement.create({
    data: { productId, type: type || 'ADJUST', quantity: delta, reference: reference || `ADJ-${Date.now().toString().slice(-6)}`, notes },
  })
  await db.auditLog.create({ data: { action: 'ADJUST', entity: 'Stock', entityId: productId, userName: 'System', details: `Stock adjusted by ${delta > 0 ? '+' : ''}${delta} (now ${newQty})` } })
  return NextResponse.json({ stock: { ...stock, quantity: newQty }, movement: mov })
}
