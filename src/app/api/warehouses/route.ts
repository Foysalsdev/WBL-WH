import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const warehouses = await db.warehouse.findMany({ include: { locations: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(warehouses)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const warehouse = await db.warehouse.create({ data: body })
  await db.auditLog.create({ data: { action: 'CREATE', entity: 'Warehouse', entityId: warehouse.id, userName: 'System', details: `Created ${warehouse.code} — ${warehouse.name}` } })
  return NextResponse.json(warehouse, { status: 201 })
}
