import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/vehicles?search= — search vehicles by number (for auto-fill)
// Returns vehicles with their transport vendor
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search')?.trim().toUpperCase() || ''
  if (!search) {
    const all = await db.vehicle.findMany({ include: { transportVendor: true }, take: 50, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(all)
  }
  const vehicles = await db.vehicle.findMany({
    where: { vehicleNo: { contains: search } },
    include: { transportVendor: true },
    take: 10,
  })
  return NextResponse.json(vehicles)
}

// POST /api/vehicles — create a new vehicle (or auto-create on first dispatch)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { vehicleNo, transportVendorId, driverName, driverPhone } = body
  if (!vehicleNo || !transportVendorId) {
    return NextResponse.json({ error: 'vehicleNo and transportVendorId required' }, { status: 400 })
  }
  const vehicle = await db.vehicle.create({
    data: { vehicleNo: vehicleNo.toUpperCase(), transportVendorId, driverName, driverPhone },
    include: { transportVendor: true },
  })
  return NextResponse.json(vehicle, { status: 201 })
}
