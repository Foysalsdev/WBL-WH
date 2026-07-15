import { NextResponse } from 'next/server'

// POST /api/auth/logout
export async function POST() {
  return NextResponse.json({ ok: true })
}
