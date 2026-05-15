import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

async function getProduct(id: string, storeId: string) {
  const product = await prisma.product.findFirst({
    where: { id, storeId },
    include: {
      category: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
  })
  return product
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const product = await getProduct(id, session.user.storeId)

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(product)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = await getProduct(id, session.user.storeId)
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const { name, barcode, sku, price, cost, unit, stockQty, reorderLevel, categoryId, description, image, isActive, tagIds } = body

  if (tagIds !== undefined) {
    await prisma.productTag.deleteMany({ where: { productId: id } })
    if (tagIds.length > 0) {
      await prisma.productTag.createMany({
        data: tagIds.map((tagId: string) => ({ productId: id, tagId })),
      })
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(barcode !== undefined && { barcode }),
      ...(sku !== undefined && { sku }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(cost !== undefined && { cost: parseFloat(cost) }),
      ...(unit !== undefined && { unit }),
      ...(stockQty !== undefined && { stockQty: parseFloat(stockQty) }),
      ...(reorderLevel !== undefined && { reorderLevel: parseFloat(reorderLevel) }),
      ...(categoryId !== undefined && { categoryId: categoryId || null }),
      ...(description !== undefined && { description }),
      ...(image !== undefined && { image }),
      ...(isActive !== undefined && { isActive }),
    },
    include: {
      category: { select: { id: true, name: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
    },
  })

  return NextResponse.json(product)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = await getProduct(id, session.user.storeId)
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.product.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
