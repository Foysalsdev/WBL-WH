import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/finance/report?month=YYYY-MM
// Returns aggregated month-end report data for HO submission.
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month') || (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  const [y, m] = month.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0, 23, 59, 59)

  const [cashIns, expenses, requisitions] = await Promise.all([
    db.cashIn.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
      include: { requisition: { select: { reqNo: true } } },
    }),
    db.expense.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    }),
    db.requisition.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    }),
  ])

  const totalCashIn = cashIns.reduce((s, c) => s + c.amount, 0)
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0)

  // Group expenses by category
  const byCategory: Record<string, { count: number; total: number }> = {}
  for (const e of expenses) {
    if (!byCategory[e.category]) byCategory[e.category] = { count: 0, total: 0 }
    byCategory[e.category].count++
    byCategory[e.category].total += e.amount
  }

  // Group expenses by type
  const byType: Record<string, { count: number; total: number }> = {}
  for (const e of expenses) {
    if (!byType[e.type]) byType[e.type] = { count: 0, total: 0 }
    byType[e.type].count++
    byType[e.type].total += e.amount
  }

  // Calculate opening balance: all cash in before this month - all expenses before this month
  const prevCashIn = await db.cashIn.aggregate({
    where: { date: { lt: start } },
    _sum: { amount: true },
  })
  const prevExpense = await db.expense.aggregate({
    where: { date: { lt: start } },
    _sum: { amount: true },
  })
  const openingBalance = (prevCashIn._sum.amount || 0) - (prevExpense._sum.amount || 0)
  const closingBalance = openingBalance + totalCashIn - totalExpense

  return NextResponse.json({
    month,
    period: { start: start.toISOString(), end: end.toISOString() },
    openingBalance,
    cashIn: { total: totalCashIn, count: cashIns.length, items: cashIns },
    expenses: { total: totalExpense, count: expenses.length, items: expenses, byCategory, byType },
    closingBalance,
    requisitions: {
      total: requisitions.length,
      pending: requisitions.filter(r => r.status === 'pending').length,
      approved: requisitions.filter(r => r.status === 'approved').length,
      received: requisitions.filter(r => r.status === 'received').length,
      totalAmount: requisitions.reduce((s, r) => s + r.amount, 0),
      items: requisitions,
    },
  })
}
