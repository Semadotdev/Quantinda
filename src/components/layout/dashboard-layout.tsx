"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { OfflineSync } from "@/components/offline-sync"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    redirect("/login")
  }

  return (
    <div className="flex h-dvh bg-gray-50 dark:bg-gray-950">
      <OfflineSync />
      <Sidebar storeName={session?.user?.storeName || "Store"} />
      <div className="flex flex-1 min-w-0 flex-col">
        <Header />
        <main className="flex-1 min-h-0 flex flex-col overflow-auto p-6 dark:text-gray-100">{children}</main>
      </div>
    </div>
  )
}
