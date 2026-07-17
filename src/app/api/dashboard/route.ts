import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withRateLimit, apiError, notDeleted, type AuthContext } from '@/lib/api-middleware'

// GET /api/dashboard — KPIs for dashboard
export const GET = withRateLimit(
  withAuth(async (req: NextRequest, ctx: AuthContext) => {
    try {
      const [
        products,
        customers,
        suppliers,
        warehouses,
        stockAgg,
        damagedAgg,
        recentAudit,
        lowStockProducts,
      ] = await Promise.all([
        db.product.count({ where: { isActive: true, deletedAt: null } }),
        db.customer.count({ where: notDeleted }),
        db.supplier.count({ where: notDeleted }),
        db.warehouse.count({ where: notDeleted }),
        db.stock.aggregate({ _sum: { quantity: true } }),
        db.stock.aggregate({ _sum: { damaged: true } }),
        db.auditLog.findMany({ take: 10, orderBy: { createdAt: 'desc' } }),
        db.product.findMany({
          where: {
            isActive: true,
            deletedAt: null,
            stock: { quantity: { lte: db.product.fields.reorderLevel } },
          },
          include: { stock: true },
          take: 10,
        }),
      ])

      const totalUnits = stockAgg._sum.quantity || 0
      const damagedUnits = damagedAgg._sum.damaged || 0

      // Calculate total stock value (costPrice × quantity)
      const stockValueResult = await db.stock.aggregate({
        _sum: { quantity: true },
        where: { product: { isActive: true } },
      })

      // Get all products with stock to calculate value
      const stockWithValue = await db.product.findMany({
        where: { isActive: true, deletedAt: null, stock: { isNot: null } },
        select: { costPrice: true, stock: { select: { quantity: true } } },
        take: 1000,
      })
      const totalValue = stockWithValue.reduce((sum, p) => sum + (p.costPrice * (p.stock?.quantity || 0)), 0)

      const lowStock = stockWithValue.length > 0
        ? await db.product.findMany({
            where: {
              isActive: true,
              deletedAt: null,
              stock: { isNot: null },
            },
            include: { stock: true },
            take: 10,
          }).then(items => items.filter(p => (p.stock?.quantity || 0) <= p.reorderLevel).slice(0, 10))
        : []

      return NextResponse.json({
        kpis: {
          products,
          customers,
          suppliers,
          warehouses,
          totalUnits,
          totalValue,
          damagedUnits,
        },
        audit: recentAudit,
        lowStock: lowStock.map(p => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          onHand: p.stock?.quantity || 0,
          reorderLevel: p.reorderLevel,
        })),
      })
    } catch (e) {
      return apiError(e)
    }
  }),
  { windowMs: 60_000, maxRequests: 30, keyPrefix: 'dashboard' }
)
