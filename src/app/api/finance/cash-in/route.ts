import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/cash-in?month=
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const month = sp.get('month')

  const where: any = {}
  if (month) {
    const [y, m] = month.split('-').map(Number)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0, 23, 59, 59)
    where.date = { gte: start, lte: end }
  }

  const cashIns = await db.cashIn.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { requisition: { select: { reqNo: true, amount: true } } },
  })
  return NextResponse.json(cashIns)
}

// POST /api/finance/cash-in
export async function POST(req: NextRequest) {
  const body = await req.json()

  const year = new Date().getFullYear()
  const count = await db.cashIn.count({ where: { cashInNo: { startsWith: `CIN-${year}-` } } })
  const cashInNo = `CIN-${year}-${String(count + 1).padStart(5, '0')}`

  const c = await db.cashIn.create({
    data: {
      cashInNo,
      date: body.date ? new Date(body.date) : new Date(),
      amount: Number(body.amount),
      source: body.source || '3i Logistics',
      requisitionId: body.requisitionId || null,
      receivedBy: body.receivedBy || 'System',
      notes: body.notes || null,
    },
  })

  // Auto-update linked requisition status to 'received'
  if (body.requisitionId) {
    await db.requisition.update({
      where: { id: body.requisitionId },
      data: { status: 'received', receivedBy: body.receivedBy || 'System', receivedAt: new Date() },
    })
  }

  await db.auditLog.create({
    data: {
      action: 'CREATE',
      entity: 'CashIn',
      entityId: c.id,
      userName: body.receivedBy || 'System',
      details: `${cashInNo} for TK ${body.amount} from ${body.source || '3i Logistics'}`,
    },
  })

  return NextResponse.json(c, { status: 201 })
}
