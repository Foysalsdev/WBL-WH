import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/requisitions?status=&month=
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const status = sp.get('status')
  const month = sp.get('month') // YYYY-MM

  const where: any = {}
  if (status && status !== 'ALL') where.status = status
  if (month) {
    const [y, m] = month.split('-').map(Number)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0, 23, 59, 59)
    where.date = { gte: start, lte: end }
  }

  const reqs = await db.requisition.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { cashIns: { select: { id: true, cashInNo: true, amount: true, date: true } } },
  })
  return NextResponse.json(reqs)
}

// POST /api/finance/requisitions
export async function POST(req: NextRequest) {
  const body = await req.json()

  // Generate REQ-YYYY-NNNNN
  const year = new Date().getFullYear()
  const count = await db.requisition.count({ where: { reqNo: { startsWith: `REQ-${year}-` } } })
  const reqNo = `REQ-${year}-${String(count + 1).padStart(5, '0')}`

  const r = await db.requisition.create({
    data: {
      reqNo,
      date: body.date ? new Date(body.date) : new Date(),
      amount: Number(body.amount),
      purpose: body.purpose,
      notes: body.notes || null,
      status: 'pending',
    },
  })

  await db.auditLog.create({
    data: {
      action: 'CREATE',
      entity: 'Requisition',
      entityId: r.id,
      userName: body.userName || 'System',
      details: `${reqNo} for TK ${body.amount} — ${body.purpose}`,
    },
  })

  return NextResponse.json(r, { status: 201 })
}
