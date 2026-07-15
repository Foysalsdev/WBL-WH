import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/products?search=
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('search')?.trim()
  const where = q
    ? {
        OR: [
          { sku: { contains: q } },
          { name: { contains: q } },
          { category: { contains: q } },
        ],
      }
    : {}
  const products = await db.product.findMany({
    where,
    include: { stock: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(products)
}

// POST /api/products  — create product (+ optional stock)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { stockQuantity, ...data } = body
  const product = await db.product.create({ data })
  if (typeof stockQuantity === 'number') {
    await db.stock.create({ data: { productId: product.id, quantity: stockQuantity, reserved: 0, damaged: 0 } })
    await db.movement.create({
      data: { productId: product.id, type: 'IN', quantity: stockQuantity, reference: 'OPENING', notes: 'Initial stock on product create' },
    })
  }
  await db.auditLog.create({ data: { action: 'CREATE', entity: 'Product', entityId: product.id, userName: 'System', details: `Created ${product.sku}` } })
  return NextResponse.json(product, { status: 201 })
}
