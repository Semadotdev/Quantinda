import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tags = await prisma.tag.findMany({
    where: { storeId: session.user.storeId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(tags)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { name } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const existing = await prisma.tag.findUnique({
    where: { name_storeId: { name: name.trim(), storeId: session.user.storeId } },
  })
  if (existing) {
    return NextResponse.json({ error: "Tag already exists" }, { status: 409 })
  }

  const tag = await prisma.tag.create({
    data: { name: name.trim(), storeId: session.user.storeId },
  })

  return NextResponse.json(tag, { status: 201 })
}
