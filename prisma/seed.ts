import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { hash } from "bcryptjs"
import "dotenv/config"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function seedStore(storeCode: string, storeName: string, address: string) {
  const store = await prisma.store.upsert({
    where: { code: storeCode },
    update: {},
    create: { name: storeName, code: storeCode, address, currency: "PHP", taxRate: 0, receiptFooter: "Thank you for your purchase!" },
  })
  console.log(`Created store: ${store.name}`)
  return store
}

async function seedUser(email: string, name: string, password: string, role: any, pin: string, storeId: string) {
  const hashed = await hash(password, 12)
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, password: hashed, role, pin, storeId },
  })
  console.log(`Created user: ${user.name} (${email} / ${password})`)
  return user
}

async function seedCategories(storeId: string) {
  const categoryData = [
    { name: "Beverages", description: "Drinks and refreshments" },
    { name: "Snacks", description: "Chips, biscuits, and snack foods" },
    { name: "Canned Goods", description: "Canned food and preserves" },
    { name: "Household", description: "Cleaning and home supplies" },
  ]
  const categories: { id: string; name: string }[] = []
  for (const c of categoryData) {
    const cat = await prisma.category.upsert({
      where: { name_storeId: { name: c.name, storeId } },
      update: {},
      create: { ...c, storeId },
    })
    categories.push(cat)
  }
  console.log(`Created ${categories.length} categories`)
  return categories
}

type SeedProduct = { id: string; name: string; barcode: string | null; price: number; cost: number; unit: string; stockQty: number }

async function seedProducts(storeId: string, categories: { id: string; name: string }[]) {
  const catMap = new Map(categories.map((c) => [c.name, c.id]))
  const products = [
    { name: "Coke 355ml", barcode: "4800123456789", price: 20, cost: 15, unit: "pc", stockQty: 100, reorderLevel: 20, categoryName: "Beverages" },
    { name: "Sprite 355ml", barcode: "4800123456790", price: 20, cost: 15, unit: "pc", stockQty: 80, reorderLevel: 20, categoryName: "Beverages" },
    { name: "Royal 355ml", barcode: "4800123456791", price: 20, cost: 15, unit: "pc", stockQty: 60, reorderLevel: 20, categoryName: "Beverages" },
    { name: "Pancit Canton (Original)", barcode: "4800123456792", price: 15, cost: 10, unit: "pc", stockQty: 50, reorderLevel: 15, categoryName: "Snacks" },
    { name: "Pancit Canton (Sweet & Spicy)", barcode: "4800123456793", price: 15, cost: 10, unit: "pc", stockQty: 45, reorderLevel: 15, categoryName: "Snacks" },
    { name: "Piattos (Sour Cream)", barcode: "4800123456794", price: 25, cost: 18, unit: "pc", stockQty: 3, reorderLevel: 10, categoryName: "Snacks" },
    { name: "Corned Beef 150g", barcode: "4800123456795", price: 45, cost: 35, unit: "pc", stockQty: 30, reorderLevel: 10, categoryName: "Canned Goods" },
    { name: "Sardines 155g", barcode: "4800123456796", price: 25, cost: 18, unit: "pc", stockQty: 40, reorderLevel: 15, categoryName: "Canned Goods" },
    { name: "Tuna Flakes 180g", barcode: "4800123456797", price: 35, cost: 25, unit: "pc", stockQty: 25, reorderLevel: 10, categoryName: "Canned Goods" },
    { name: "Dishwashing Liquid 250ml", barcode: "4800123456798", price: 30, cost: 22, unit: "pc", stockQty: 20, reorderLevel: 5, categoryName: "Household" },
    { name: "Laundry Detergent 50g", barcode: "4800123456799", price: 10, cost: 7, unit: "sachet", stockQty: 100, reorderLevel: 30, categoryName: "Household" },
    { name: "Shampoo 10ml", barcode: "4800123456800", price: 7, cost: 4, unit: "sachet", stockQty: 200, reorderLevel: 50, categoryName: "Household" },
  ]

  const created: SeedProduct[] = []
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { id: p.barcode },
      update: {},
      create: {
        id: p.barcode, name: p.name, barcode: p.barcode, price: p.price, cost: p.cost, unit: p.unit,
        stockQty: p.stockQty, reorderLevel: p.reorderLevel, categoryId: catMap.get(p.categoryName),
        storeId,
      },
    })
    created.push(product)
  }
  console.log(`Created ${created.length} products`)
  return created
}

async function seedTags(storeId: string) {
  const tagNames = [
    "Diaper", "Best Seller", "New Arrival", "On Sale", "Limited Stock",
    "Coffee & Tea", "Candy", "Noodles", "Bread & Pastry", "Frozen",
    "Condiments", "Personal Care", "Baby Care", "Pet Food", "School Supply",
    "Household", "Medicine", "Battery & Electronics", "Party Needs", "Religious",
  ]
  const tags: { id: string; name: string }[] = []
  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { name_storeId: { name, storeId } },
      update: {},
      create: { name, storeId },
    })
    tags.push(tag)
  }
  console.log(`Created ${tags.length} tags`)
  return tags
}

