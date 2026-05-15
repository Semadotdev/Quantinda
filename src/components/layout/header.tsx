"use client"

import { signOut, useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  LogOut,
  ChevronDown,
  Moon,
  Sun,
  Bell,
  AlertTriangle,
  ArrowRight,
} from "lucide-react"
import { useState } from "react"
import { ConnectivityIndicator } from "@/components/connectivity-indicator"
import { useTheme } from "@/stores/theme"

type LowStockProduct = {
  id: string
  name: string
  stockQty: number
  reorderLevel: number
  unit: string
}

type LowStockResponse = {
  count: number
  products: LowStockProduct[]
}

export function Header() {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [lowStockOpen, setLowStockOpen] = useState(false)
  const { dark, toggle } = useTheme()

  const { data: lowStock } = useQuery<LowStockResponse>({
    queryKey: ["low-stock"],
    queryFn: () => fetch("/api/inventory/low-stock").then((r) => r.json()),
    refetchInterval: 30000,
  })

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-100 bg-white px-6 max-lg:pl-14 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900 truncate dark:text-gray-100">
          {session?.user?.storeName || "Quantinda"}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <ConnectivityIndicator />

        <div className="relative">
          <button
            onClick={() => setLowStockOpen(!lowStockOpen)}
            className="relative rounded-xl p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800 transition-colors"
          >
            <Bell className="h-4 w-4" />
            {(lowStock?.count ?? 0) > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                {lowStock!.count > 99 ? "99+" : lowStock!.count}
              </span>
            )}
          </button>

          {lowStockOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setLowStockOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50 dark:border-gray-700 dark:bg-gray-900 dark:shadow-gray-900/50">
                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Low Stock Alerts
                    {lowStock && lowStock.count > 0 && (
                      <span className="ml-1 text-gray-400 font-normal">({lowStock.count})</span>
                    )}
                  </p>
                </div>
                {lowStock && lowStock.products.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto">
                    {lowStock.products.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-50">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate dark:text-gray-100">
                            {p.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {p.stockQty} / {p.reorderLevel} {p.unit}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-gray-400">All products are well-stocked</p>
                  </div>
                )}
                <div className="border-t border-gray-100 dark:border-gray-700">
                  <Link
                    href="/inventory"
                    onClick={() => setLowStockOpen(false)}
                    className="flex items-center justify-between rounded-b-xl px-4 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                  >
                    View in Inventory
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={toggle}
          className="rounded-xl p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800 transition-colors"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 text-xs font-semibold text-white">
              {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-gray-900 leading-tight dark:text-gray-100">
                {session?.user?.name || "User"}
              </p>
              <p className="text-xs text-gray-400 capitalize leading-tight dark:text-gray-500">
                {session?.user?.role?.toLowerCase().replace("_", " ") || ""}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-gray-100 bg-white p-1 shadow-lg shadow-gray-200/50 dark:border-gray-700 dark:bg-gray-900 dark:shadow-gray-900/50">
                <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{session?.user?.email}</p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
