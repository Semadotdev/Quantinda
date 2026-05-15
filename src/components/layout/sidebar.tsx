"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ShoppingBag,
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  Truck,
  BarChart3,
  Settings,
  ChevronLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { usePermissions } from "@/hooks/use-permissions"
import type { Permission } from "@/lib/permissions"

const navItems: { href: string; label: string; icon: typeof LayoutDashboard; permission?: Permission }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS Terminal", icon: ShoppingCart, permission: "pos.use" },
  { href: "/products", label: "Products", icon: Package, permission: "products.view" },
  { href: "/inventory", label: "Inventory", icon: ClipboardList, permission: "inventory.view" },
  { href: "/suppliers", label: "Suppliers", icon: Truck, permission: "suppliers.view" },
  { href: "/purchases", label: "Purchases", icon: ShoppingBag, permission: "purchases.view" },
  { href: "/sales", label: "Sales Reports", icon: BarChart3, permission: "sales.reports" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings.view" },
]

export function Sidebar({ storeName }: { storeName: string }) {
  const { can } = usePermissions()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-3 top-3 z-50 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm lg:hidden"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <aside
        className={cn(
          "flex flex-col border-r border-gray-100 bg-white transition-all duration-200 dark:border-gray-800 dark:bg-gray-900",
          collapsed ? "w-16" : "w-56",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:shadow-xl max-lg:transition-transform max-lg:duration-200",
          !mobileOpen && "max-lg:-translate-x-full"
        )}
      >
      <div className="flex h-14 items-center gap-3 border-b border-gray-100 px-4 dark:border-gray-800">
        <img
          src="/logo-icon.png"
          alt="Quantinda"
          className="h-8 w-8 shrink-0 rounded-lg object-cover"
        />
        {!collapsed && (
          <span className="text-sm font-semibold text-gray-900 truncate dark:text-gray-100">
            {storeName}
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.filter((item) => (item.permission ? can(item.permission) : true)).map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-100 p-2 dark:border-gray-800">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-xl px-3 py-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>
    </aside>
    </>
  )
}
