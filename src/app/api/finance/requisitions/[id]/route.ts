import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/security'
import { auditLog, apiError, softDelete } from '@/lib/api-middleware'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const update: any = {}
  if (body.status) update.status = body.status
  if (body.purpose) update.purpose = body.purpose
  if (body.amount !== undefined) update.amount = Number(body.amount)
  if (body.notes !== undefined) update.notes = body.notes
  if (body.approvedBy) { update.approvedBy = body.approvedBy; update.approvedAt = new Date() }
  if (body.receivedBy) { update.receivedBy = body.receivedBy; update.receivedAt = new Date() }

  try {
    const r = await db.requisition.update({ where: { id }, data: update })
    await auditLog('UPDATE', 'Requisition', id, user, `${r.reqNo} → ${body.status || 'updated'}`)
    return NextResponse.json(r)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const r = await db.requisition.delete({ where: { id } })
    await auditLog('DELETE', 'Requisition', id, user, `Deleted ${r.reqNo}`)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
