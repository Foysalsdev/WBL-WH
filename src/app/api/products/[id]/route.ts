import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/products/[id] — update product (without touching stock)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const { stockQuantity, ...data } = body

  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const updated = await db.product.update({
    where: { id },
    data,
    include: { stock: true },
  })

  // Optionally adjust stock if stockQuantity provided
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

  await db.auditLog.create({
    data: {
      action: 'UPDATE',
      entity: 'Product',
      entityId: id,
      userName: 'System',
      details: `Updated ${updated.sku}`,
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/products/[id] — delete product (only if no stock or zero stock)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const existing = await db.product.findUnique({
    where: { id },
    include: { stock: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Safety: don't delete if there's non-zero stock (would orphan movements)
  if (existing.stock && (existing.stock.quantity > 0 || existing.stock.reserved > 0 || existing.stock.damaged > 0)) {
    return NextResponse.json(
      { error: `Cannot delete product with non-zero stock (${existing.stock.quantity} on hand). Set stock to zero first.` },
      { status: 409 },
    )
  }

  // Delete related stock + movements first (cascade)
  await db.movement.deleteMany({ where: { productId: id } })
  if (existing.stock) {
    await db.stock.delete({ where: { productId: id } })
  }
  await db.product.delete({ where: { id } })

  await db.auditLog.create({
    data: {
      action: 'DELETE',
      entity: 'Product',
      entityId: id,
      userName: 'System',
      details: `Deleted ${existing.sku}`,
    },
  })

  return NextResponse.json({ ok: true })
}
