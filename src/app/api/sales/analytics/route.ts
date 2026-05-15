import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get("days") || "7")

  const now = new Date()
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  startDate.setHours(0, 0, 0, 0)

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [
    totalSales,
    totalOrders,
    todayData,
    dailySales,
    topProducts,
    profitData,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { storeId: session.user.storeId, createdAt: { gte: startDate } },
      _sum: { total: true, subtotal: true, discount: true },
      _count: true,
    }),
    prisma.sale.count({ where: { storeId: session.user.storeId } }),
    prisma.sale.aggregate({
      where: { storeId: session.user.storeId, createdAt: { gte: todayStart } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.$queryRaw<{ date: string; total: number; count: bigint }[]>`
      SELECT
        DATE("createdAt") as date,
        COALESCE(SUM(total), 0) as total,
        COUNT(*) as count
      FROM "Sale"
      WHERE "storeId" = ${session.user.storeId}
        AND "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
    prisma.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: { storeId: session.user.storeId, createdAt: { gte: startDate } },
      },
      _sum: { qty: true, subtotal: true, cost: true },
      orderBy: { _sum: { subtotal: "desc" } },
      take: 10,
    }),
    prisma.sale.aggregate({
      where: { storeId: session.user.storeId, createdAt: { gte: startDate } },
      _sum: { total: true },
    }),
  ])

  const topProductIds = topProducts.map((p) => p.productId)
  const topProductDetails = topProductIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: topProductIds } },
        select: { id: true, name: true, unit: true },
      })
    : []

  const productMap = new Map(topProductDetails.map((p) => [p.id, p]))

  const formattedDailySales = dailySales.map((d) => ({
    date: d.date,
    total: Number(d.total),
    count: Number(d.count),
  }))

  const totalCost = topProducts.reduce(
    (sum, p) => sum + (p._sum.cost || 0),
    0
  )
  const totalRevenue = totalSales._sum.total || 0
  const grossProfit = totalRevenue - totalCost
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  return NextResponse.json({
    summary: {
      totalRevenue,
      totalOrders: totalSales._count,
      totalDiscounts: totalSales._sum.discount || 0,
      averageOrder: totalSales._count > 0 ? totalRevenue / totalSales._count : 0,
      grossProfit,
      profitMargin,
    },
    today: {
      revenue: todayData._sum.total || 0,
      orders: todayData._count,
    },
    dailySales: formattedDailySales,
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      name: productMap.get(p.productId)?.name || "Unknown",
      unit: productMap.get(p.productId)?.unit || "pc",
      qty: p._sum.qty || 0,
      revenue: p._sum.subtotal || 0,
      cost: p._sum.cost || 0,
      profit: (p._sum.subtotal || 0) - (p._sum.cost || 0),
    })),
    allTimeOrders: totalOrders,
  })
}
