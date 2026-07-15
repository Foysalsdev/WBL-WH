import { db } from '../src/lib/db'
const products = await db.product.findMany({ where: { sku: { contains: 'TEST' } } })
console.log('TEST products:', products.length)
for (const p of products) console.log(' ', p.sku, p.name, 'created:', p.createdAt)
await db.$disconnect()
