import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const logs = await db.auditLog.findMany({ take: 100, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(logs)
}
