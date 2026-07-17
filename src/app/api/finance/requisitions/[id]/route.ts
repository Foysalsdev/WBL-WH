import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/finance/requisitions/[id] — update status or fields
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const update: any = {}
  if (body.status) update.status = body.status
  if (body.purpose) update.purpose = body.purpose
  if (body.amount !== undefined) update.amount = Number(body.amount)
  if (body.notes !== undefined) update.notes = body.notes
  if (body.approvedBy) { update.approvedBy = body.approvedBy; update.approvedAt = new Date() }
  if (body.receivedBy) { update.receivedBy = body.receivedBy; update.receivedAt = new Date() }

  const r = await db.requisition.update({ where: { id }, data: update })

  await db.auditLog.create({
    data: {
      action: 'UPDATE',
      entity: 'Requisition',
      entityId: id,
      userName: body.userName || 'System',
      details: `${r.reqNo} → ${body.status || 'updated'}`,
    },
  })

  return NextResponse.json(r)
}

// DELETE /api/finance/requisitions/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await db.requisition.delete({ where: { id } })
  await db.auditLog.create({
    data: { action: 'DELETE', entity: 'Requisition', entityId: id, userName: 'System', details: `Deleted ${r.reqNo}` },
  })
  return NextResponse.json({ ok: true })
}
