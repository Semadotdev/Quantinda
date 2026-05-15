import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

async function getPO(id: string, storeId: string) {
  return prisma.purchaseOrder.findFirst({
    where: { id, storeId },
    include: { items: true },
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await getPO(id, session.user.storeId)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  const { status, items } = body

  if (status === "RECEIVED" && existing.status !== "RECEIVED") {
    for (const item of existing.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stockQty: { increment: item.qty } },
      })
      await prisma.inventoryLog.create({
        data: {
          productId: item.productId,
          type: "STOCK_IN",
          qty: item.qty,
          ref: existing.poNumber,
          userId: session.user.id,
        },
      })
    }
  }

  const order = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: status || existing.status,
      receivedAt: status === "RECEIVED" ? new Date() : existing.receivedAt,
      notes: body.notes !== undefined ? body.notes : existing.notes,
    },
    include: {
      supplier: { select: { name: true } },
      user: { select: { name: true } },
      items: { include: { product: { select: { id: true, name: true, unit: true } } } },
    },
  })

  return NextResponse.json(order)
}
