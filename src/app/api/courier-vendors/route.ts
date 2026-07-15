import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/courier-vendors
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search')?.trim()
  const where: any = {}
  if (search) {
    where.OR = [
      { code: { contains: search } },
      { name: { contains: search } },
    ]
  }
  const vendors = await db.courierVendor.findMany({ where, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(vendors)
}

// POST /api/courier-vendors
export async function POST(req: NextRequest) {
  const body = await req.json()
  const vendor = await db.courierVendor.create({ data: body })
  await db.auditLog.create({ data: { action: 'CREATE', entity: 'CourierVendor', entityId: vendor.id, userName: 'System', details: `Created ${vendor.code} — ${vendor.name}` } })
  return NextResponse.json(vendor, { status: 201 })
}
