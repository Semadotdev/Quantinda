import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { hash } from "bcryptjs"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.storeId || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { name, email, password, pin, role, isActive } = body

    const user = await prisma.user.findFirst({
      where: { id, storeId: session.user.storeId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (name) data.name = name
    if (email) data.email = email
    if (role) data.role = role
    if (typeof isActive === "boolean") data.isActive = isActive
    if (pin !== undefined) data.pin = pin || null
    if (password) data.password = await hash(password, 12)

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.storeId || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id, storeId: session.user.storeId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
