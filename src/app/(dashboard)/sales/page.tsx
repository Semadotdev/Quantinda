"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Receipt,
  Package,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

type Analytics = {
  summary: {
    totalRevenue: number
    totalOrders: number
    totalDiscounts: number
    averageOrder: number
    grossProfit: number
    profitMargin: number
  }
  today: { revenue: number; orders: number }
  dailySales: { date: string; total: number; count: number }[]
  topProducts: {
    productId: string
    name: string
    unit: string
    qty: number
    revenue: number
    cost: number
    profit: number
  }[]
  allTimeOrders: number
}

export default function SalesPage() {
  const [days, setDays] = useState(7)

  const { data, isLoading } = useQuery<Analytics>({
    queryKey: ["sales-analytics", days],
    queryFn: () => fetch(`/api/sales/analytics?days=${days}`).then((r) => r.json()),
  })

  const summaryCards = data
    ? [
        {
          label: "Today's Revenue",
          value: `₱${data.today.revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
          sub: `${data.today.orders} orders`,
          icon: DollarSign,
          color: "text-green-600",
          bg: "bg-green-50",
        },
        {
          label: `${days}-Day Revenue`,
          value: `₱${data.summary.totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
          sub: `${data.summary.totalOrders} orders`,
          icon: TrendingUp,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          label: "Average Order",
          value: `₱${data.summary.averageOrder.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
          sub: `${data.allTimeOrders} all-time orders`,
          icon: ShoppingCart,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          label: "Gross Profit",
          value: `₱${data.summary.grossProfit.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
          sub: `${data.summary.profitMargin.toFixed(1)}% margin`,
          icon: BarChart3,
          color: "text-purple-600",
          bg: "bg-purple-50",
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Analytics and sales performance</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                days === d
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.label}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", card.bg)}>
                    <Icon className={cn("h-5 w-5", card.color)} />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm font-medium text-gray-900">{card.label}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{card.sub}</p>
                </div>
              )
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Daily Sales Trend</h2>
              {data?.dailySales && data.dailySales.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.dailySales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: "#9ca3af" }}
                        tickFormatter={(v: string) => {
                          const d = new Date(v)
                          return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" })
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#9ca3af" }}
                        tickFormatter={(v: number) => `₱${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        formatter={(value) => [`₱${Number(value).toFixed(2)}`, "Revenue"]}
                      />
                      <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-72 items-center justify-center text-sm text-gray-400">
                  No sales data in this period
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-base font-semibold text-gray-900">Top Products</h2>
                {data?.topProducts && data.topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {data.topProducts.map((product, i) => (
                      <div key={product.productId} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-50 text-xs font-bold text-gray-400">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {product.qty} {product.unit}{" "}
                            {product.profit > 0 && (
                              <span className="text-green-600">
                                · ₱{product.profit.toFixed(2)} profit
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          ₱{product.revenue.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Package className="mb-2 h-8 w-8 text-gray-200" />
                    <p className="text-sm text-gray-400">No product sales data</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
