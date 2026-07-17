import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withValidation, withRateLimit, auditLog, apiError, notDeleted, type AuthContext } from '@/lib/api-middleware'
import { z } from 'zod'

const CourierVendorInputSchema = z.object({
  code: z.string().min(1).max(32).trim(),
  name: z.string().min(1).max(255).trim(),
  phone: z.string().max(32).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  active: z.boolean().default(true),
})

export const GET = withRateLimit(
  withAuth(async (req: NextRequest, ctx: AuthContext) => {
    try {
      const q = req.nextUrl.searchParams.get('search')?.trim()
      const where = { ...notDeleted, ...(q ? { OR: [
        { code: { contains: q } }, { name: { contains: q } }, { phone: { contains: q } }
      ] } : {}) }
      const vendors = await db.courierVendor.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
      return NextResponse.json(vendors)
    } catch (e) {
      return apiError(e)
    }
  }),
  { windowMs: 60_000, maxRequests: 60, keyPrefix: 'courier-vendors-list' }
)

export const POST = withAuth(
  withValidation(CourierVendorInputSchema, async (req: NextRequest, data, ctx: AuthContext) => {
    try {
      const existing = await db.courierVendor.findUnique({ where: { code: data.code } })
      if (existing && !existing.deletedAt) {
        return NextResponse.json({ error: `Vendor with code '${data.code}' already exists` }, { status: 409 })
      }
      const vendor = await db.courierVendor.create({ data })
      await auditLog('CREATE', 'CourierVendor', vendor.id, ctx.user, `Created ${vendor.code} — ${vendor.name}`)
      return NextResponse.json(vendor, { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return NextResponse.json({ error: 'Vendor code already exists' }, { status: 409 })
      return apiError(e)
    }
  }),
  { required: true, module: 'masters', action: 'create' }
)
