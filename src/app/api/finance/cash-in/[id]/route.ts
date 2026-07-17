import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const update: any = {}
  const fields = ['source', 'receivedBy', 'notes']
  for (const f of fields) {
    if (body[f] !== undefined) update[f] = body[f]
  }
  if (body.amount !== undefined) update.amount = Number(body.amount)
  if (body.date) update.date = new Date(body.date)

  const c = await db.cashIn.update({ where: { id }, data: update })
  await db.auditLog.create({
    data: { action: 'UPDATE', entity: 'CashIn', entityId: id, userName: 'System', details: `Updated ${c.cashInNo}` },
  })
  return NextResponse.json(c)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const c = await db.cashIn.delete({ where: { id } })
  await db.auditLog.create({
    data: { action: 'DELETE', entity: 'CashIn', entityId: id, userName: 'System', details: `Deleted ${c.cashInNo}` },
  })
  return NextResponse.json({ ok: true })
}
