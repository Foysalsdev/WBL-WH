import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withValidation, withRateLimit, auditLog, apiError, notDeleted, type AuthContext } from '@/lib/api-middleware'
import { z } from 'zod'

const WarehouseInputSchema = z.object({
  code: z.string().min(1).max(32).trim(),
  name: z.string().min(1).max(255).trim(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  capacity: z.number().int().min(0).max(1e8).default(0),
})

export const GET = withRateLimit(
  withAuth(async (req: NextRequest, ctx: AuthContext) => {
    try {
      const warehouses = await db.warehouse.findMany({
        where: notDeleted,
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
      return NextResponse.json(warehouses)
    } catch (e) {
      return apiError(e)
    }
  }),
  { windowMs: 60_000, maxRequests: 60, keyPrefix: 'warehouses-list' }
)

export const POST = withAuth(
  withValidation(WarehouseInputSchema, async (req: NextRequest, data, ctx: AuthContext) => {
    try {
      const existing = await db.warehouse.findUnique({ where: { code: data.code } })
      if (existing && !existing.deletedAt) {
        return NextResponse.json({ error: `Warehouse with code '${data.code}' already exists` }, { status: 409 })
      }
      const warehouse = await db.warehouse.create({ data })
      await auditLog('CREATE', 'Warehouse', warehouse.id, ctx.user, `Created ${warehouse.code} — ${warehouse.name}`)
      return NextResponse.json(warehouse, { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return NextResponse.json({ error: 'Warehouse code already exists' }, { status: 409 })
      return apiError(e)
    }
  }),
  { required: true, module: 'masters', action: 'create' }
)
