"use client"

import { signOut, useSession } from "next-auth/react"
import {
  LogOut,
  ChevronDown,
  Moon,
  Sun,
} from "lucide-react"
import { useState } from "react"
import { ConnectivityIndicator } from "@/components/connectivity-indicator"
import { useTheme } from "@/stores/theme"

export function Header() {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const { dark, toggle } = useTheme()

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-100 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {session?.user?.storeName || "Quantinda"}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <ConnectivityIndicator />
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
