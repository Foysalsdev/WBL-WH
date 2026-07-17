import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auditLog, apiError, softDelete } from '@/lib/api-middleware'
import { getUserFromRequest } from '@/lib/security'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const existing = await db.transportVendor.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Transport vendor not found' }, { status: 404 })

    await softDelete(db.transportVendor, id)
    await auditLog('DELETE', 'TransportVendor', id, user, `Soft-deleted ${existing.code} — ${existing.name}`)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
