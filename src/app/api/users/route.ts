import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { hash } from "bcryptjs"

export async function GET() {
  const session = await auth()
  if (!session?.user?.storeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN"

  const users = await prisma.user.findMany({
    where: isSuperAdmin ? undefined : { storeId: session.user.storeId },
    select: {
      id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
      store: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.storeId || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, email, password, pin, role, storeId } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }

    const targetStoreId = storeId || session.user.storeId

    const store = await prisma.store.findUnique({ where: { id: targetStoreId } })
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }

    const hashedPassword = await hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        pin: pin || null,
        role: role || "CASHIER",
        storeId: targetStoreId,
      },
      select: {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
        store: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
