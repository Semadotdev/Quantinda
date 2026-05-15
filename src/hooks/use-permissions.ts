"use client"

import { useSession } from "next-auth/react"
import { can as canFn, type Permission } from "@/lib/permissions"

export function usePermissions() {
  const { data: session } = useSession()
  const role = session?.user?.role as "SUPER_ADMIN" | "ADMIN" | "CASHIER" | undefined

  return {
    role,
    can: (permission: Permission) => canFn(role)(permission),
    isAdmin: role === "SUPER_ADMIN" || role === "ADMIN",
    isSuperAdmin: role === "SUPER_ADMIN",
    isCashier: role === "CASHIER",
  }
}
