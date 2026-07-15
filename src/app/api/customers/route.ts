import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const customers = await db.customer.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(customers)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const customer = await db.customer.create({ data: body })
  await db.auditLog.create({ data: { action: 'CREATE', entity: 'Customer', entityId: customer.id, userName: 'System', details: `Created ${customer.code} — ${customer.name}` } })
  return NextResponse.json(customer, { status: 201 })
}
