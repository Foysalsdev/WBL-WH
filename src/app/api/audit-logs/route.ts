import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withRateLimit, apiError, type AuthContext } from '@/lib/api-middleware'

// GET /api/audit-logs?action=&entity=&search=&limit=&days=
export const GET = withRateLimit(
  withAuth(async (req: NextRequest, ctx: AuthContext) => {
    try {
      const sp = req.nextUrl.searchParams
      const action = sp.get('action')?.trim()
      const entity = sp.get('entity')?.trim()
      const search = sp.get('search')?.trim()
      const userName = sp.get('userName')?.trim()
      const limit = Math.min(parseInt(sp.get('limit') || '500', 10) || 500, 2000)
      const days = parseInt(sp.get('days') || '0', 10)

      const where: any = {}
      if (action && action !== 'ALL') where.action = action
      if (entity && entity !== 'ALL') where.entity = entity
      if (userName) where.userName = { contains: userName }

      if (search) {
        where.OR = [
          { details: { contains: search } },
          { entity: { contains: search } },
          { userName: { contains: search } },
          { entityId: { contains: search } },
        ]
      }

      if (days > 0) {
        const since = new Date()
        since.setDate(since.getDate() - days)
        where.createdAt = { gte: since }
      }

      const [logs, total] = await Promise.all([
        db.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        db.auditLog.count({ where }),
      ])

      return NextResponse.json({ logs, total })
    } catch (e) {
      return apiError(e)
    }
  }),
  { windowMs: 60_000, maxRequests: 30, keyPrefix: 'audit-logs' }
)
