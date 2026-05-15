import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") || ""
  const barcode = searchParams.get("barcode")
  const categoryId = searchParams.get("categoryId")
  const tagId = searchParams.get("tagId")
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {
    storeId: session.user.storeId,
  }

  if (barcode) {
    where.barcode = barcode
  } else if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { barcode: { contains: query } },
      { sku: { contains: query } },
    ]
  }

  if (categoryId) {
    where.categoryId = categoryId
  }

  if (tagId) {
    where.tags = { some: { tagId } }
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return NextResponse.json({ products, total, page, limit })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { name, barcode, sku, price, cost, unit, stockQty, reorderLevel, categoryId, description, image, tagIds } = body

  if (!name || price == null) {
    return NextResponse.json({ error: "Name and price are required" }, { status: 400 })
  }

  const product = await prisma.product.create({
    data: {
      name,
      barcode,
      sku,
      price: parseFloat(price),
      cost: cost ? parseFloat(cost) : 0,
      unit: unit || "pc",
      stockQty: stockQty ? parseFloat(stockQty) : 0,
      reorderLevel: reorderLevel ? parseFloat(reorderLevel) : 0,
      categoryId: categoryId || null,
      description,
      image,
      storeId: session.user.storeId,
      tags: tagIds?.length
        ? { create: tagIds.map((tagId: string) => ({ tagId })) }
        : undefined,
    },
    include: {
      category: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
  })

  return NextResponse.json(product, { status: 201 })
}
