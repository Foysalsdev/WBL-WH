import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/expenses?type=&category=&month=
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const type = sp.get('type')
  const category = sp.get('category')
  const month = sp.get('month')

  const where: any = {}
  if (type && type !== 'ALL') where.type = type
  if (category && category !== 'ALL') where.category = category
  if (month) {
    const [y, m] = month.split('-').map(Number)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0, 23, 59, 59)
    where.date = { gte: start, lte: end }
  }

  const expenses = await db.expense.findMany({
    where,
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(expenses)
}

// POST /api/finance/expenses
export async function POST(req: NextRequest) {
  const body = await req.json()

  const year = new Date().getFullYear()
  const count = await db.expense.count({ where: { expenseNo: { startsWith: `EXP-${year}-` } } })
  const expenseNo = `EXP-${year}-${String(count + 1).padStart(5, '0')}`

  const e = await db.expense.create({
    data: {
      expenseNo,
      date: body.date ? new Date(body.date) : new Date(),
      type: body.type || 'procurement',
      category: body.category,
      beneficiary: body.beneficiary,
      amount: Number(body.amount),
      paymentMode: body.paymentMode || 'cash',
      memoNo: body.memoNo || null,
      memoDate: body.memoDate ? new Date(body.memoDate) : null,
      billNo: body.billNo || null,
      billDate: body.billDate ? new Date(body.billDate) : null,
      receiverName: body.receiverName || null,
      paidBy: body.paidBy || null,
      notes: body.notes || null,
    },
  })

  await db.auditLog.create({
    data: {
      action: 'CREATE',
      entity: 'Expense',
      entityId: e.id,
      userName: body.paidBy || 'System',
      details: `${expenseNo} — ${body.category} — TK ${body.amount} to ${body.beneficiary}`,
    },
  })

  return NextResponse.json(e, { status: 201 })
}
