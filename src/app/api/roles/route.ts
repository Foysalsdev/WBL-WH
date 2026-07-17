import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/security'
import { auditLog, apiError } from '@/lib/api-middleware'
import { z } from 'zod'

// GET /api/roles — list all roles with permissions
export async function GET(req: NextRequest) {
  try {
    const roles = await db.role.findMany({
      include: { permissions: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(roles)
  } catch (e) {
    return apiError(e)
  }
}

// PATCH /api/roles — update role permissions (admin only)
const RoleUpdateSchema = z.object({
  id: z.string().min(1),
  permissions: z.array(z.string().regex(/^[a-z]+\.[a-z]+$/, 'Invalid permission format')).default([]),
})

export async function PATCH(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can modify roles' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = RoleUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 422 })

  try {
    const { id, permissions } = parsed.data

    const role = await db.role.findUnique({ where: { id } })
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

    // Delete all existing permissions and recreate
    await db.permission.deleteMany({ where: { roleId: id } })
    if (permissions.length > 0) {
      await db.permission.createMany({
        data: permissions.map((p) => {
          const [module, action] = p.split('.')
          return { roleId: id, module, action }
        }),
      })
    }

    const updated = await db.role.findUnique({
      where: { id },
      include: { permissions: true },
    })

    await auditLog('UPDATE', 'Role', id, user, `Updated permissions for ${role.name} (${permissions.length} permissions)`)
    return NextResponse.json(updated)
  } catch (e) {
    return apiError(e)
  }
}
