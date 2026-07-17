import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withValidation, withRateLimit, auditLog, apiError, type AuthContext } from '@/lib/api-middleware'
import { z } from 'zod'

// ─── Schemas ───────────────────────────────────────────────────
const ProductInputSchema = z.object({
  sku: z.string().min(1).max(64).trim(),
  name: z.string().min(1).max(255).trim(),
  category: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  unit: z.string().max(20).default('pcs'),
  barcode: z.string().max(64).optional().nullable(),
  costPrice: z.number().min(0).max(1e9).default(0),
  salePrice: z.number().min(0).max(1e9).default(0),
  reorderLevel: z.number().int().min(0).max(1e6).default(10),
  isActive: z.boolean().default(true),
  stockQuantity: z.number().int().min(0).max(1e6).optional(),
})

// ─── GET /api/products?search= ─────────────────────────────────
export const GET = withRateLimit(
  withAuth(async (req: NextRequest, ctx: AuthContext) => {
    try {
      const q = req.nextUrl.searchParams.get('search')?.trim()
      const where = q
        ? {
            OR: [
              { sku: { contains: q } },
              { name: { contains: q } },
              { category: { contains: q } },
            ],
          }
        : {}
      // Limit results to prevent memory issues
      const products = await db.product.findMany({
        where,
        include: { stock: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
      return NextResponse.json(products)
    } catch (e) {
      return apiError(e)
    }
  }),
  { windowMs: 60_000, maxRequests: 60, keyPrefix: 'products-list' }
)

// ─── POST /api/products ────────────────────────────────────────
export const POST = withAuth(
  withValidation(ProductInputSchema, async (req: NextRequest, data, ctx: AuthContext) => {
    try {
      // Check for duplicate SKU
      const existing = await db.product.findUnique({ where: { sku: data.sku } })
      if (existing) {
        return NextResponse.json({ error: `Product with SKU '${data.sku}' already exists` }, { status: 409 })
      }

      const { stockQuantity, ...productData } = data
      const product = await db.product.create({ data: productData })

      if (typeof stockQuantity === 'number' && stockQuantity > 0) {
        await db.stock.create({
          data: { productId: product.id, quantity: stockQuantity, reserved: 0, damaged: 0 },
        })
        await db.movement.create({
          data: {
            productId: product.id,
            type: 'IN',
            quantity: stockQuantity,
            reference: 'OPENING',
            notes: 'Initial stock on product create',
          },
        })
      }

      await auditLog('CREATE', 'Product', product.id, ctx.user, `Created ${product.sku} — ${product.name}`)
      return NextResponse.json(product, { status: 201 })
    } catch (e: any) {
      // Prisma unique constraint
      if (e?.code === 'P2002') {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })
      }
      return apiError(e)
    }
  }),
  { required: true, module: 'masters', action: 'create' }
)
