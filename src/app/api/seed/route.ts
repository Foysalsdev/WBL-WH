import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// POST /api/seed — wipe & reseed demo data
export async function POST() {
  try {
    // pull tables directly so we don't depend on shell
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
