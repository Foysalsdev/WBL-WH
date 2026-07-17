import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withValidation, withRateLimit, auditLog, apiError, notDeleted, type AuthContext } from '@/lib/api-middleware'
import { z } from 'zod'

const VehicleInputSchema = z.object({
  vehicleNo: z.string().min(1).max(32).trim(),
  transportVendorId: z.string().min(1),
  driverName: z.string().max(255).optional().nullable(),
  driverPhone: z.string().max(32).optional().nullable(),
})

export const GET = withRateLimit(
  withAuth(async (req: NextRequest, ctx: AuthContext) => {
    try {
      const q = req.nextUrl.searchParams.get('search')?.trim()?.toUpperCase()
      const where = q ? {
        vehicleNo: { contains: q },
        transportVendor: { deletedAt: null }
      } : {
        transportVendor: { deletedAt: null }
      }
      const vehicles = await db.vehicle.findMany({
        where,
        include: { transportVendor: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
      return NextResponse.json(vehicles)
    } catch (e) {
      return apiError(e)
    }
  }),
  { windowMs: 60_000, maxRequests: 60, keyPrefix: 'vehicles-list' }
)

export const POST = withAuth(
  withValidation(VehicleInputSchema, async (req: NextRequest, data, ctx: AuthContext) => {
    try {
      const existing = await db.vehicle.findUnique({ where: { vehicleNo: data.vehicleNo } })
      if (existing) {
        return NextResponse.json({ error: `Vehicle '${data.vehicleNo}' already exists` }, { status: 409 })
      }
      const vehicle = await db.vehicle.create({ data })
      await auditLog('CREATE', 'Vehicle', vehicle.id, ctx.user, `Created ${vehicle.vehicleNo}`)
      return NextResponse.json(vehicle, { status: 201 })
    } catch (e: any) {
      if (e?.code === 'P2002') return NextResponse.json({ error: 'Vehicle number already exists' }, { status: 409 })
      return apiError(e)
    }
  }),
  { required: true, module: 'masters', action: 'create' }
)
