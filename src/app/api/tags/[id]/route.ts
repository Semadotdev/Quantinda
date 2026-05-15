import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { name } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const existing = await prisma.tag.findFirst({ where: { id, storeId: session.user.storeId } })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const duplicate = await prisma.tag.findUnique({
    where: { name_storeId: { name: name.trim(), storeId: session.user.storeId } },
  })
  if (duplicate && duplicate.id !== id) {
    return NextResponse.json({ error: "Tag name already exists" }, { status: 409 })
  }

  const tag = await prisma.tag.update({
    where: { id },
    data: { name: name.trim() },
  })

  return NextResponse.json(tag)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.tag.findFirst({ where: { id, storeId: session.user.storeId } })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.tag.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
