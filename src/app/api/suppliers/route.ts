import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withValidation, withRateLimit, auditLog, apiError, notDeleted, type AuthContext } from '@/lib/api-middleware'
import { z } from 'zod'

const SupplierInputSchema = z.object({
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
      const suppliers = await db.supplier.findMany({
        where: notDeleted,
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
      return NextResponse.json(suppliers)
    } catch (e) {
      return apiError(e)
    }
  }),
  { windowMs: 60_000, maxRequests: 60, keyPrefix: 'suppliers-list' }
)

export const POST = withAuth(
  withValidation(SupplierInputSchema, async (req: NextRequest, data, ctx: AuthContext) => {
    try {
      const existing = await db.supplier.findUnique({ where: { code: data.code } })
      if (existing && !existing.deletedAt) {
        return NextResponse.json({ error: `Supplier with code '${data.code}' already exists` }, { status: 409 })
      }
      const supplier = await db.supplier.create({ data })
      await auditLog('CREATE', 'Supplier', supplier.id, ctx.user, `Created ${supplier.code} — ${supplier.name}`)
      return NextResponse.json(supplier, { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return NextResponse.json({ error: 'Supplier code already exists' }, { status: 409 })
      return apiError(e)
    }
  }),
  { required: true, module: 'masters', action: 'create' }
)
