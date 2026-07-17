import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withRateLimit, apiError, notDeleted, type AuthContext } from '@/lib/api-middleware'

// GET /api/reports?type=valuation|stock|movements|sales|purchases&month=YYYY-MM
export const GET = withRateLimit(
  withAuth(async (req: NextRequest, ctx: AuthContext) => {
    try {
      const type = req.nextUrl.searchParams.get('type') || 'valuation'
      const month = req.nextUrl.searchParams.get('month')

      if (type === 'valuation') {
        const products = await db.product.findMany({
          where: { isActive: true, deletedAt: null },
          include: { stock: true },
          orderBy: { createdAt: 'desc' },
          take: 500,
        })
        const valuation = products.map(p => ({
          ...p,
          stockValue: (p.costPrice || 0) * (p.stock?.quantity || 0),
          saleValue: (p.salePrice || 0) * (p.stock?.quantity || 0),
        }))
        return NextResponse.json(valuation)
      }

      if (type === 'stock') {
        const products = await db.product.findMany({
          where: { isActive: true, deletedAt: null },
          include: { stock: true },
          orderBy: { name: 'asc' },
          take: 500,
        })
        return NextResponse.json(products)
      }

      if (type === 'movements') {
        const where: any = {}
        if (month) {
          const [y, m] = month.split('-').map(Number)
          const start = new Date(y, m - 1, 1)
          const end = new Date(y, m, 0, 23, 59, 59)
          where.createdAt = { gte: start, lte: end }
        }
        const movements = await db.movement.findMany({
          where,
          include: { product: true },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        })
        return NextResponse.json(movements)
      }

      if (type === 'sales') {
        const where: any = {}
        if (month) {
          const [y, m] = month.split('-').map(Number)
          const start = new Date(y, m - 1, 1)
          const end = new Date(y, m, 0, 23, 59, 59)
          where.orderDate = { gte: start, lte: end }
        }
        const sos = await db.salesOrder.findMany({
          where,
          include: { customer: true, items: { include: { product: true } }, dispatches: true },
          orderBy: { orderDate: 'desc' },
          take: 200,
        })
        return NextResponse.json(sos)
      }

      if (type === 'purchases') {
        const where: any = {}
        if (month) {
          const [y, m] = month.split('-').map(Number)
          const start = new Date(y, m - 1, 1)
          const end = new Date(y, m, 0, 23, 59, 59)
          where.orderDate = { gte: start, lte: end }
        }
        const pos = await db.purchaseOrder.findMany({
          where,
          include: { supplier: true, items: { include: { product: true } } },
          orderBy: { orderDate: 'desc' },
          take: 200,
        })
        return NextResponse.json(pos)
      }

      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    } catch (e) {
      return apiError(e)
    }
  }),
  { windowMs: 60_000, maxRequests: 20, keyPrefix: 'reports' }
)
