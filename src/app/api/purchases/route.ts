import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"))
  const skip = (page - 1) * limit

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { storeId: session.user.storeId },
      include: {
        supplier: { select: { id: true, name: true } },
        user: { select: { name: true } },
        items: { include: { product: { select: { id: true, name: true, unit: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchaseOrder.count({ where: { storeId: session.user.storeId } }),
  ])

  return NextResponse.json({ orders, total, page, limit })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { supplierId, notes, items } = body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "At least one item is required" }, { status: 400 })
  }

  const total = items.reduce((sum: number, item: { qty: number; unitCost: number }) => {
    return sum + item.qty * item.unitCost
  }, 0)

  const count = await prisma.purchaseOrder.count({
    where: { storeId: session.user.storeId },
  })
  const poNumber = `PO-${String(count + 1).padStart(6, "0")}`

  const order = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      total,
      notes,
      storeId: session.user.storeId,
      supplierId: supplierId || null,
      userId: session.user.id,
      items: {
        create: items.map((item: { productId: string; qty: number; unitCost: number }) => ({
          productId: item.productId,
          qty: item.qty,
          unitCost: item.unitCost,
          subtotal: item.qty * item.unitCost,
        })),
      },
    },
    include: {
      supplier: { select: { name: true } },
      user: { select: { name: true } },
      items: { include: { product: { select: { id: true, name: true, unit: true } } } },
    },
  })

  return NextResponse.json(order, { status: 201 })
}
