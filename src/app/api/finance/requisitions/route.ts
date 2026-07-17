import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/security'
import { auditLog, apiError } from '@/lib/api-middleware'
import { z } from 'zod'

const RequisitionInputSchema = z.object({
  date: z.string().optional(),
  amount: z.number().min(0).max(1e9),
  purpose: z.string().min(1).max(500).trim(),
  notes: z.string().max(500).optional().nullable(),
  userName: z.string().optional(),
})

// GET /api/finance/requisitions?status=&month=
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const sp = req.nextUrl.searchParams
    const status = sp.get('status')
    const month = sp.get('month')

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
      take: 500,
    })
    return NextResponse.json(reqs)
  } catch (e) {
    return apiError(e)
  }
}

// POST /api/finance/requisitions
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = RequisitionInputSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 422 })

  try {
    const year = new Date().getFullYear()
    const count = await db.requisition.count({ where: { reqNo: { startsWith: `REQ-${year}-` } } })
    const reqNo = `REQ-${year}-${String(count + 1).padStart(5, '0')}`

    const r = await db.requisition.create({
      data: {
        reqNo,
        date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
        amount: parsed.data.amount,
        purpose: parsed.data.purpose,
        notes: parsed.data.notes || null,
        status: 'pending',
      },
    })

    await auditLog('CREATE', 'Requisition', r.id, user, `${reqNo} for TK ${parsed.data.amount} — ${parsed.data.purpose}`)
    return NextResponse.json(r, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}

