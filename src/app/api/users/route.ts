import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/users — list all users
export async function GET() {
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(users)
}

// POST /api/users — create new user (admin only)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, name, role, password } = body

  if (!email || !name || !role) {
    return NextResponse.json({ error: 'email, name, role required' }, { status: 400 })
  }

  // Check if email already exists
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  // In production: hash password with bcrypt
  // const passwordHash = await bcrypt.hash(password, 10)
  const passwordHash = password ? `$2a$10$dummy_${password}_${Date.now()}` : null

  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      role,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  await db.auditLog.create({
    data: { action: 'CREATE', entity: 'User', entityId: user.id, userName: 'System', details: `Created user ${user.email}` },
  })

  return NextResponse.json(user, { status: 201 })
}
