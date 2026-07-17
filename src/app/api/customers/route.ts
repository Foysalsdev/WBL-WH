import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withValidation, withRateLimit, auditLog, apiError, softDelete, notDeleted, type AuthContext } from '@/lib/api-middleware'
import { z } from 'zod'

const CustomerInputSchema = z.object({
  code: z.string().min(1).max(32).trim(),
  name: z.string().min(1).max(255).trim(),
  email: z.string().email().max(254).optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
})

export const GET = withRateLimit(
  withAuth(async (req: NextRequest, ctx: AuthContext) => {
    try {
      const customers = await db.customer.findMany({
        where: notDeleted,
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
      return NextResponse.json(customers)
    } catch (e) {
      return apiError(e)
    }
  }),
  { windowMs: 60_000, maxRequests: 60, keyPrefix: 'customers-list' }
)

export const POST = withAuth(
  withValidation(CustomerInputSchema, async (req: NextRequest, data, ctx: AuthContext) => {
    try {
      const existing = await db.customer.findUnique({ where: { code: data.code } })
      if (existing && !existing.deletedAt) {
        return NextResponse.json({ error: `Customer with code '${data.code}' already exists` }, { status: 409 })
      }

      const customer = await db.customer.create({ data })
      await auditLog('CREATE', 'Customer', customer.id, ctx.user, `Created ${customer.code} — ${customer.name}`)
      return NextResponse.json(customer, { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return NextResponse.json({ error: 'Customer code already exists' }, { status: 409 })
      }
      return apiError(e)
    }
  }),
  { required: true, module: 'masters', action: 'create' }
)
