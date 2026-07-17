import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withRateLimit, apiError, type AuthContext } from '@/lib/api-middleware'

// GET /api/movements?limit=&productId=&type=
export const GET = withRateLimit(
  withAuth(async (req: NextRequest, ctx: AuthContext) => {
    try {
      const sp = req.nextUrl.searchParams
      const limit = Math.min(parseInt(sp.get('limit') || '100', 10), 1000)
      const productId = sp.get('productId')
      const type = sp.get('type')

      const where: any = { product: { deletedAt: null } }
      if (productId) where.productId = productId
      if (type && type !== 'ALL') where.type = type

      const movements = await db.movement.findMany({
        where,
        include: { product: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
      return NextResponse.json(movements)
    } catch (e) {
      return apiError(e)
    }
  }),
  { windowMs: 60_000, maxRequests: 60, keyPrefix: 'movements-list' }
)
