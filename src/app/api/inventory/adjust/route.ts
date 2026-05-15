import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { productId, type, qty, notes } = body

  if (!productId || !type || qty == null) {
    return NextResponse.json({ error: "productId, type, and qty are required" }, { status: 400 })
  }

  if (!["STOCK_IN", "STOCK_OUT", "ADJUSTMENT"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, storeId: session.user.storeId },
  })

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 })
  }

  const qtyNum = parseFloat(qty)
  let stockChange = 0

  switch (type) {
    case "STOCK_IN":
      stockChange = qtyNum
      break
    case "STOCK_OUT":
      stockChange = -qtyNum
      break
    case "ADJUSTMENT":
      stockChange = qtyNum - product.stockQty
      break
  }

  const [updatedProduct] = await Promise.all([
    prisma.product.update({
      where: { id: productId },
      data: { stockQty: { increment: stockChange } },
    }),
    prisma.inventoryLog.create({
      data: {
        productId,
        type: type as "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT",
        qty: stockChange,
        notes: notes || null,
        userId: session.user.id,
      },
    }),
  ])

  return NextResponse.json(updatedProduct)
}
