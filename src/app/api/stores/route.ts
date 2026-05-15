import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { hasPermission } from "@/lib/permissions"

export async function GET() {
  const session = await auth()
  if (!session?.user?.role || !hasPermission(session.user.role as any, "stores.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const stores = await prisma.store.findMany({
    include: { _count: { select: { users: true, products: true } } },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(stores)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.role || !hasPermission(session.user.role as any, "stores.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { name, code, address, currency, taxRate, receiptFooter } = body

  if (!name || !code) {
    return NextResponse.json({ error: "Name and code are required" }, { status: 400 })
  }

  const existing = await prisma.store.findUnique({ where: { code } })
  if (existing) {
    return NextResponse.json({ error: "Store code already exists" }, { status: 409 })
  }

  const store = await prisma.store.create({
    data: { name, code, address, currency: currency || "PHP", taxRate: taxRate ?? 0, receiptFooter },
  })

  return NextResponse.json(store, { status: 201 })
}
