import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/security'
import { auditLog, apiError } from '@/lib/api-middleware'
import { z } from 'zod'

const ExpenseInputSchema = z.object({
  date: z.string().optional(),
  type: z.enum(['procurement', 'other']).default('procurement'),
  category: z.string().min(1).max(100),
  beneficiary: z.string().min(1).max(255),
  amount: z.number().min(0).max(1e9),
  paymentMode: z.enum(['cash', 'bank', 'bkash', 'nagad', 'cheque']).default('cash'),
  memoNo: z.string().max(64).optional().nullable(),
  memoDate: z.string().optional().nullable(),
  billNo: z.string().max(64).optional().nullable(),
  billDate: z.string().optional().nullable(),
  receiverName: z.string().max(255).optional().nullable(),
  paidBy: z.string().max(255).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

// GET /api/finance/expenses?type=&category=&month=
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
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
      take: 500,
    })
    return NextResponse.json(expenses)
  } catch (e) {
    return apiError(e)
  }
}

// POST /api/finance/expenses
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = ExpenseInputSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 422 })

  try {
    const year = new Date().getFullYear()
    const count = await db.expense.count({ where: { expenseNo: { startsWith: `EXP-${year}-` } } })
    const expenseNo = `EXP-${year}-${String(count + 1).padStart(5, '0')}`

    const e = await db.expense.create({
      data: {
        expenseNo,
        date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
        type: parsed.data.type,
        category: parsed.data.category,
        beneficiary: parsed.data.beneficiary,
        amount: parsed.data.amount,
        paymentMode: parsed.data.paymentMode,
        memoNo: parsed.data.memoNo || null,
        memoDate: parsed.data.memoDate ? new Date(parsed.data.memoDate) : null,
        billNo: parsed.data.billNo || null,
        billDate: parsed.data.billDate ? new Date(parsed.data.billDate) : null,
        receiverName: parsed.data.receiverName || null,
        paidBy: parsed.data.paidBy || null,
        notes: parsed.data.notes || null,
      },
    })

    await auditLog('CREATE', 'Expense', e.id, user, `${expenseNo} — ${parsed.data.category} — TK ${parsed.data.amount} to ${parsed.data.beneficiary}`)
    return NextResponse.json(e, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
