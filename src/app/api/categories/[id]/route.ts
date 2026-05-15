import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

async function getCategory(id: string, storeId: string) {
  return prisma.category.findFirst({ where: { id, storeId } })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = await getCategory(id, session.user.storeId)
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const { name, description } = body

  if (name) {
    const duplicate = await prisma.category.findUnique({
      where: { name_storeId: { name, storeId: session.user.storeId } },
    })
    if (duplicate && duplicate.id !== id) {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 })
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    },
  })

  return NextResponse.json(category)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = await getCategory(id, session.user.storeId)
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.category.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
