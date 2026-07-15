import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/movements?limit=&productId=&type=
export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get('limit') || 200)
  const productId = req.nextUrl.searchParams.get('productId')
  const type = req.nextUrl.searchParams.get('type')

  const where: any = {}
  if (productId) where.productId = productId
  if (type) where.type = type.toUpperCase()

  const movements = await db.movement.findMany({
    where,
    take: Math.min(limit, 500),
    orderBy: { createdAt: 'desc' },
    include: { product: true },
  })

  const data = movements.map((m) => ({
    id: m.id,
    productId: m.productId,
    type: m.type,
    quantity: m.quantity,
    reference: m.reference,
    notes: m.notes,
    createdAt: m.createdAt,
    product: { sku: m.product.sku, name: m.product.name, category: m.product.category },
  }))

  return NextResponse.json(data)
}
