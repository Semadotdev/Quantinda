import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { hasPermission } from "@/lib/permissions"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.role || !hasPermission(session.user.role as any, "stores.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.store.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 })
  }

  const body = await request.json()
  const { name, code, address, currency, taxRate, receiptFooter, isActive } = body

  if (code && code !== existing.code) {
    const dup = await prisma.store.findUnique({ where: { code } })
    if (dup) return NextResponse.json({ error: "Store code already exists" }, { status: 409 })
  }

  const store = await prisma.store.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(code !== undefined && { code }),
      ...(address !== undefined && { address }),
      ...(currency !== undefined && { currency }),
      ...(taxRate !== undefined && { taxRate }),
      ...(receiptFooter !== undefined && { receiptFooter }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  return NextResponse.json(store)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.role || !hasPermission(session.user.role as any, "stores.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await prisma.store.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 })
  }

  await prisma.store.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
