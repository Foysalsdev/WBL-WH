import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auditLog, apiError, softDelete } from '@/lib/api-middleware'
import { getUserFromRequest } from '@/lib/security'
import { z } from 'zod'

const ProductUpdateSchema = z.object({
  sku: z.string().min(1).max(64).trim().optional(),
  name: z.string().min(1).max(255).trim().optional(),
  category: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  unit: z.string().max(20).optional(),
  barcode: z.string().max(64).optional().nullable(),
  costPrice: z.number().min(0).max(1e9).optional(),
  salePrice: z.number().min(0).max(1e9).optional(),
  reorderLevel: z.number().int().min(0).max(1e6).optional(),
  isActive: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).max(1e6).optional(),
})

// PATCH /api/products/[id] — update product (+ optional stock adjustment)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = ProductUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 422 })

  try {
    const existing = await db.product.findFirst({ where: { id, deletedAt: null } })
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const { stockQuantity, ...updateData } = parsed.data
    const updated = await db.product.update({
      where: { id },
      data: updateData,
      include: { stock: true },
    })

    // Optionally adjust stock
    if (typeof stockQuantity === 'number') {
      const current = updated.stock
      if (current) {
        const delta = stockQuantity - current.quantity
        if (delta !== 0) {
          await db.stock.update({
            where: { productId: id },
            data: { quantity: stockQuantity },
          })
          await db.movement.create({
            data: {
              productId: id,
              type: 'ADJUST',
              quantity: delta,
              reference: `EDIT-${Date.now().toString().slice(-6)}`,
              notes: `Stock adjusted during product edit (was ${current.quantity}, now ${stockQuantity})`,
            },
          })
        }
      } else {
        await db.stock.create({
          data: { productId: id, quantity: stockQuantity, reserved: 0, damaged: 0 },
        })
        await db.movement.create({
          data: {
            productId: id,
            type: 'IN',
            quantity: stockQuantity,
            reference: 'OPENING',
            notes: 'Stock created during product edit',
          },
        })
      }
    }

    await auditLog('UPDATE', 'Product', id, user, `Updated ${updated.sku}`)
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })
    return apiError(e)
  }
}

// DELETE /api/products/[id] — soft delete (only if no stock)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const existing = await db.product.findFirst({
      where: { id, deletedAt: null },
      include: { stock: true },
    })
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    if (existing.stock && (existing.stock.quantity > 0 || existing.stock.reserved > 0 || existing.stock.damaged > 0)) {
      return NextResponse.json(
        { error: `Cannot delete product with non-zero stock (${existing.stock.quantity} on hand). Set stock to zero first.` },
        { status: 409 }
      )
    }

    await softDelete(db.product, id)
    await auditLog('DELETE', 'Product', id, user, `Soft-deleted ${existing.sku}`)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
