import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

async function getSupplier(id: string, storeId: string) {
  return prisma.supplier.findFirst({ where: { id, storeId } })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const existing = await getSupplier(id, session.user.storeId)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  const supplier = await prisma.supplier.update({ where: { id }, data: body })
  return NextResponse.json(supplier)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const existing = await getSupplier(id, session.user.storeId)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.supplier.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