async function seedProductTags(storeId: string, tagMap: Map<string, string>, assignments: { barcode: string; tagName: string }[]) {
  let count = 0
  for (const { barcode, tagName } of assignments) {
    const product = await prisma.product.findUnique({ where: { id: barcode } })
    const tagId = tagMap.get(tagName)
    if (product && tagId && product.storeId === storeId) {
      await prisma.productTag.upsert({
        where: { productId_tagId: { productId: product.id, tagId } },
        update: {},
        create: { productId: product.id, tagId },
      })
      count++
    }
  }
  console.log(`Assigned ${count} product tags`)
}

async function seedSampleSales(storeId: string, userId: string, products: { id: string; name: string; price: number; cost: number; unit: string; stockQty: number }[]) {
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
      const shuffled = [...products].sort(() => Math.random() - 0.5).slice(0, numItems)
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
          receiptNo,
          subtotal,
          tax: 0,
          discount: 0,
          total: subtotal,
          paymentMethod: "CASH",
          tendered: subtotal + Math.round(Math.random() * 100),
          change: Math.round(Math.random() * 100),
          storeId,
          userId,
          createdAt,
          items: { create: items },
        },
      })
      saleCount++
    }
  }
  console.log(`Created ${saleCount} sample sales with ${itemCount} items`)
}

async function seedMainStore() {
  console.log("Seeding Main Store...")
  const store = await seedStore("STORE-001", "Main Branch", "123 Rizal St., Barangay 1")
  const categories = await seedCategories(store.id)

  const admin = await seedUser("admin@quantinda.com", "Store Admin", "admin123", "SUPER_ADMIN", "1234", store.id)
  await seedUser("cashier@quantinda.com", "Cashier Juan", "cashier123", "CASHIER", "5678", store.id)
  await seedUser("manager@quantinda.com", "Branch Manager", "admin123", "ADMIN", "0000", store.id)

  const products = await seedProducts(store.id, categories)
  const tags = await seedTags(store.id)

  const tagMap = new Map(tags.map((t) => [t.name, t.id]))
  await seedProductTags(store.id, tagMap, [
    { barcode: "4800123456789", tagName: "Best Seller" },
    { barcode: "4800123456790", tagName: "Best Seller" },
    { barcode: "4800123456791", tagName: "On Sale" },
    { barcode: "4800123456792", tagName: "Noodles" },
    { barcode: "4800123456792", tagName: "Best Seller" },
    { barcode: "4800123456793", tagName: "Noodles" },
    { barcode: "4800123456794", tagName: "Limited Stock" },
    { barcode: "4800123456794", tagName: "New Arrival" },
    { barcode: "4800123456795", tagName: "Canned Goods" },
    { barcode: "4800123456796", tagName: "Canned Goods" },
    { barcode: "4800123456797", tagName: "Canned Goods" },
    { barcode: "4800123456798", tagName: "Household" },
    { barcode: "4800123456799", tagName: "Household" },
    { barcode: "4800123456800", tagName: "Personal Care" },
  ])

  console.log("Main Store seed complete!\n")
}

async function seedDemoStore() {
  console.log("Seeding Demo Store...")
  const store = await seedStore("DEMO-001", "Demo Store", "456 Demo Ave., Tester City")
  const categories = await seedCategories(store.id)

  const tester = await seedUser("tester@quantinda.com", "Demo Tester", "tester123", "TESTER", "9999", store.id)
  await seedUser("demo-cashier@quantinda.com", "Demo Cashier", "demo123", "CASHIER", "1111", store.id)
  await seedUser("demo-admin@quantinda.com", "Demo Admin", "demo123", "ADMIN", "2222", store.id)

  // Extra demo-only categories
  const extraCat = await prisma.category.upsert({
    where: { name_storeId: { name: "Frozen Goods", storeId: store.id } },
    update: {},
    create: { name: "Frozen Goods", description: "Frozen and refrigerated items", storeId: store.id },
  })
  categories.push(extraCat)

  // Demo-specific products
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

  const catMap = new Map(categories.map((c) => [c.name, c.id]))
  const created: SeedProduct[] = []

  for (const p of [...demoProducts]) {
    // Keep using the same barcode pattern for idempotency
    const product = await prisma.product.upsert({
      where: { id: p.barcode },
      update: {},
      create: {
        id: p.barcode, name: p.name, barcode: p.barcode, price: p.price, cost: p.cost, unit: p.unit,
        stockQty: p.stockQty, reorderLevel: p.reorderLevel, categoryId: catMap.get(p.categoryName),
        storeId: store.id,
      },
    })
    created.push(product)
  }
  console.log(`Created ${created.length} demo products`)

  const tags = await seedTags(store.id)

  const tagMap = new Map(tags.map((t) => [t.name, t.id]))
  await seedProductTags(store.id, tagMap, [
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
  ])

  await seedSampleSales(store.id, tester.id, created)

  console.log("Demo Store seed complete!\n")
}

async function main() {
  console.log("Seeding database...\n")
  await seedMainStore()
  await seedDemoStore()
  console.log("All seed complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
