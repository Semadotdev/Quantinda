import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))
  const skip = (page - 1) * limit

  const where = { storeId: session.user.storeId }

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: { _count: { select: { purchaseOrders: true } } },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.supplier.count({ where }),
  ])

  return NextResponse.json({ suppliers, total, page, limit })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { name, contact, phone, email, address } = body
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const supplier = await prisma.supplier.create({
    data: { name, contact, phone, email, address, storeId: session.user.storeId },
  })

  return NextResponse.json(supplier, { status: 201 })
}
