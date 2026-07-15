// Seed script — Whirlpool Bangladesh Warehouse Operations
import { db } from '../src/lib/db'

async function main() {
  console.log('🌱 Seeding Whirlpool BD warehouse data...')

  // ── Users (warehouse staff) ──────────────────────────
  const admin = await db.user.upsert({
    where: { email: 'admin@whirlpool-bd.com' },
    update: {},
    create: { email: 'admin@whirlpool-bd.com', name: 'Foysal Ahmed', role: 'admin' },
  })
  const manager = await db.user.upsert({
    where: { email: 'manager@whirlpool-bd.com' },
    update: {},
    create: { email: 'manager@whirlpool-bd.com', name: 'Sadia Karim', role: 'manager' },
  })
  const grnClerk = await db.user.upsert({
    where: { email: 'grn@whirlpool-bd.com' },
    update: {},
    create: { email: 'grn@whirlpool-bd.com', name: 'Rakib Hossain', role: 'staff' },
  })

  // ── Suppliers (Whirlpool sourcing entities) ──────────
  const suppliers = await Promise.all([
    db.supplier.create({ data: { code: 'WHP-CORP-US',  name: 'Whirlpool Corporation USA', email: 'exports@whirlpool.com',     phone: '+1-269-923-5000', address: '750 Riverview Dr, Benton Harbor, MI', city: 'Benton Harbor' } }),
    db.supplier.create({ data: { code: 'WHP-INDIA',    name: 'Whirlpool India Ltd',        email: 'supply@whirlpoolindia.com', phone: '+91-124-678-2000', address: 'Tower 4, Global Business Park, Gurugram', city: 'Gurugram' } }),
    db.supplier.create({ data: { code: 'WHP-THAILAND', name: 'Whirlpool Thailand Co Ltd',  email: 'exports@whirlpool.co.th',   phone: '+66-2-725-9000',   address: 'Bangpoo Industrial Estate, Samutprakarn', city: 'Samutprakarn' } }),
  ])

  // ── Warehouses (Whirlpool BD distribution) ──────────
  const wh1 = await db.warehouse.create({ data: { code: 'WHS-TONGI',    name: 'Whirlpool Tongi Central Warehouse', address: 'Tongi Industrial Area, Gazipur', city: 'Gazipur',  capacity: 80000 } })
  const wh2 = await db.warehouse.create({ data: { code: 'WHS-CHITTAGONG', name: 'Chittagong Regional Distribution Hub', address: 'Patenga EPZ, Chittagong',     city: 'Chittagong', capacity: 40000 } })

  // Locations: 6 zones × 4 racks × 4 bins per warehouse
  const zones = ['A', 'B', 'C', 'D', 'E', 'F']
  for (const wh of [wh1, wh2]) {
    for (const z of zones) {
      for (let r = 1; r <= 4; r++) {
        await db.location.create({ data: { warehouseId: wh.id, zone: z, rack: `${z}-R${r}`, bin: `${z}${r}-01` } })
      }
    }
  }

  // ── Customers (Whirlpool BD dealer network) ──────────
  const customers = await Promise.all([
    db.customer.create({ data: { code: 'DLR-001', name: 'Whirlpool Bashundhara Showroom',  email: 'bashundhara@whirlpool-bd.com',  phone: '+8801711000001', address: 'Bashundhara City, Level 8',     city: 'Dhaka' } }),
    db.customer.create({ data: { code: 'DLR-002', name: 'Whirlpool Gulshan Brand Store',   email: 'gulshan@whirlpool-bd.com',      phone: '+8801711000002', address: 'Gulshan Avenue, Road 11',       city: 'Dhaka' } }),
    db.customer.create({ data: { code: 'DLR-003', name: 'Transcom Digital (Whirlpool)',    email: 'transcom@whirlpool-bd.com',     phone: '+8801711000003', address: 'Tejgaon Industrial Area',       city: 'Dhaka' } }),
    db.customer.create({ data: { code: 'DLR-004', name: 'Star Tech Whirlpool Corner',       email: 'startech@whirlpool-bd.com',     phone: '+8801711000004', address: 'Multiplan Center, Elephant Road', city: 'Dhaka' } }),
    db.customer.create({ data: { code: 'DLR-005', name: 'Whirlpool Chittagong Branch',     email: 'ctg@whirlpool-bd.com',          phone: '+8801711000005', address: 'Agrabad Commercial Area',       city: 'Chittagong' } }),
    db.customer.create({ data: { code: 'DLR-006', name: 'Rahman Trading (Whirlpool Dealer)', email: 'rahman@whirlpool-bd.com',     phone: '+8801711000006', address: 'Zindabazar, Sylhet',             city: 'Sylhet' } }),
  ])

  // ── Products (Whirlpool appliance catalog) ──────────
  const productDefs = [
    // Refrigerators
    { sku: 'WHP-REF-265L-IM',  name: 'Whirlpool Protton 265L IntelliFresh Refrigerator', category: 'Refrigerator', costPrice: 78000, salePrice: 94500, reorderLevel: 5 },
    { sku: 'WHP-REF-185L-DP',  name: 'Whirlpool 185L Direct Cool Refrigerator',          category: 'Refrigerator', costPrice: 42000, salePrice: 52800, reorderLevel: 8 },
    { sku: 'WHP-REF-570L-FB',  name: 'Whirlpool FP 570L Frost-Free Refrigerator',         category: 'Refrigerator', costPrice: 145000, salePrice: 172000, reorderLevel: 3 },
    // Washing Machines
    { sku: 'WHP-WM-7KG-TL',    name: 'Whirlpool 7kg Top Load Washer',                    category: 'Washing Machine', costPrice: 31000, salePrice: 38900, reorderLevel: 6 },
    { sku: 'WHP-WM-9KG-FL',    name: 'Whirlpool 9kg Front Load Washer',                  category: 'Washing Machine', costPrice: 58000, salePrice: 71500, reorderLevel: 5 },
    { sku: 'WHP-WM-12KG-SF',   name: 'Whirlpool 12kg StainFree Washer',                  category: 'Washing Machine', costPrice: 72000, salePrice: 88500, reorderLevel: 4 },
    // Air Conditioners
    { sku: 'WHP-AC-1.5T-INV',  name: 'Whirlpool 1.5 Ton Inverter AC',                    category: 'Air Conditioner', costPrice: 64000, salePrice: 78500, reorderLevel: 5 },
    { sku: 'WHP-AC-2T-INV',    name: 'Whirlpool 2 Ton Inverter AC',                      category: 'Air Conditioner', costPrice: 78000, salePrice: 94500, reorderLevel: 4 },
    // Microwaves
    { sku: 'WHP-MW-25L-CONV',  name: 'Whirlpool 25L Convection Microwave',               category: 'Microwave', costPrice: 17500, salePrice: 22500, reorderLevel: 10 },
    { sku: 'WHP-MW-30L-SOLO',  name: 'Whirlpool 30L Solo Microwave',                     category: 'Microwave', costPrice: 14500, salePrice: 18900, reorderLevel: 10 },
    // Dishwashers & Built-in
    { sku: 'WHP-DW-12P-FP',    name: 'Whirlpool 12-Place Dishwasher PowerClean',         category: 'Dishwasher', costPrice: 58000, salePrice: 71500, reorderLevel: 3 },
    { sku: 'WHP-OW-65L-BC',    name: 'Whirlpool 65L Built-in Oven',                      category: 'Built-in Appliance', costPrice: 48000, salePrice: 59500, reorderLevel: 4 },
    // Small appliances
    { sku: 'WHP-IF-2SL-TOAST', name: 'Whirlpool 2-Slice Toaster',                        category: 'Small Appliance', costPrice: 2800, salePrice: 4400, reorderLevel: 30 },
    { sku: 'WHP-IF-BLENDER',   name: 'Whirlpool PowerBlender 1.5L',                      category: 'Small Appliance', costPrice: 4500, salePrice: 6900, reorderLevel: 25 },
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
    { qty: 6,  reserved: 1, damaged: 0 }, // low
    { qty: 18, reserved: 1, damaged: 0 },
    { qty: 12, reserved: 3, damaged: 1 },
    { qty: 9,  reserved: 1, damaged: 0 },
    { qty: 8,  reserved: 0, damaged: 0 },
    { qty: 4,  reserved: 0, damaged: 0 }, // low
    { qty: 42, reserved: 4, damaged: 2 },
    { qty: 28, reserved: 0, damaged: 0 },
    { qty: 3,  reserved: 0, damaged: 0 }, // low
    { qty: 11, reserved: 2, damaged: 0 },
    { qty: 78, reserved: 5, damaged: 0 },
    { qty: 4,  reserved: 0, damaged: 0 }, // low
  ]

  for (let i = 0; i < products.length; i++) {
    const s = stockLevels[i]
    await db.stock.create({
      data: { productId: products[i].id, quantity: s.qty, reserved: s.reserved, damaged: s.damaged },
    })
    await db.movement.create({
      data: { productId: products[i].id, type: 'IN', quantity: s.qty + s.damaged, reference: 'OPENING', notes: 'Opening balance at WMS go-live' },
    })
  }

  // ── Purchase Orders (Inbound) with GRN detail ────────
  const po1 = await db.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-00001',
      supplierId: suppliers[0].id, // Whirlpool Corp US
      status: 'received',
      orderDate: new Date('2026-06-10'),
      expectedDate: new Date('2026-06-25'),
      receivedDate: new Date('2026-06-23'),
      receivedBy: grnClerk.name,
      grnNumber: 'GRN-2026-00001',
      vehicleNo: 'DHK-MIR-1145',
      invoiceRef: 'WHP-US-INV-2026-4412',
      notes: 'Q2 restock — refrigerators & washing machines',
      items: {
        create: [
          { productId: products[0].id, quantity: 20, unitPrice: 78000, receivedQty: 20, passedQty: 19, failedQty: 1, putawayLocation: 'A-R1-01' },
          { productId: products[4].id, quantity: 25, unitPrice: 58000, receivedQty: 25, passedQty: 25, failedQty: 0, putawayLocation: 'B-R2-03' },
        ],
      },
    },
  })
  await db.purchaseOrder.update({ where: { id: po1.id }, data: { totalAmount: 20 * 78000 + 25 * 58000 } })

  const po2 = await db.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-00002',
      supplierId: suppliers[1].id, // Whirlpool India
      status: 'partial',
      orderDate: new Date('2026-07-02'),
      expectedDate: new Date('2026-07-15'),
      receivedBy: grnClerk.name,
      grnNumber: 'GRN-2026-00002',
      vehicleNo: 'IND-BD-7720',
      invoiceRef: 'WHP-IN-INV-2026-8891',
      notes: 'Microwave & AC consignment — partial receipt',
      items: {
        create: [
          { productId: products[8].id,  quantity: 50, unitPrice: 17500, receivedQty: 50, passedQty: 48, failedQty: 2, putawayLocation: 'C-R1-02' },
          { productId: products[6].id,  quantity: 30, unitPrice: 64000, receivedQty: 18, passedQty: 18, failedQty: 0, putawayLocation: 'D-R3-01' },
        ],
      },
    },
  })
  await db.purchaseOrder.update({ where: { id: po2.id }, data: { totalAmount: 50 * 17500 + 30 * 64000 } })

  const po3 = await db.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-00003',
      supplierId: suppliers[2].id, // Whirlpool Thailand
      status: 'ordered',
      orderDate: new Date('2026-07-10'),
      expectedDate: new Date('2026-07-22'),
      notes: 'Dishwasher & built-in oven consignment — awaiting dispatch',
      items: {
        create: [
          { productId: products[10].id, quantity: 15, unitPrice: 58000 },
          { productId: products[11].id, quantity: 20, unitPrice: 48000 },
        ],
      },
    },
  })
  await db.purchaseOrder.update({ where: { id: po3.id }, data: { totalAmount: 15 * 58000 + 20 * 48000 } })

  const po4 = await db.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-00004',
      supplierId: suppliers[1].id,
      status: 'draft',
      orderDate: new Date('2026-07-13'),
      notes: 'Draft — pending manager approval for Q3 small appliances',
      items: {
        create: [
          { productId: products[12].id, quantity: 200, unitPrice: 2800 },
          { productId: products[13].id, quantity: 150, unitPrice: 4500 },
        ],
      },
    },
  })
  await db.purchaseOrder.update({ where: { id: po4.id }, data: { totalAmount: 200 * 2800 + 150 * 4500 } })

  // ── Sales Orders (Outbound) with full 5-step workflow detail ─
  // SO1: fully delivered (completed all 5 steps)
  const so1 = await db.salesOrder.create({
    data: {
      soNumber: 'SO-2026-00001',
      customerId: customers[0].id, // Bashundhara Showroom
      status: 'delivered',
      orderDate: new Date('2026-06-28'),
      deliveryDate: new Date('2026-07-01'),
      notes: 'Bashundhara City monthly showroom restock',
      // Step 1: Pick
      pickedBy: grnClerk.name, pickedAt: new Date('2026-06-30'),
      // Step 2: Scan
      scannedBy: grnClerk.name, scannedAt: new Date('2026-06-30'),
      // Step 3: Invoice
      invoiceNo: 'INV-2026-00001', invoiceDate: new Date('2026-06-30'), invoicedBy: manager.name, cartonCount: 12,
      // Step 4: Dispatch
      challanNo: 'CH-2026-001', vehicleNo: 'DHK-GAZ-9921', driverName: 'Karim Uddin', driverPhone: '+8801712000001',
      dispatchedAt: new Date('2026-06-30'),
      // Step 5: POD
      podStatus: 'confirmed', podReceivedBy: 'Showroom Manager', podDate: new Date('2026-07-01'), podNotes: 'Delivered in good condition, signed by Mr. Hasan',
      items: {
        create: [
          { productId: products[0].id, quantity: 5, unitPrice: 94500, pickedQty: 5, scannedQty: 5 },
          { productId: products[3].id, quantity: 8, unitPrice: 38900, pickedQty: 8, scannedQty: 8 },
        ],
      },
    },
  })
  await db.salesOrder.update({ where: { id: so1.id }, data: { totalAmount: 5 * 94500 + 8 * 38900 } })

  // SO2: dispatched, awaiting POD
  const so2 = await db.salesOrder.create({
    data: {
      soNumber: 'SO-2026-00002',
      customerId: customers[2].id, // Transcom Digital
      status: 'dispatched',
      orderDate: new Date('2026-07-08'),
      deliveryDate: new Date('2026-07-12'),
      notes: 'Transcom corporate bulk order',
      pickedBy: grnClerk.name, pickedAt: new Date('2026-07-11'),
      scannedBy: grnClerk.name, scannedAt: new Date('2026-07-11'),
      invoiceNo: 'INV-2026-00002', invoiceDate: new Date('2026-07-11'), invoicedBy: manager.name, cartonCount: 8,
      challanNo: 'CH-2026-002', vehicleNo: 'DHK-MIR-4477', driverName: 'Jewel Ahmed', driverPhone: '+8801712000002',
      dispatchedAt: new Date('2026-07-11'),
      podStatus: 'pending',
      items: {
        create: [
          { productId: products[7].id, quantity: 3, unitPrice: 94500, pickedQty: 3, scannedQty: 3 },
          { productId: products[8].id, quantity: 5, unitPrice: 22500, pickedQty: 5, scannedQty: 5 },
        ],
      },
    },
  })
  await db.salesOrder.update({ where: { id: so2.id }, data: { totalAmount: 3 * 94500 + 5 * 22500 } })

  // SO3: invoiced, awaiting dispatch
  const so3 = await db.salesOrder.create({
    data: {
      soNumber: 'SO-2026-00003',
      customerId: customers[4].id, // Chittagong Branch
      status: 'invoiced',
      orderDate: new Date('2026-07-13'),
      deliveryDate: new Date('2026-07-16'),
      notes: 'Chittagong branch transfer — invoiced, awaiting dispatch',
      pickedBy: grnClerk.name, pickedAt: new Date('2026-07-14'),
      scannedBy: grnClerk.name, scannedAt: new Date('2026-07-14'),
      invoiceNo: 'INV-2026-00003', invoiceDate: new Date('2026-07-14'), invoicedBy: manager.name, cartonCount: 15,
      items: {
        create: [
          { productId: products[1].id, quantity: 10, unitPrice: 52800, pickedQty: 10, scannedQty: 10 },
          { productId: products[4].id, quantity: 4,  unitPrice: 71500, pickedQty: 4, scannedQty: 4 },
          { productId: products[6].id, quantity: 6,  unitPrice: 78500, pickedQty: 6, scannedQty: 6 },
        ],
      },
    },
  })
  await db.salesOrder.update({ where: { id: so3.id }, data: { totalAmount: 10 * 52800 + 4 * 71500 + 6 * 78500 } })

  const so4 = await db.salesOrder.create({
    data: {
      soNumber: 'SO-2026-00004',
      customerId: customers[1].id, // Gulshan Brand Store
      status: 'confirmed',
      orderDate: new Date('2026-07-14'),
      deliveryDate: new Date('2026-07-18'),
      notes: 'Awaiting pick & pack',
      items: {
        create: [
          { productId: products[2].id, quantity: 2, unitPrice: 172000 },
          { productId: products[5].id, quantity: 3, unitPrice: 88500 },
        ],
      },
    },
  })
  await db.salesOrder.update({ where: { id: so4.id }, data: { totalAmount: 2 * 172000 + 3 * 88500 } })

  // SO5: picked, awaiting scan
  const so5 = await db.salesOrder.create({
    data: {
      soNumber: 'SO-2026-00005',
      customerId: customers[5].id, // Rahman Trading Sylhet
      status: 'picked',
      orderDate: new Date('2026-07-13'),
      deliveryDate: new Date('2026-07-17'),
      notes: 'Sylhet dealer order — picked, awaiting scan',
      pickedBy: grnClerk.name, pickedAt: new Date('2026-07-15'),
      items: {
        create: [
          { productId: products[9].id,  quantity: 15, unitPrice: 18900, pickedQty: 15 },
          { productId: products[12].id, quantity: 30, unitPrice: 4400,  pickedQty: 30 },
        ],
      },
    },
  })
  await db.salesOrder.update({ where: { id: so5.id }, data: { totalAmount: 15 * 18900 + 30 * 4400 } })

  // SO6: scanned, awaiting invoice
  const so6 = await db.salesOrder.create({
    data: {
      soNumber: 'SO-2026-00006',
      customerId: customers[3].id, // Star Tech
      status: 'scanned',
      orderDate: new Date('2026-07-14'),
      deliveryDate: new Date('2026-07-18'),
      notes: 'Star Tech order — scanned, awaiting invoice',
      pickedBy: grnClerk.name, pickedAt: new Date('2026-07-15'),
      scannedBy: grnClerk.name, scannedAt: new Date('2026-07-15'),
      items: {
        create: [
          { productId: products[10].id, quantity: 4, unitPrice: 71500, pickedQty: 4, scannedQty: 4 },
          { productId: products[11].id, quantity: 6, unitPrice: 59500, pickedQty: 6, scannedQty: 6 },
        ],
      },
    },
  })
  await db.salesOrder.update({ where: { id: so6.id }, data: { totalAmount: 4 * 71500 + 6 * 59500 } })

  // ── Movements (post-opening) ─────────────────────────
  // SO1 deliveries
  await db.movement.create({ data: { productId: products[0].id, type: 'OUT', quantity: -5, reference: so1.soNumber, notes: 'Delivery to Bashundhara Showroom' } })
  await db.movement.create({ data: { productId: products[3].id, type: 'OUT', quantity: -8, reference: so1.soNumber, notes: 'Delivery to Bashundhara Showroom' } })
  // PO1 GRN receipt
  await db.movement.create({ data: { productId: products[0].id, type: 'IN',  quantity: 19, reference: po1.poNumber, notes: `GRN-2026-00001 — passed QC` } })
  await db.movement.create({ data: { productId: products[0].id, type: 'ADJUST', quantity: -1, reference: 'GRN-2026-00001', notes: '1 unit damaged on receipt — written off' } })
  await db.movement.create({ data: { productId: products[4].id, type: 'IN',  quantity: 25, reference: po1.poNumber, notes: `GRN-2026-00001` } })
  // PO2 GRN (partial)
  await db.movement.create({ data: { productId: products[8].id, type: 'IN',  quantity: 48, reference: po2.poNumber, notes: `GRN-2026-00002 — passed QC` } })
  await db.movement.create({ data: { productId: products[8].id, type: 'ADJUST', quantity: -2, reference: 'GRN-2026-00002', notes: '2 units cosmetic damage — rejected' } })
  await db.movement.create({ data: { productId: products[6].id, type: 'IN',  quantity: 18, reference: po2.poNumber, notes: `GRN-2026-00002 — partial receipt (18 of 30)` } })
  // SO2 shipment
  await db.movement.create({ data: { productId: products[7].id, type: 'OUT', quantity: -3, reference: so2.soNumber, notes: 'Shipment to Transcom Digital' } })
  await db.movement.create({ data: { productId: products[8].id, type: 'OUT', quantity: -5, reference: so2.soNumber, notes: 'Shipment to Transcom Digital' } })

  // ── Audit log ────────────────────────────────────────
  await db.auditLog.createMany({
    data: [
      { action: 'CREATE', entity: 'PurchaseOrder', entityId: po1.id, userName: admin.name,    details: `Created ${po1.poNumber} — Whirlpool Corp US` },
      { action: 'POST',   entity: 'StockMovement', entityId: '',     userName: grnClerk.name, details: 'GRN-2026-00001 posted — 44 units received (1 damaged)' },
      { action: 'CREATE', entity: 'SalesOrder',    entityId: so1.id, userName: admin.name,    details: `Created ${so1.soNumber} — Bashundhara Showroom` },
      { action: 'POST',   entity: 'StockMovement', entityId: '',     userName: grnClerk.name, details: `${so1.soNumber} picked — 13 units` },
      { action: 'POST',   entity: 'StockMovement', entityId: '',     userName: manager.name,  details: `${so1.soNumber} dispatched on vehicle DHK-GAZ-9921` },
      { action: 'CONFIRM',entity: 'SalesOrder',    entityId: so1.id, userName: 'System',       details: `${so1.soNumber} POD confirmed by Showroom Manager` },
      { action: 'CREATE', entity: 'PurchaseOrder', entityId: po2.id, userName: admin.name,    details: `Created ${po2.poNumber} — Whirlpool India` },
      { action: 'POST',   entity: 'StockMovement', entityId: '',     userName: grnClerk.name, details: 'GRN-2026-00002 posted — 66 units received (2 damaged)' },
      { action: 'CREATE', entity: 'SalesOrder',    entityId: so2.id, userName: admin.name,    details: `Created ${so2.soNumber} — Transcom Digital` },
      { action: 'POST',   entity: 'StockMovement', entityId: '',     userName: grnClerk.name, details: `${so2.soNumber} dispatched on DHK-MIR-4477` },
      { action: 'CREATE', entity: 'Product',       entityId: products[0].id, userName: admin.name, details: 'Created WHP-REF-265L-IM — Protton 265L' },
      { action: 'CREATE', entity: 'SalesOrder',    entityId: so4.id, userName: admin.name,    details: `Created ${so4.soNumber} — Gulshan Brand Store` },
    ],
  })

  console.log(`✅ Seeded Whirlpool BD warehouse data:`)
  console.log(`   3 staff, ${suppliers.length} sourcing entities, ${customers.length} dealers`)
  console.log(`   2 warehouses, 48 locations, ${products.length} Whirlpool SKUs`)
  console.log(`   4 POs (1 received, 1 partial, 1 ordered, 1 draft), 5 SOs (delivered/shipped/packed/picked/confirmed)`)
  console.log(`   ${products.length + 10} stock movements`)
  console.log('🌱 Done.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
