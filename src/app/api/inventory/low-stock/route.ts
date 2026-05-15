import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const storeId = session.user.storeId

  const [products, countResult] = await Promise.all([
    prisma.$queryRaw<
      { id: string; name: string; stockQty: number; reorderLevel: number; unit: string }[]
    >`
      SELECT id, name, "stockQty", "reorderLevel", unit FROM "Product"
      WHERE "storeId" = ${storeId}
        AND "stockQty" > 0
        AND "reorderLevel" > 0
        AND "stockQty" <= "reorderLevel"
      ORDER BY ("stockQty"::float / NULLIF("reorderLevel"::float, 0)) ASC
      LIMIT 10
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM "Product"
      WHERE "storeId" = ${storeId}
        AND "stockQty" > 0
        AND "reorderLevel" > 0
        AND "stockQty" <= "reorderLevel"
    `,
  ])

  const count = Number(countResult[0]?.count ?? 0)

  return NextResponse.json({
    count,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      stockQty: Number(p.stockQty),
      reorderLevel: Number(p.reorderLevel),
      unit: p.unit,
    })),
  })
}
