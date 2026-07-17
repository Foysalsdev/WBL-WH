import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, auditLog, apiError, softDelete, type AuthContext } from '@/lib/api-middleware'
import { getUserFromRequest } from '@/lib/security'
import { z } from 'zod'

const CustomerUpdateSchema = z.object({
  code: z.string().min(1).max(32).trim().optional(),
  name: z.string().min(1).max(255).trim().optional(),
  email: z.string().email().max(254).optional().nullable(),
  phone: z.string().max(32).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
})

// PATCH /api/customers/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = CustomerUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 422 })
  }

  try {
    const existing = await db.customer.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const updated = await db.customer.update({ where: { id }, data: parsed.data })
    await auditLog('UPDATE', 'Customer', id, user, `Updated ${updated.code} — ${updated.name}`)
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Customer code already exists' }, { status: 409 })
    return apiError(e)
  }
}

// DELETE /api/customers/[id] — soft delete
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const existing = await db.customer.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    // Safety: don't delete if there are sales orders
    const orderCount = await db.salesOrder.count({ where: { customerId: id } })
    if (orderCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete dealer with ${orderCount} sales order(s). Remove or reassign orders first.` },
        { status: 409 }
      )
    }

    await softDelete(db.customer, id)
    await auditLog('DELETE', 'Customer', id, user, `Soft-deleted ${existing.code} — ${existing.name}`)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
