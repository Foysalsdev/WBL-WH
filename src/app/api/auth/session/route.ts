import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/security'

// GET /api/auth/session — return current user + permissions (from token)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const role = await db.role.findUnique({
    where: { name: user.role },
    include: { permissions: true },
  })

  return NextResponse.json({
    user,
    permissions: role?.permissions.map(p => `${p.module}.${p.action}`) || [],
  })
}
