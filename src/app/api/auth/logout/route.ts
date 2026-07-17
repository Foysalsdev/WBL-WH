import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/security'
import { auditLog } from '@/lib/api-middleware'
import { db } from '@/lib/db'

// POST /api/auth/logout — clears session cookie + logs audit
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (user) {
    await auditLog('LOGOUT', 'User', user.id, user, 'User logged out')
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set('whp-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  return res
}
