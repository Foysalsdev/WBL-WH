import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const update: any = {}
  const fields = ['type', 'category', 'beneficiary', 'paymentMode', 'memoNo', 'billNo', 'receiverName', 'paidBy', 'notes']
  for (const f of fields) {
    if (body[f] !== undefined) update[f] = body[f]
  }
  if (body.amount !== undefined) update.amount = Number(body.amount)
  if (body.date) update.date = new Date(body.date)
  if (body.memoDate) update.memoDate = new Date(body.memoDate)
  if (body.billDate) update.billDate = new Date(body.billDate)

  const e = await db.expense.update({ where: { id }, data: update })
  await db.auditLog.create({
    data: { action: 'UPDATE', entity: 'Expense', entityId: id, userName: 'System', details: `Updated ${e.expenseNo}` },
  })
  return NextResponse.json(e)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const e = await db.expense.delete({ where: { id } })
  await db.auditLog.create({
    data: { action: 'DELETE', entity: 'Expense', entityId: id, userName: 'System', details: `Deleted ${e.expenseNo}` },
  })
  return NextResponse.json({ ok: true })
}
