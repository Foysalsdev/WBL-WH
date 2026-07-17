import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/security'
import { auditLog, apiError } from '@/lib/api-middleware'
import { z } from 'zod'

const CashInInputSchema = z.object({
  date: z.string().optional(),
  amount: z.number().min(0).max(1e9),
  source: z.enum(['3i Logistics', 'Head Office', 'Bank']).default('3i Logistics'),
  requisitionId: z.string().optional().nullable(),
  receivedBy: z.string().min(1).max(255),
  notes: z.string().max(500).optional().nullable(),
})

// GET /api/finance/cash-in?month=
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
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
      take: 500,
    })
    return NextResponse.json(cashIns)
  } catch (e) {
    return apiError(e)
  }
}

// POST /api/finance/cash-in
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = CashInInputSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 422 })

  try {
    const year = new Date().getFullYear()
    const count = await db.cashIn.count({ where: { cashInNo: { startsWith: `CIN-${year}-` } } })
    const cashInNo = `CIN-${year}-${String(count + 1).padStart(5, '0')}`

    const c = await db.cashIn.create({
      data: {
        cashInNo,
        date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
        amount: parsed.data.amount,
        source: parsed.data.source,
        requisitionId: parsed.data.requisitionId || null,
        receivedBy: parsed.data.receivedBy,
        notes: parsed.data.notes || null,
      },
    })

    // Auto-update linked requisition status to 'received'
    if (parsed.data.requisitionId) {
      await db.requisition.update({
        where: { id: parsed.data.requisitionId },
        data: { status: 'received', receivedBy: parsed.data.receivedBy, receivedAt: new Date() },
      })
    }

    await auditLog('CREATE', 'CashIn', c.id, user, `${cashInNo} for TK ${parsed.data.amount} from ${parsed.data.source}`)
    return NextResponse.json(c, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
