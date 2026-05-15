import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const categories = await prisma.category.findMany({
    where: { storeId: session.user.storeId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(categories)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { name, description } = body

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const existing = await prisma.category.findUnique({
    where: { name_storeId: { name, storeId: session.user.storeId } },
  })

  if (existing) {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 })
  }

  const category = await prisma.category.create({
    data: {
      name,
      description,
      storeId: session.user.storeId,
    },
  })

  return NextResponse.json(category, { status: 201 })
}
