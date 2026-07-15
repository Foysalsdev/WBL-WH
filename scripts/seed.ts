// Seed script — populate the ERP+WMS with realistic 3i Logistics demo data
import { db } from '../src/lib/db'

async function main() {
  console.log('🌱 Seeding database...')

  // ── Users ─────────────────────────────────────────────
  const admin = await db.user.upsert({
    where: { email: 'admin@3i-logistics.com' },
    update: {},
    create: { email: 'admin@3i-logistics.com', name: 'Foysal Ahmed', role: 'admin' },
  })
  const manager = await db.user.upsert({
    where: { email: 'manager@3i-logistics.com' },
    update: {},
    create: { email: 'manager@3i-logistics.com', name: 'Sadia Karim', role: 'manager' },
  })
  await db.user.upsert({
    where: { email: 'staff@3i-logistics.com' },
    update: {},
    create: { email: 'staff@3i-logistics.com', name: 'Rakib Hossain', role: 'staff' },
  })

  // ── Customers ────────────────────────────────────────
  const customers = await Promise.all([
    db.customer.create({ data: { code: 'CUST-001', name: 'Whirlpool Bangladesh', email: 'procurement@whirlpool-bd.com', phone: '+8801711000001', address: 'Gulshan-1, Dhaka 1212', city: 'Dhaka' } }),
    db.customer.create({ data: { code: 'CUST-002', name: 'Robi Axiata Ltd', email: 'supply@robi.com.bd', phone: '+8801711000002', address: 'Banani, Dhaka 1213', city: 'Dhaka' } }),
    db.customer.create({ data: { code: 'CUST-003', name: 'Godrej Bangladesh', email: 'orders@godrej-bd.com', phone: '+8801711000003', address: 'Chittagong EPZ', city: 'Chittagong' } }),
    db.customer.create({ data: { code: 'CUST-004', name: 'Transcom Digital', email: 'purchase@transcom.com', phone: '+8801711000004', address: 'Tejgaon, Dhaka 1208', city: 'Dhaka' } }),
  ])

  // ── Suppliers ────────────────────────────────────────
  const suppliers = await Promise.all([
    db.supplier.create({ data: { code: 'SUP-001', name: 'Samsung Electronics BD', email: 'b2b@samsung-bd.com', phone: '+8801722000001', address: 'Mohakhali, Dhaka', city: 'Dhaka' } }),
    db.supplier.create({ data: { code: 'SUP-002', name: 'LG Bangladesh', email: 'wholesale@lg-bd.com', phone: '+8801722000002', address: 'Uttara, Dhaka', city: 'Dhaka' } }),
    db.supplier.create({ data: { code: 'SUP-003', name: 'Walton Hi-Tech', email: 'b2b@waltonbd.com', phone: '+8801722000003', address: 'Gazipur', city: 'Gazipur' } }),
  ])

  // ── Warehouses & Locations ───────────────────────────
  const wh1 = await db.warehouse.create({ data: { code: 'WHS-01', name: 'Tongi Main Warehouse', address: 'Tongi Industrial Area', city: 'Gazipur', capacity: 50000 } })
  const wh2 = await db.warehouse.create({ data: { code: 'WHS-02', name: 'Chittagong Distribution Hub', address: 'Patenga EPZ', city: 'Chittagong', capacity: 30000 } })

  const zones = ['A', 'B', 'C', 'D']
  for (const wh of [wh1, wh2]) {
    for (const z of zones) {
      for (let r = 1; r <= 3; r++) {
        await db.location.create({ data: { warehouseId: wh.id, zone: z, rack: `${z}-R${r}`, bin: `${z}${r}-01` } })
      }
    }
  }

  // ── Products (appliances — Whirlpool-style catalog) ──
  const productDefs = [
    { sku: 'WHP-REF-265L',  name: 'Whirlpool Refrigerator 265L',  category: 'Refrigerator', costPrice: 65000, salePrice: 78500, reorderLevel: 5 },
    { sku: 'WHP-REF-185L',  name: 'Whirlpool Refrigerator 185L',  category: 'Refrigerator', costPrice: 42000, salePrice: 52800, reorderLevel: 8 },
    { sku: 'WHP-WM-7KG',    name: 'Whirlpool Washing Machine 7kg', category: 'Washing Machine', costPrice: 31000, salePrice: 38900, reorderLevel: 6 },
    { sku: 'WHP-WM-9KG',    name: 'Whirlpool Washing Machine 9kg', category: 'Washing Machine', costPrice: 39500, salePrice: 48700, reorderLevel: 5 },
    { sku: 'WHP-AC-1.5T',   name: 'Whirlpool AC 1.5 Ton Inverter', category: 'Air Conditioner', costPrice: 58000, salePrice: 71500, reorderLevel: 4 },
    { sku: 'WHP-MW-25L',    name: 'Whirlpool Microwave 25L',      category: 'Microwave', costPrice: 13500, salePrice: 17900, reorderLevel: 10 },
    { sku: 'WHP-DW-12P',    name: 'Whirlpool Dishwasher 12 Place', category: 'Dishwasher', costPrice: 48000, salePrice: 58500, reorderLevel: 3 },
    { sku: 'SAM-TV-55UHD',  name: 'Samsung 55" UHD Smart TV',     category: 'Television', costPrice: 78000, salePrice: 94500, reorderLevel: 4 },
    { sku: 'SAM-TV-43FHD',  name: 'Samsung 43" FHD TV',           category: 'Television', costPrice: 41000, salePrice: 52800, reorderLevel: 6 },
    { sku: 'LG-REF-290L',   name: 'LG Refrigerator 290L',         category: 'Refrigerator', costPrice: 67000, salePrice: 81200, reorderLevel: 5 },
    { sku: 'LG-AC-2T',      name: 'LG AC 2 Ton Dual Inverter',    category: 'Air Conditioner', costPrice: 72000, salePrice: 87800, reorderLevel: 3 },
    { sku: 'WLT-FAN-56',    name: 'Walton Ceiling Fan 56"',       category: 'Fan', costPrice: 3200, salePrice: 4900, reorderLevel: 30 },
  ]

  const products = await Promise.all(
    productDefs.map((p) =>
      db.product.create({
        data: {
          ...p,
          unit: 'pcs',
          barcode: `880${Math.floor(1000000000 + Math.random() * 8999999999)}`,
        },
      })
    )
  )

  // ── Stock ────────────────────────────────────────────
  const stockLevels = [
    { qty: 24, reserved: 2, damaged: 1 },
    { qty: 56, reserved: 5, damaged: 0 },
    { qty: 18, reserved: 1, damaged: 0 },
    { qty: 12, reserved: 3, damaged: 1 },
    { qty: 9,  reserved: 1, damaged: 0 },
    { qty: 42, reserved: 4, damaged: 2 },
    { qty: 3,  reserved: 0, damaged: 0 },
    { qty: 15, reserved: 2, damaged: 0 },
    { qty: 7,  reserved: 1, damaged: 0 },
    { qty: 28, reserved: 0, damaged: 0 },
    { qty: 11, reserved: 2, damaged: 0 },
    { qty: 4,  reserved: 0, damaged: 0 },
  ]

  for (let i = 0; i < products.length; i++) {
    const s = stockLevels[i]
    await db.stock.create({
      data: {
        productId: products[i].id,
        quantity: s.qty,
        reserved: s.reserved,
        damaged: s.damaged,
      },
    })
    await db.movement.create({
      data: { productId: products[i].id, type: 'IN', quantity: s.qty + s.damaged, reference: 'OPENING', notes: 'Opening balance at system go-live' },
    })
  }

  // ── Purchase Orders (Inbound) ────────────────────────
  const po1 = await db.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-00001',
      supplierId: suppliers[0].id,
      status: 'received',
      orderDate: new Date('2026-06-10'),
      expectedDate: new Date('2026-06-20'),
      receivedDate: new Date('2026-06-18'),
      notes: 'Q2 restock — Samsung TVs',
      items: {
        create: [
          { productId: products[7].id, quantity: 20, unitPrice: 78000 },
          { productId: products[8].id, quantity: 30, unitPrice: 41000 },
        ],
      },
    },
  })
  await db.purchaseOrder.update({
    where: { id: po1.id },
    data: { totalAmount: 20 * 78000 + 30 * 41000 },
  })

  const po2 = await db.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-00002',
      supplierId: suppliers[2].id,
      status: 'ordered',
      orderDate: new Date('2026-07-05'),
      expectedDate: new Date('2026-07-18'),
      notes: 'Walton fans for summer season',
      items: {
        create: [{ productId: products[11].id, quantity: 100, unitPrice: 3200 }],
      },
    },
  })
  await db.purchaseOrder.update({
    where: { id: po2.id },
    data: { totalAmount: 100 * 3200 },
  })

  const po3 = await db.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-00003',
      supplierId: suppliers[1].id,
      status: 'draft',
      orderDate: new Date('2026-07-12'),
      notes: 'Draft — awaiting approval',
      items: {
        create: [
          { productId: products[9].id,  quantity: 15, unitPrice: 67000 },
          { productId: products[10].id, quantity: 8,  unitPrice: 72000 },
        ],
      },
    },
  })
  await db.purchaseOrder.update({
    where: { id: po3.id },
    data: { totalAmount: 15 * 67000 + 8 * 72000 },
  })

  // ── Sales Orders (Outbound) ──────────────────────────
  const so1 = await db.salesOrder.create({
    data: {
      soNumber: 'SO-2026-00001',
      customerId: customers[0].id,
      status: 'delivered',
      orderDate: new Date('2026-06-25'),
      deliveryDate: new Date('2026-06-28'),
      notes: 'Whirlpool showroom restock',
      items: {
        create: [
          { productId: products[0].id, quantity: 5, unitPrice: 78500 },
          { productId: products[2].id, quantity: 8, unitPrice: 38900 },
        ],
      },
    },
  })
  await db.salesOrder.update({ where: { id: so1.id }, data: { totalAmount: 5 * 78500 + 8 * 38900 } })

  const so2 = await db.salesOrder.create({
    data: {
      soNumber: 'SO-2026-00002',
      customerId: customers[1].id,
      status: 'shipped',
      orderDate: new Date('2026-07-08'),
      deliveryDate: new Date('2026-07-12'),
      notes: 'Robi corporate order',
      items: {
        create: [
          { productId: products[7].id, quantity: 3, unitPrice: 94500 },
          { productId: products[8].id, quantity: 5, unitPrice: 52800 },
        ],
      },
    },
  })
  await db.salesOrder.update({ where: { id: so2.id }, data: { totalAmount: 3 * 94500 + 5 * 52800 } })

  const so3 = await db.salesOrder.create({
    data: {
      soNumber: 'SO-2026-00003',
      customerId: customers[3].id,
      status: 'confirmed',
      orderDate: new Date('2026-07-14'),
      notes: 'Awaiting pickup',
      items: {
        create: [
          { productId: products[1].id,  quantity: 10, unitPrice: 52800 },
          { productId: products[4].id,  quantity: 4,  unitPrice: 71500 },
        ],
      },
    },
  })
  await db.salesOrder.update({ where: { id: so3.id }, data: { totalAmount: 10 * 52800 + 4 * 71500 } })

  // ── Recent movements (post-opening) ──────────────────
  await db.movement.create({ data: { productId: products[0].id, type: 'OUT', quantity: -5, reference: so1.soNumber, notes: 'Delivery to Whirlpool' } })
  await db.movement.create({ data: { productId: products[2].id, type: 'OUT', quantity: -8, reference: so1.soNumber, notes: 'Delivery to Whirlpool' } })
  await db.movement.create({ data: { productId: products[7].id, type: 'IN',  quantity: 20,  reference: po1.poNumber, notes: 'GRN against PO' } })
  await db.movement.create({ data: { productId: products[8].id, type: 'IN',  quantity: 30,  reference: po1.poNumber, notes: 'GRN against PO' } })
  await db.movement.create({ data: { productId: products[7].id, type: 'OUT', quantity: -3,  reference: so2.soNumber, notes: 'Shipment to Robi' } })
  await db.movement.create({ data: { productId: products[8].id, type: 'OUT', quantity: -5,  reference: so2.soNumber, notes: 'Shipment to Robi' } })
  await db.movement.create({ data: { productId: products[5].id, type: 'ADJUST', quantity: -2, reference: 'ADJ-001', notes: 'Damaged stock written off' } })

  // ── Audit log ────────────────────────────────────────
  await db.auditLog.createMany({
    data: [
      { action: 'CREATE', entity: 'PurchaseOrder', entityId: po1.id,  userName: admin.name,    details: `Created ${po1.poNumber}` },
      { action: 'POST',   entity: 'StockMovement', entityId: '',       userName: manager.name,  details: 'Posted GRN for PO-2026-00001 (+50 units)' },
      { action: 'CREATE', entity: 'SalesOrder',    entityId: so1.id,   userName: admin.name,    details: `Created ${so1.soNumber}` },
      { action: 'UPDATE', entity: 'SalesOrder',    entityId: so1.id,   userName: manager.name,  details: `${so1.soNumber} → delivered` },
      { action: 'CREATE', entity: 'Product',       entityId: products[0].id, userName: admin.name, details: 'Created WHP-REF-265L' },
      { action: 'ADJUST', entity: 'Stock',         entityId: products[5].id, userName: manager.name, details: 'Damaged write-off -2 units (Microwave)' },
    ],
  })

  console.log(`✅ Seeded:`)
  console.log(`   3 users, ${customers.length} customers, ${suppliers.length} suppliers`)
  console.log(`   2 warehouses, 24 locations, ${products.length} products`)
  console.log(`   3 POs, 3 SOs, ${products.length + 7} stock movements`)
  console.log('🌱 Done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
