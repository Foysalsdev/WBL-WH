import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/security'
import { apiError, notDeleted } from '@/lib/api-middleware'

// GET /api/dashboard — KPIs for dashboard
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const [
      products,
      customers,
      suppliers,
      warehouses,
      stockAgg,
      damagedAgg,
      recentAudit,
    ] = await Promise.all([
      db.product.count({ where: { isActive: true, deletedAt: null } }),
      db.customer.count({ where: notDeleted }),
      db.supplier.count({ where: notDeleted }),
      db.warehouse.count({ where: notDeleted }),
      db.stock.aggregate({ _sum: { quantity: true } }),
      db.stock.aggregate({ _sum: { damaged: true } }),
      db.auditLog.findMany({ take: 10, orderBy: { createdAt: 'desc' } }),
    ])

    const totalUnits = stockAgg._sum.quantity || 0
    const damagedUnits = damagedAgg._sum.damaged || 0

    // Get all products with stock to calculate value + find low stock
    const productsWithStock = await db.product.findMany({
      where: { isActive: true, deletedAt: null, stock: { isNot: null } },
      select: {
        id: true,
        sku: true,
        name: true,
        costPrice: true,
        reorderLevel: true,
        stock: { select: { quantity: true } },
      },
      take: 500,
    })

    const totalValue = productsWithStock.reduce(
      (sum, p) => sum + (p.costPrice * (p.stock?.quantity || 0)), 0
    )

    // Filter low stock in JS (SQLite doesn't support field-to-field comparison)
    const lowStock = productsWithStock
      .filter(p => (p.stock?.quantity || 0) <= p.reorderLevel)
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        onHand: p.stock?.quantity || 0,
        reorderLevel: p.reorderLevel,
      }))

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
      lowStock,
    })
  } catch (e) {
    return apiError(e)
  }
}
