import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/roles — list all roles with permissions
export async function GET() {
  const roles = await db.role.findMany({
    include: { permissions: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(roles)
}

// PATCH /api/roles/[id] — update role permissions (admin only)
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, permissions } = body

  const role = await db.role.findUnique({ where: { id } })
  if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

  // Delete all existing permissions and recreate
  await db.permission.deleteMany({ where: { roleId: id } })
  if (permissions && permissions.length > 0) {
    await db.permission.createMany({
      data: permissions.map((p: string) => {
        const [module, action] = p.split('.')
        return { roleId: id, module, action }
      }),
    })
  }

  const updated = await db.role.findUnique({
    where: { id },
    include: { permissions: true },
  })
  return NextResponse.json(updated)
}
