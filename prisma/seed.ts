import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { hash } from "bcryptjs"
import "dotenv/config"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  const store = await prisma.store.upsert({
    where: { code: "STORE-001" },
    update: {},
    create: {
      name: "Main Branch",
      code: "STORE-001",
      address: "123 Rizal St., Barangay 1",
      currency: "PHP",
      taxRate: 0,
      receiptFooter: "Thank you for your purchase!",
    },
  })

  console.log(`Created store: ${store.name}`)

  const hashedPassword = await hash("admin123", 12)

  const admin = await prisma.user.upsert({
    where: { email: "admin@quantinda.com" },
    update: {},
    create: {
      name: "Store Admin",
      email: "admin@quantinda.com",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      pin: "1234",
      storeId: store.id,
    },
  })

  console.log(`Created user: ${admin.name} (admin@quantinda.com / admin123)`)

  const cashierPassword = await hash("cashier123", 12)

  const cashier = await prisma.user.upsert({
    where: { email: "cashier@quantinda.com" },
    update: {},
    create: {
      name: "Cashier Juan",
      email: "cashier@quantinda.com",
      password: cashierPassword,
      role: "CASHIER",
      pin: "5678",
      storeId: store.id,
    },
  })

  console.log(`Created user: ${cashier.name} (cashier@quantinda.com / cashier123)`)

  const adminPassword2 = await hash("admin123", 12)

  const manager = await prisma.user.upsert({
    where: { email: "manager@quantinda.com" },
    update: {},
    create: {
      name: "Branch Manager",
      email: "manager@quantinda.com",
      password: adminPassword2,
      role: "ADMIN",
      pin: "0000",
      storeId: store.id,
    },
  })

  console.log(`Created user: ${manager.name} (manager@quantinda.com / admin123)`)

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name_storeId: { name: "Beverages", storeId: store.id } },
      update: {},
      create: { name: "Beverages", description: "Drinks and refreshments", storeId: store.id },
    }),
    prisma.category.upsert({
      where: { name_storeId: { name: "Snacks", storeId: store.id } },
      update: {},
      create: { name: "Snacks", description: "Chips, biscuits, and snack foods", storeId: store.id },
    }),
    prisma.category.upsert({
      where: { name_storeId: { name: "Canned Goods", storeId: store.id } },
      update: {},
      create: { name: "Canned Goods", description: "Canned food and preserves", storeId: store.id },
    }),
    prisma.category.upsert({
      where: { name_storeId: { name: "Household", storeId: store.id } },
      update: {},
      create: { name: "Household", description: "Cleaning and home supplies", storeId: store.id },
    }),
  ])

  console.log(`Created ${categories.length} categories`)

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

  let productCount = 0
  for (const p of products) {
    const category = categories.find((c) => c.name === p.categoryName)
    await prisma.product.upsert({
      where: { id: p.barcode },
      update: {},
      create: {
        name: p.name,
        barcode: p.barcode,
        price: p.price,
        cost: p.cost,
        unit: p.unit,
        stockQty: p.stockQty,
        reorderLevel: p.reorderLevel,
        categoryId: category?.id,
        storeId: store.id,
      },
    })
    productCount++
  }

  console.log(`Created ${productCount} sample products`)
  console.log("Seed complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
