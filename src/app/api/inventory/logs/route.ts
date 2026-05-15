import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get("productId")
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"))
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {
    product: { storeId: session.user.storeId },
  }

  if (productId) where.productId = productId

  const [logs, total] = await Promise.all([
    prisma.inventoryLog.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, unit: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.inventoryLog.count({ where }),
  ])

  return NextResponse.json({ logs, total, page, limit })
}
