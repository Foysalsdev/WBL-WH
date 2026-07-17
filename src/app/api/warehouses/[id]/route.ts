import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auditLog, apiError, softDelete } from '@/lib/api-middleware'
import { getUserFromRequest } from '@/lib/security'
import { z } from 'zod'

const WarehouseUpdateSchema = z.object({
  code: z.string().min(1).max(32).trim().optional(),
  name: z.string().min(1).max(255).trim().optional(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  capacity: z.number().int().min(0).max(1e8).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = WarehouseUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 422 })

  try {
    const existing = await db.warehouse.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })

    const updated = await db.warehouse.update({ where: { id }, data: parsed.data })
    await auditLog('UPDATE', 'Warehouse', id, user, `Updated ${updated.code} — ${updated.name}`)
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Warehouse code already exists' }, { status: 409 })
    return apiError(e)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const existing = await db.warehouse.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })

    await softDelete(db.warehouse, id)
    await auditLog('DELETE', 'Warehouse', id, user, `Soft-deleted ${existing.code} — ${existing.name}`)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
