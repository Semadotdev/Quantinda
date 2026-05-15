import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )

  const [todaySales, totalProducts, lowStockProducts, recentSales] =
    await Promise.all([
      prisma.sale.aggregate({
        where: {
          storeId: session.user.storeId,
          createdAt: { gte: todayStart },
        },
        _sum: { total: true },
        _count: true,
      }),
      prisma.product.count({
        where: { storeId: session.user.storeId, isActive: true },
      }),
      prisma.product.count({
        where: {
          storeId: session.user.storeId,
          isActive: true,
          reorderLevel: { gt: 0 },
        },
      }),
      prisma.sale.findMany({
        where: { storeId: session.user.storeId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { name: true } },
        },
      }),
    ])

  return NextResponse.json({
    todaySales: todaySales._sum.total ?? 0,
    todayOrders: todaySales._count,
    totalProducts,
    lowStockProducts,
    recentSales,
  })
}
