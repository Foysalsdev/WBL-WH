import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/transport-vendors — list all with vehicles
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search')?.trim()
  const where: any = {}
  if (search) {
    where.OR = [
      { code: { contains: search } },
      { name: { contains: search } },
      { phone: { contains: search } },
    ]
  }
  const vendors = await db.transportVendor.findMany({
    where,
    include: { vehicles: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(vendors)
}

// POST /api/transport-vendors — create vendor (optionally with vehicles)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { vehicles, ...data } = body
  const vendor = await db.transportVendor.create({
    data: {
      ...data,
      vehicles: vehicles && vehicles.length > 0
        ? { create: vehicles.map((v: any) => ({ vehicleNo: v.vehicleNo, driverName: v.driverName || null, driverPhone: v.driverPhone || null })) }
        : undefined,
    },
    include: { vehicles: true },
  })
  await db.auditLog.create({ data: { action: 'CREATE', entity: 'TransportVendor', entityId: vendor.id, userName: 'System', details: `Created ${vendor.code} — ${vendor.name}` } })
  return NextResponse.json(vendor, { status: 201 })
}
