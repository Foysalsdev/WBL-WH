import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const suppliers = await db.supplier.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(suppliers)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supplier = await db.supplier.create({ data: body })
  await db.auditLog.create({ data: { action: 'CREATE', entity: 'Supplier', entityId: supplier.id, userName: 'System', details: `Created ${supplier.code} — ${supplier.name}` } })
  return NextResponse.json(supplier, { status: 201 })
}
