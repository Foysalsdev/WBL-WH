import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/security'
import { apiError } from '@/lib/api-middleware'

// GET /api/timeline/[entityType]/[entityId]
// Returns complete timeline for any entity (SalesOrder, PurchaseOrder, Dispatch, Return)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  const { entityType, entityId } = await params

  try {
    const timeline = await db.orderTimeline.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(timeline)
  } catch (e) {
    return apiError(e)
  }
}
