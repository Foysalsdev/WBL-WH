import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/security'
import { auditLog, apiError } from '@/lib/api-middleware'

// PATCH /api/returns/[id] — process the return (update stock + status)
// When status is set to 'processed':
//   - For 'refund' or 'replacement': returned items go back to stock
//     (good → quantity, damaged → damaged)
//   - For 'exchange': returned items go back to stock + exchange items deducted
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  try {
    const existing = await db.return.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!existing) return NextResponse.json({ error: 'Return not found' }, { status: 404 })

    // If processing (status = processed), update stock
    if (body.status === 'processed' && existing.status !== 'processed') {
      for (const item of existing.items) {
        // Add returned item back to stock
        const stock = await db.stock.findUnique({ where: { productId: item.productId } })
        if (stock) {
          const updateData: any = {}
          if (item.condition === 'good') {
            updateData.quantity = stock.quantity + item.quantity
          } else {
            updateData.damaged = stock.damaged + item.quantity
          }
          await db.stock.update({
            where: { productId: item.productId },
            data: updateData,
          })
          // Movement: returned item IN
          await db.movement.create({
            data: {
              productId: item.productId,
              type: 'IN',
              quantity: item.quantity,
              reference: existing.returnNo,
              notes: `Return ${existing.returnNo} — ${item.condition} condition`,
            },
          })
        }

        // For exchange: deduct exchange product from stock
        if (item.exchangeProductId && item.exchangeQuantity > 0) {
          const exStock = await db.stock.findUnique({ where: { productId: item.exchangeProductId } })
          if (exStock) {
            if (exStock.quantity < item.exchangeQuantity) {
              return NextResponse.json({
                error: `Insufficient stock for exchange product — only ${exStock.quantity} available, need ${item.exchangeQuantity}`,
              }, { status: 422 })
            }
            await db.stock.update({
              where: { productId: item.exchangeProductId },
              data: { quantity: exStock.quantity - item.exchangeQuantity },
            })
            await db.movement.create({
              data: {
                productId: item.exchangeProductId,
                type: 'OUT',
                quantity: -item.exchangeQuantity,
                reference: existing.returnNo,
                notes: `Exchange issued against return ${existing.returnNo}`,
              },
            })
          }
        }
      }
    }

    const update: any = {}
    if (body.status) update.status = body.status
    if (body.notes !== undefined) update.notes = body.notes
    if (body.status === 'processed') {
      update.processedBy = body.processedBy || user.name
      update.processedAt = new Date()
    }

    const updated = await db.return.update({ where: { id }, data: update })
    await auditLog('UPDATE', 'Return', id, user, `${existing.returnNo} → ${body.status || 'updated'}`)
    return NextResponse.json(updated)
  } catch (e) {
    return apiError(e)
  }
}

// DELETE /api/returns/[id] — only if pending
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

  try {
    const existing = await db.return.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Return not found' }, { status: 404 })
    if (existing.status === 'processed') {
      return NextResponse.json({ error: 'Cannot delete processed return — reverse it instead' }, { status: 422 })
    }

    await db.return.delete({ where: { id } })
    await auditLog('DELETE', 'Return', id, user, `Deleted ${existing.returnNo}`)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return apiError(e)
  }
}
