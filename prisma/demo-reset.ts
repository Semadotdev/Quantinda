import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { hash } from "bcryptjs"
import "dotenv/config"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Resetting Demo Store...\n")

  const store = await prisma.store.findUnique({ where: { code: "DEMO-001" } })
  if (!store) {
    console.log("Demo Store not found. Run seed first.")
    return
  }

  const storeId = store.id

  // Delete in dependency order (children first)
  console.log("Clearing Demo Store data...")
  await prisma.saleItem.deleteMany({ where: { sale: { storeId } } })
  await prisma.sale.deleteMany({ where: { storeId } })
  await prisma.inventoryLog.deleteMany({ where: { product: { storeId } } })
  await prisma.purchaseOrderItem.deleteMany({ where: { po: { storeId } } })
  await prisma.purchaseOrder.deleteMany({ where: { storeId } })
  await prisma.productTag.deleteMany({ where: { product: { storeId } } })
  await prisma.product.deleteMany({ where: { storeId } })
  await prisma.supplier.deleteMany({ where: { storeId } })
  await prisma.tag.deleteMany({ where: { storeId } })
  await prisma.category.deleteMany({ where: { storeId } })
  await prisma.user.deleteMany({ where: { storeId } })

  console.log("All Demo Store data cleared.\nRe-seeding...\n")

  // Re-create users
  const hashedTester = await hash("tester123", 12)
  const hashedDemo = await hash("demo123", 12)

  const tester = await prisma.user.create({
    data: { name: "Demo Tester", email: "tester@quantinda.com", password: hashedTester, role: "TESTER", pin: "9999", storeId },
  })
  await prisma.user.create({
    data: { name: "Demo Cashier", email: "demo-cashier@quantinda.com", password: hashedDemo, role: "CASHIER", pin: "1111", storeId },
  })
  await prisma.user.create({
    data: { name: "Demo Admin", email: "demo-admin@quantinda.com", password: hashedDemo, role: "ADMIN", pin: "2222", storeId },
  })
  console.log("Created users")

  // Re-create categories
  const categoryData = [
    { name: "Beverages", description: "Drinks and refreshments" },
    { name: "Snacks", description: "Chips, biscuits, and snack foods" },
    { name: "Canned Goods", description: "Canned food and preserves" },
    { name: "Household", description: "Cleaning and home supplies" },
    { name: "Frozen Goods", description: "Frozen and refrigerated items" },
  ]
  const categories: { id: string; name: string }[] = []
  for (const c of categoryData) {
    const cat = await prisma.category.create({ data: { ...c, storeId } })
    categories.push(cat)
  }
  console.log("Created categories")

  const catMap = new Map(categories.map((c) => [c.name, c.id]))

  // Re-create products
  const demoProducts = [
    { name: "Mineral Water 500ml", barcode: "9990000000001", price: 15, cost: 10, unit: "bottle", stockQty: 200, reorderLevel: 50, categoryName: "Beverages" },
    { name: "Coffee 3in1 Sachet", barcode: "9990000000002", price: 8, cost: 5, unit: "sachet", stockQty: 300, reorderLevel: 100, categoryName: "Beverages" },
    { name: "Candy Jar (Mint)", barcode: "9990000000003", price: 50, cost: 35, unit: "jar", stockQty: 15, reorderLevel: 5, categoryName: "Snacks" },
    { name: "Fish Sardines Hot", barcode: "9990000000004", price: 28, cost: 20, unit: "pc", stockQty: 60, reorderLevel: 20, categoryName: "Canned Goods" },
    { name: "Toothbrush", barcode: "9990000000005", price: 20, cost: 12, unit: "pc", stockQty: 40, reorderLevel: 10, categoryName: "Household" },
    { name: "Ice Cream Cup", barcode: "9990000000006", price: 25, cost: 18, unit: "pc", stockQty: 30, reorderLevel: 10, categoryName: "Frozen Goods" },
    { name: "Frozen Fish Fillet", barcode: "9990000000007", price: 85, cost: 65, unit: "pc", stockQty: 20, reorderLevel: 5, categoryName: "Frozen Goods" },
    { name: "Bread Loaf", barcode: "9990000000008", price: 45, cost: 32, unit: "pc", stockQty: 12, reorderLevel: 8, categoryName: "Snacks" },
    { name: "Instant Noodles Cup", barcode: "9990000000009", price: 18, cost: 12, unit: "pc", stockQty: 90, reorderLevel: 25, categoryName: "Snacks" },
    { name: "Liquid Soap Refill", barcode: "9990000000010", price: 40, cost: 28, unit: "pc", stockQty: 35, reorderLevel: 10, categoryName: "Household" },
  ]

  const created: { id: string; name: string; barcode: string | null; price: number; cost: number; unit: string; stockQty: number }[] = []
  for (const p of demoProducts) {
    const product = await prisma.product.create({
      data: {
        id: p.barcode, name: p.name, barcode: p.barcode, price: p.price, cost: p.cost, unit: p.unit,
        stockQty: p.stockQty, reorderLevel: p.reorderLevel, categoryId: catMap.get(p.categoryName),
        storeId,
      },
    })
    created.push(product)
  }
  console.log("Created products")

  // Re-create tags
  const tagNames = [
    "Diaper", "Best Seller", "New Arrival", "On Sale", "Limited Stock",
    "Coffee & Tea", "Candy", "Noodles", "Bread & Pastry", "Frozen",
    "Condiments", "Personal Care", "Baby Care", "Pet Food", "School Supply",
    "Household", "Medicine", "Battery & Electronics", "Party Needs", "Religious",
  ]
  const tags: { id: string; name: string }[] = []
  for (const name of tagNames) {
    const tag = await prisma.tag.create({ data: { name, storeId } })
    tags.push(tag)
  }
  console.log("Created tags")

  const tagMap = new Map(tags.map((t) => [t.name, t.id]))

  // Re-create product tags
  const tagAssignments = [
    { barcode: "9990000000001", tagName: "Best Seller" },
    { barcode: "9990000000001", tagName: "New Arrival" },
    { barcode: "9990000000002", tagName: "Coffee & Tea" },
    { barcode: "9990000000002", tagName: "Best Seller" },
    { barcode: "9990000000006", tagName: "Frozen" },
    { barcode: "9990000000007", tagName: "Frozen" },
    { barcode: "9990000000009", tagName: "Noodles" },
    { barcode: "9990000000005", tagName: "Personal Care" },
    { barcode: "9990000000010", tagName: "Household" },
    { barcode: "9990000000008", tagName: "Bread & Pastry" },
    { barcode: "9990000000004", tagName: "Limited Stock" },
  ]
  for (const { barcode, tagName } of tagAssignments) {
    const product = created.find((p) => p.barcode === barcode)
    const tagId = tagMap.get(tagName)
    if (product && tagId) {
      await prisma.productTag.create({ data: { productId: product.id, tagId } })
    }
  }
  console.log("Assigned product tags")

  // Re-create sample sales
  const now = new Date()
  let saleCount = 0
  let itemCount = 0

  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const day = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000)
    const numSales = Math.floor(Math.random() * 8) + 3

    for (let s = 0; s < numSales; s++) {
      const hour = 8 + Math.floor(Math.random() * 11)
      const minute = Math.floor(Math.random() * 60)
      const createdAt = new Date(day)
      createdAt.setHours(hour, minute, 0, 0)

      const numItems = Math.floor(Math.random() * 4) + 1
      const shuffled = [...created].sort(() => Math.random() - 0.5).slice(0, numItems)
      let subtotal = 0
      const items: { productId: string; qty: number; unitPrice: number; subtotal: number; cost: number }[] = []

      for (const p of shuffled) {
        const qty = Math.floor(Math.random() * 3) + 1
        const lineSubtotal = qty * p.price
        subtotal += lineSubtotal
        items.push({ productId: p.id, qty, unitPrice: p.price, subtotal: lineSubtotal, cost: p.cost * qty })
        itemCount++
      }

      const receiptNo = `DEMO-${createdAt.getTime().toString(36).toUpperCase()}-${s}`
      await prisma.sale.create({
        data: {
          receiptNo, subtotal, tax: 0, discount: 0, total: subtotal,
          paymentMethod: "CASH", tendered: subtotal + Math.round(Math.random() * 100),
          change: Math.round(Math.random() * 100), storeId, userId: tester.id, createdAt,
          items: { create: items },
        },
      })
      saleCount++
    }
  }
  console.log(`Created ${saleCount} sample sales with ${itemCount} items`)
  console.log("\nDemo Store reset complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
