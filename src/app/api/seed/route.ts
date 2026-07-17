import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/security'

// POST /api/seed — wipe & reseed demo data (admin only)
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can reseed data' }, { status: 403 })
  }

  try {
    // Use the existing seed script via dynamic import
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    await db.auditLog.deleteMany()
    await db.permission.deleteMany()
    await db.role.deleteMany()
    await db.dispatchItem.deleteMany()
    await db.dispatch.deleteMany()
    await db.movement.deleteMany()
    await db.salesOrderItem.deleteMany()
    await db.salesOrder.deleteMany()
    await db.purchaseOrderItem.deleteMany()
    await db.purchaseOrder.deleteMany()
    await db.stock.deleteMany()
    await db.location.deleteMany()
    await db.warehouse.deleteMany()
    await db.product.deleteMany()
    await db.customer.deleteMany()
    await db.supplier.deleteMany()
    await db.vehicle.deleteMany()
    await db.transportVendor.deleteMany()
    await db.courierVendor.deleteMany()
    await db.expense.deleteMany()
    await db.cashIn.deleteMany()
    await db.requisition.deleteMany()
    await db.user.deleteMany()

    // run seed script via bun
    await execAsync('bun run /home/z/my-project/scripts/seed.ts', { cwd: '/home/z/my-project' })
    await db.$disconnect()
    return NextResponse.json({ ok: true, message: 'Database re-seeded successfully' })
  } catch (e: any) {
    console.error('Reseed failed:', e)
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
