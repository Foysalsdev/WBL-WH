import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/auth/session?userId= — return current user + permissions
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || !user.active) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const role = await db.role.findUnique({
    where: { name: user.role },
    include: { permissions: true },
  })

  const { passwordHash, ...userWithoutHash } = user
  return NextResponse.json({
    user: userWithoutHash,
    permissions: role?.permissions.map(p => `${p.module}.${p.action}`) || [],
  })
}
