import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withValidation, withRateLimit, auditLog, apiError, type AuthContext } from '@/lib/api-middleware'
import { getUserFromRequest } from '@/lib/security'
import { z } from 'zod'

// GET /api/inventory — list stock with product info + low-stock flag
export const GET = withRateLimit(
  withAuth(async (req: NextRequest, ctx: AuthContext) => {
    try {
      const search = req.nextUrl.searchParams.get('search')?.trim()
      const onlyLow = req.nextUrl.searchParams.get('low') === '1'

      const rows = await db.stock.findMany({
        where: { product: { isActive: true, deletedAt: null } },
        include: { product: true },
        orderBy: { product: { sku: 'asc' } },
        take: 1000,
      })

      let data = rows.map((r) => ({
        id: r.id,
        productId: r.productId,
        sku: r.product.sku,
        name: r.product.name,
        category: r.product.category,
        unit: r.product.unit,
        costPrice: r.product.costPrice,
        salePrice: r.product.salePrice,
        quantity: r.quantity,
        reserved: r.reserved,
        damaged: r.damaged,
        available: r.quantity - r.reserved,
        reorderLevel: r.product.reorderLevel,
        value: r.quantity * r.product.costPrice,
        isLow: r.quantity <= r.product.reorderLevel,
      }))

      if (search) {
        const q = search.toLowerCase()
        data = data.filter((d) =>
          d.sku.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          (d.category || '').toLowerCase().includes(q),
        )
      }

      if (onlyLow) data = data.filter((d) => d.isLow)

      return NextResponse.json(data)
    } catch (e) {
      return apiError(e)
    }
  }),
  { windowMs: 60_000, maxRequests: 60, keyPrefix: 'inventory-list' }
)

// POST /api/inventory — adjust stock quantity (signed delta) + write Movement
const AdjustSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(['IN', 'OUT', 'ADJUST', 'TRANSFER']).default('ADJUST'),
  quantity: z.number().int().refine((n) => n !== 0, 'quantity must be non-zero'),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional().nullable(),
})

export const POST = withAuth(
  withValidation(AdjustSchema, async (req: NextRequest, data, ctx: AuthContext) => {
    try {
      const { productId, type, quantity, reference, notes } = data

      const stock = await db.stock.findUnique({
        where: { productId },
        include: { product: true },
      })
      if (!stock) return NextResponse.json({ error: 'Stock record not found' }, { status: 404 })

      const newQty = Math.max(0, stock.quantity + quantity)
      await db.stock.update({
        where: { productId },
        data: { quantity: newQty },
      })

      const mov = await db.movement.create({
        data: {
          productId,
          type,
          quantity,
          reference: reference || `ADJ-${Date.now().toString().slice(-6)}`,
          notes: notes || null,
        },
      })

      await auditLog('ADJUST', 'Stock', productId, ctx.user, `Stock adjusted by ${quantity > 0 ? '+' : ''}${quantity} (now ${newQty}) — ${stock.product.sku}`)

      return NextResponse.json({
        ok: true,
        movement: mov,
        newQuantity: newQty,
      })
    } catch (e) {
      return apiError(e)
    }
  }),
  { required: true, module: 'inventory', action: 'adjust' }
)
