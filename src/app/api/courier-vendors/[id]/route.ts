import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auditLog, apiError, softDelete } from '@/lib/api-middleware'
import { getUserFromRequest } from '@/lib/security'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const existing = await db.courierVendor.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Courier vendor not found' }, { status: 404 })

    await softDelete(db.courierVendor, id)
    await auditLog('DELETE', 'CourierVendor', id, user, `Soft-deleted ${existing.code} — ${existing.name}`)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
