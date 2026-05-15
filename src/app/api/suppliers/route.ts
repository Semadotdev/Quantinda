import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.storeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const suppliers = await prisma.supplier.findMany({
    where: { storeId: session.user.storeId },
    include: { _count: { select: { purchaseOrders: true } } },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(suppliers)
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
