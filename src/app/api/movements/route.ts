import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/movements?limit=&productId=
export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get('limit') || 50)
  const productId = req.nextUrl.searchParams.get('productId')
  const where = productId ? { productId } : {}
  const movements = await db.movement.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { product: true },
  })
  return NextResponse.json(movements)
}
