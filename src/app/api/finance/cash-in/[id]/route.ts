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
  if (body.source !== undefined) update.source = body.source
  if (body.receivedBy !== undefined) update.receivedBy = body.receivedBy
  if (body.notes !== undefined) update.notes = body.notes
  if (body.amount !== undefined) update.amount = Number(body.amount)
  if (body.date) update.date = new Date(body.date)

  try {
    const c = await db.cashIn.update({ where: { id }, data: update })
    await auditLog('UPDATE', 'CashIn', id, user, `Updated ${c.cashInNo}`)
    return NextResponse.json(c)
  } catch (e) {
    return apiError(e)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const c = await db.cashIn.delete({ where: { id } })
    await auditLog('DELETE', 'CashIn', id, user, `Deleted ${c.cashInNo}`)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
