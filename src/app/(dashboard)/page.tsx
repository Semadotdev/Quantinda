"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import {
  ShoppingCart,
  Package,
  TrendingUp,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

async function fetchDashboard() {
  const res = await fetch("/api/dashboard")
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

export default function DashboardPage() {
  const { data: session } = useSession()

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 30_000,
  })

  const cards = [
    {
      label: "Today's Sales",
      value: data
        ? `₱${Number(data.todaySales).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
        : "—",
      sub: data ? `${data.todayOrders} orders today` : "Loading...",
      icon: ShoppingCart,
      iconBg: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Total Products",
      value: data?.totalProducts?.toLocaleString() ?? "—",
      sub: "Active products in catalog",
      icon: Package,
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      label: "Low Stock Items",
      value: data?.lowStockProducts?.toLocaleString() ?? "—",
      sub: "Needs restocking",
      icon: AlertTriangle,
      iconBg: "bg-red-100 text-red-600",
    },
    {
      label: "Sales Trend",
      value: "—",
      sub: "7-day chart coming soon",
      icon: TrendingUp,
      iconBg: "bg-green-100 text-green-600",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {session?.user?.name || "User"} &mdash; here&apos;s your store
          overview.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className={cn("rounded-xl p-2.5", card.iconBg)}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold text-gray-900">
                {isLoading ? (
                  <span className="text-gray-300">Loading...</span>
                ) : (
                  card.value
                )}
              </p>
              <p className="text-sm font-medium text-gray-900">{card.label}</p>
              <p className="mt-0.5 text-xs text-gray-400">{card.sub}</p>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Recent Transactions
          </h2>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              Loading...
            </div>
          ) : data?.recentSales?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="mb-3 h-10 w-10 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">
                No sales yet today
              </p>
              <p className="text-xs text-gray-400">
                Start ringing up customers at the POS terminal.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.recentSales?.map(
                (sale: {
                  id: string
                  receiptNo: string
                  total: number
                  createdAt: string
                  user: { name: string }
                }) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {sale.receiptNo}
                      </p>
                      <p className="text-xs text-gray-400">
                        {sale.user.name} —{" "}
                        {new Date(sale.createdAt).toLocaleTimeString("en-PH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      ₱
                      {sale.total.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
