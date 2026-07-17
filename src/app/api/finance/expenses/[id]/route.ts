import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/security'
import { auditLog, apiError } from '@/lib/api-middleware'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const update: any = {}
  const fields = ['type', 'category', 'beneficiary', 'paymentMode', 'memoNo', 'billNo', 'receiverName', 'paidBy', 'notes']
  for (const f of fields) {
    if (body[f] !== undefined) update[f] = body[f]
  }
  if (body.amount !== undefined) update.amount = Number(body.amount)
  if (body.date) update.date = new Date(body.date)
  if (body.memoDate) update.memoDate = new Date(body.memoDate)
  if (body.billDate) update.billDate = new Date(body.billDate)

  try {
    const e = await db.expense.update({ where: { id }, data: update })
    await auditLog('UPDATE', 'Expense', id, user, `Updated ${e.expenseNo}`)
    return NextResponse.json(e)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const e = await db.expense.delete({ where: { id } })
    await auditLog('DELETE', 'Expense', id, user, `Deleted ${e.expenseNo}`)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
