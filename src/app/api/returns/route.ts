import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/security'
import { auditLog, apiError } from '@/lib/api-middleware'
import { z } from 'zod'

const ReturnItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(1e6),
  condition: z.enum(['good', 'damaged', 'defective']).default('good'),
  exchangeProductId: z.string().optional().nullable(),
  exchangeQuantity: z.number().int().min(0).max(1e6).default(0),
  refundPerUnit: z.number().min(0).max(1e9).default(0),
})

const ReturnInputSchema = z.object({
  date: z.string().optional(),
  soId: z.string().optional().nullable(),
  dispatchId: z.string().optional().nullable(),
  customerId: z.string().min(1),
  reason: z.enum(['damaged', 'wrong_item', 'warranty', 'unsatisfied', 'other']),
  reasonDetails: z.string().max(500).optional().nullable(),
  returnType: z.enum(['refund', 'exchange', 'replacement']),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(ReturnItemSchema).min(1, 'At least one item required'),
})

// GET /api/returns?status=&customerId=&month=
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const sp = req.nextUrl.searchParams
    const status = sp.get('status')
    const customerId = sp.get('customerId')
    const month = sp.get('month')

    const where: any = {}
    if (status && status !== 'ALL') where.status = status
    if (customerId) where.customerId = customerId
    if (month) {
      const [y, m] = month.split('-').map(Number)
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 0, 23, 59, 59)
      where.date = { gte: start, lte: end }
    }

    const returns = await db.return.findMany({
      where,
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { date: 'desc' },
      take: 500,
    })
    return NextResponse.json(returns)
  } catch (e) {
    return apiError(e)
  }
}

// POST /api/returns — create return/exchange/replacement request
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = ReturnInputSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 422 })

  try {
    const year = new Date().getFullYear()
    const count = await db.return.count({ where: { returnNo: { startsWith: `RTN-${year}-` } } })
    const returnNo = `RTN-${year}-${String(count + 1).padStart(5, '0')}`

    const totalRefund = parsed.data.items.reduce((s, it) => s + (it.refundPerUnit * it.quantity), 0)

    const r = await db.return.create({
      data: {
        returnNo,
        date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
        soId: parsed.data.soId || null,
        dispatchId: parsed.data.dispatchId || null,
        customerId: parsed.data.customerId,
        reason: parsed.data.reason,
        reasonDetails: parsed.data.reasonDetails || null,
        returnType: parsed.data.returnType,
        refundAmount: totalRefund,
        notes: parsed.data.notes || null,
        status: 'pending',
        items: {
          create: parsed.data.items.map(it => ({
            productId: it.productId,
            quantity: it.quantity,
            condition: it.condition,
            exchangeProductId: it.exchangeProductId || null,
            exchangeQuantity: it.exchangeQuantity,
            refundPerUnit: it.refundPerUnit,
          })),
        },
      },
      include: { items: true },
    })

    await auditLog('CREATE', 'Return', r.id, user, `Created ${returnNo} — ${parsed.data.returnType} — refund TK ${totalRefund}`)
    return NextResponse.json(r, { status: 201 })
  } catch (e) {
    return apiError(e)
  }
}
