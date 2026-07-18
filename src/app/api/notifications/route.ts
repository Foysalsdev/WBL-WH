import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/security'
import { apiError, notDeleted } from '@/lib/api-middleware'

// GET /api/notifications — actionable alerts for current user
// Returns:
//   - low stock alerts (qty <= reorderLevel)
//   - pending POD dispatches (need to confirm delivery)
//   - pending requisitions (need approval)
//   - pending returns (need processing)
//   - account alerts (locked, password expired)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const notifications: any[] = []

    // 1. Low stock alerts
    const lowStockProducts = await db.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        stock: { isNot: null },
      },
      include: { stock: true },
      take: 50,
    })

    for (const p of lowStockProducts) {
      const qty = p.stock?.quantity || 0
      if (qty <= p.reorderLevel) {
        notifications.push({
          id: `low-stock-${p.id}`,
          type: 'warning',
          category: 'low_stock',
          title: `Low stock: ${p.name}`,
          message: `${p.sku} — only ${qty} units left (reorder at ${p.reorderLevel})`,
          link: 'inventory',
          priority: qty === 0 ? 'critical' : 'high',
          createdAt: new Date().toISOString(),
        })
      }
    }

    // 2. Pending POD (dispatches awaiting delivery confirmation)
    const pendingPods = await db.dispatch.findMany({
      where: { podStatus: 'pending' },
      include: { so: { select: { soNumber: true, customer: { select: { name: true } } } } },
      take: 20,
    })

    for (const d of pendingPods) {
      const ageDays = Math.floor((Date.now() - d.dispatchedAt.getTime()) / (24 * 60 * 60 * 1000))
      notifications.push({
        id: `pod-pending-${d.id}`,
        type: ageDays > 3 ? 'critical' : 'info',
        category: 'pod_pending',
        title: `POD pending: ${d.dispatchNo}`,
        message: `Dispatched ${ageDays} day(s) ago to ${d.so?.customer?.name || '—'} — awaiting delivery confirmation`,
        link: 'outbound',
        priority: ageDays > 3 ? 'critical' : 'medium',
        createdAt: d.dispatchedAt.toISOString(),
      })
    }

    // 3. Pending requisitions (for admin/manager)
    if (user.role === 'admin' || user.role === 'manager') {
      const pendingReqs = await db.requisition.findMany({
        where: { status: 'pending' },
        take: 20,
      })

      for (const r of pendingReqs) {
        notifications.push({
          id: `req-pending-${r.id}`,
          type: 'info',
          category: 'requisition_pending',
          title: `Requisition pending: ${r.reqNo}`,
          message: `TK ${r.amount} requested — ${r.purpose.slice(0, 50)}`,
          link: 'finance',
          priority: 'medium',
          createdAt: r.createdAt.toISOString(),
        })
      }

      // 4. Pending returns
      const pendingReturns = await db.return.findMany({
        where: { status: 'pending' },
        include: { customer: { select: { name: true } } },
        take: 20,
      })

      for (const r of pendingReturns) {
        notifications.push({
          id: `return-pending-${r.id}`,
          type: 'warning',
          category: 'return_pending',
          title: `Return pending: ${r.returnNo}`,
          message: `${r.returnType} from ${r.customer?.name || '—'} — ${r.reason}`,
          link: 'returns',
          priority: 'medium',
          createdAt: r.createdAt.toISOString(),
        })
      }
    }

    // 5. Account alerts
    if (user.role === 'admin') {
      // Check for locked users
      const lockedUsers = await db.user.count({
        where: {
          lockedUntil: { gt: new Date() },
          deletedAt: null,
        },
      })
      if (lockedUsers > 0) {
        notifications.push({
          id: 'locked-users',
          type: 'critical',
          category: 'security',
          title: `${lockedUsers} locked user account(s)`,
          message: 'Accounts locked due to failed login attempts',
          link: 'users',
          priority: 'high',
          createdAt: new Date().toISOString(),
        })
      }
    }

    // Sort by priority then date
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    notifications.sort((a, b) => {
      const pDiff = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
      if (pDiff !== 0) return pDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json({
      notifications,
      count: notifications.length,
      criticalCount: notifications.filter(n => n.priority === 'critical').length,
    })
  } catch (e) {
    return apiError(e)
  }
}
