import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { items, tendered, discount = 0, notes } = body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
  }

  if (tendered == null || tendered < 0) {
    return NextResponse.json({ error: "Invalid tender amount" }, { status: 400 })
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: items.map((i: { productId: string }) => i.productId) },
      storeId: session.user.storeId,
    },
  })

  const productMap = new Map(products.map((p) => [p.id, p]))

  const saleItems = items.map(
    (item: { productId: string; qty: number; price: number }) => {
      const product = productMap.get(item.productId)
      if (!product) throw new Error(`Product ${item.productId} not found`)

      return {
        productId: item.productId,
        qty: item.qty,
        unitPrice: product.price,
        subtotal: item.qty * product.price,
        cost: product.cost * item.qty,
      }
    }
  )

  const subtotal = saleItems.reduce(
    (sum: number, item: { subtotal: number }) => sum + item.subtotal,
    0
  )
  const total = Math.max(0, subtotal - discount)
  const change = tendered - total

  if (change < 0) {
    return NextResponse.json({ error: "Insufficient payment" }, { status: 400 })
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const count = await prisma.sale.count({
    where: { storeId: session.user.storeId, createdAt: { gte: new Date(new Date().toDateString()) } },
  })
  const receiptNo = `${session.user.storeCode || "STORE"}-${dateStr}-${String(count + 1).padStart(4, "0")}`

  const sale = await prisma.sale.create({
    data: {
      receiptNo,
      subtotal,
      discount,
      total,
      paymentMethod: "CASH",
      tendered,
      change,
      notes,
      storeId: session.user.storeId,
      userId: session.user.id,
      items: {
        create: saleItems,
      },
    },
    include: {
      items: {
        include: { product: { select: { name: true, unit: true } } },
      },
    },
  })

  for (const item of saleItems) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { stockQty: { decrement: item.qty } },
    })

    await prisma.inventoryLog.create({
      data: {
        productId: item.productId,
        type: "SALE",
        qty: -item.qty,
        ref: sale.id,
        userId: session.user.id,
      },
    })
  }

  return NextResponse.json(sale, { status: 201 })
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
  const skip = (page - 1) * limit

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where: { storeId: session.user.storeId },
      include: {
        user: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.sale.count({ where: { storeId: session.user.storeId } }),
  ])

  return NextResponse.json({ sales, total, page, limit })
}
