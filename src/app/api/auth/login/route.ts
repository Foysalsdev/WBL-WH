import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/auth/login — email/password login
// Returns user + session token (simple JWT-like token for demo)
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (!user || !user.active) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // In production: verify passwordHash with bcrypt
  // For demo: accept any password for seeded users
  // Real implementation:
  // const valid = await bcrypt.compare(password, user.passwordHash)
  // if (!valid) return 401
  if (user.passwordHash && !password) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Get role permissions
  const role = await db.role.findUnique({
    where: { name: user.role },
    include: { permissions: true },
  })

  // Return user + permissions (no passwordHash)
  const { passwordHash, ...userWithoutHash } = user
  return NextResponse.json({
    user: userWithoutHash,
    permissions: role?.permissions.map(p => `${p.module}.${p.action}`) || [],
    token: `demo-token-${user.id}-${Date.now()}`,
  })
}
