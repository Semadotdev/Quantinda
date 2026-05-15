"use client"

import { useState, useCallback, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Package,
  Search,
  Plus,
  Minus,
  Pencil,
  ClipboardList,
  History,
  Scan,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { usePermissions } from "@/hooks/use-permissions"
import { toast } from "sonner"
import { ScanStockDialog } from "@/components/inventory/scan-stock-dialog"

type Product = {
  id: string
  name: string
  barcode: string | null
  sku: string | null
  stockQty: number
  reorderLevel: number
  unit: string
  price: number
  cost: number
  category: { id: string; name: string } | null
}

type ProductsResponse = { products: Product[]; total: number }

type Log = {
  id: string
  type: "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT" | "SALE" | "RETURN"
  qty: number
  notes: string | null
  createdAt: string
  product: { id: string; name: string; unit: string }
  user: { name: string }
}

type LogsResponse = { logs: Log[]; total: number }

export default function InventoryPage() {
  const { can } = usePermissions()
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [tab, setTab] = useState<"overview" | "history">("overview")
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
  const [logProductId, setLogProductId] = useState<string | null>(null)
  const [scanOpen, setScanOpen] = useState(false)

  const { data, isLoading } = useQuery<ProductsResponse>({
    queryKey: ["products", debouncedQuery],
    queryFn: () => {
      const params = new URLSearchParams()
      if (debouncedQuery) params.set("q", debouncedQuery)
      params.set("limit", "200")
      return fetch(`/api/products?${params}`).then((r) => r.json())
    },
  })

  const { data: logsData } = useQuery<LogsResponse>({
    queryKey: ["inventory-logs", logProductId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (logProductId) params.set("productId", logProductId)
      return fetch(`/api/inventory/logs?${params}`).then((r) => r.json())
    },
  })

  const debouncedQueryTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const debounceTimer = useCallback((value: string) => {
    clearTimeout(debouncedQueryTimer.current)
    debouncedQueryTimer.current = setTimeout(() => setDebouncedQuery(value), 300)
  }, [])

  let filteredProducts = data?.products || []
  if (statusFilter === "low") {
    filteredProducts = filteredProducts.filter(
      (p) => p.stockQty > 0 && p.reorderLevel > 0 && p.stockQty <= p.reorderLevel
    )
  } else if (statusFilter === "out") {
    filteredProducts = filteredProducts.filter((p) => p.stockQty <= 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track stock levels and manage adjustments
          </p>
        </div>
        {can("inventory.adjust") && (
          <button
            onClick={() => setScanOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:shadow-xl"
          >
            <Scan className="h-4 w-4" /> Scan Stock
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-100">
        <button
          onClick={() => setTab("overview")}
          className={cn(
            "border-b-2 px-4 py-3 text-sm font-medium transition-colors",
            tab === "overview"
              ? "border-emerald-500 text-emerald-700"
              : "border-transparent text-gray-400 hover:text-gray-600"
          )}
        >
          <ClipboardList className="mr-1.5 inline h-4 w-4" />
          Stock Overview
        </button>
        <button
          onClick={() => setTab("history")}
          className={cn(
            "border-b-2 px-4 py-3 text-sm font-medium transition-colors",
            tab === "history"
              ? "border-emerald-500 text-emerald-700"
              : "border-transparent text-gray-400 hover:text-gray-600"
          )}
        >
          <History className="mr-1.5 inline h-4 w-4" />
          History
        </button>
      </div>

      {tab === "overview" ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); debounceTimer(e.target.value) }}
                placeholder="Search products..."
                className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="flex gap-2">
              {[
                { value: "", label: "All" },
                { value: "low", label: "Low Stock" },
                { value: "out", label: "Out of Stock" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                    statusFilter === opt.value
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Package className="mb-3 h-12 w-12 text-gray-200" />
                <p className="text-sm font-medium text-gray-500">No products found</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Product</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">On Hand</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Reorder At</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredProducts.map((product) => {
                        const ratio = product.reorderLevel > 0
                          ? product.stockQty / product.reorderLevel
                          : 1
                        const status =
                          product.stockQty <= 0
                            ? "out"
                            : ratio <= 1 && product.reorderLevel > 0
                              ? "low"
                              : "ok"

                        return (
                          <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-xs font-bold text-gray-400">
                                  {product.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                  <p className="text-xs text-gray-400">{product.unit}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={cn(
                                "text-sm font-semibold",
                                status === "out" ? "text-red-600" : status === "low" ? "text-yellow-600" : "text-gray-900"
                              )}>
                                {product.stockQty}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-500">
                              {product.reorderLevel > 0 ? product.reorderLevel : "—"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                status === "out" ? "bg-red-50 text-red-700" :
                                status === "low" ? "bg-yellow-50 text-yellow-700" :
                                "bg-green-50 text-green-700"
                              )}>
                                {status === "out" ? "Out of Stock" : status === "low" ? "Low Stock" : "In Stock"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {can("inventory.adjust") && (
                                <button
                                  onClick={() => setAdjustProduct(product)}
                                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                  Adjust
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  {filteredProducts.map((product) => {
                    const ratio = product.reorderLevel > 0
                      ? product.stockQty / product.reorderLevel
                      : 1
                    const status =
                      product.stockQty <= 0
                        ? "out"
                        : ratio <= 1 && product.reorderLevel > 0
                          ? "low"
                          : "ok"

                    return (
                      <div
                        key={product.id}
                        className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 text-sm font-bold text-emerald-600">
                              {product.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                              <p className="text-xs text-gray-400">{product.unit}</p>
                            </div>
                          </div>
                          {can("inventory.adjust") && (
                            <button
                              onClick={() => setAdjustProduct(product)}
                              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              Adjust
                            </button>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
                          <div>
                            <p className="text-xs text-gray-400">On Hand</p>
                            <p className={cn(
                              "text-sm font-semibold",
                              status === "out" ? "text-red-600" : status === "low" ? "text-yellow-600" : "text-gray-900"
                            )}>
                              {product.stockQty}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400">Reorder At</p>
                            <p className="text-sm text-gray-500">{product.reorderLevel > 0 ? product.reorderLevel : "—"}</p>
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              status === "out" ? "bg-red-50 text-red-700" :
                              status === "low" ? "bg-yellow-50 text-yellow-700" :
                              "bg-green-50 text-green-700"
                            )}>
                              {status === "out" ? "Out of Stock" : status === "low" ? "Low Stock" : "In Stock"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="p-4">
            <select
              value={logProductId || ""}
              onChange={(e) => setLogProductId(e.target.value || null)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">All products</option>
              {data?.products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logsData?.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-PH", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.product.name}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        log.type === "STOCK_IN" ? "bg-green-50 text-green-700" :
                        log.type === "STOCK_OUT" ? "bg-red-50 text-red-700" :
                        log.type === "ADJUSTMENT" ? "bg-blue-50 text-blue-700" :
                        log.type === "SALE" ? "bg-gray-50 text-gray-700" :
                        "bg-purple-50 text-purple-700"
                      )}>
                        {log.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className={cn(
                      "px-4 py-3 text-right text-sm font-medium",
                      log.qty > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {log.qty > 0 ? `+${log.qty}` : log.qty}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{log.user.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{log.notes || "—"}</td>
                  </tr>
                ))}
                {(!logsData || logsData.logs.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                      No inventory logs yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {(!logsData || logsData.logs.length === 0) ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
                <p className="text-sm text-gray-400">No inventory logs yet</p>
              </div>
            ) : (
              logsData.logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{log.product.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleString("en-PH", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className={cn(
                      "shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      log.type === "STOCK_IN" ? "bg-green-50 text-green-700" :
                      log.type === "STOCK_OUT" ? "bg-red-50 text-red-700" :
                      log.type === "ADJUSTMENT" ? "bg-blue-50 text-blue-700" :
                      log.type === "SALE" ? "bg-gray-50 text-gray-700" :
                      "bg-purple-50 text-purple-700"
                    )}>
                      {log.type.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
                    <div>
                      <p className="text-xs text-gray-400">User</p>
                      <p className="text-sm text-gray-500">{log.user.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Qty</p>
                      <p className={cn(
                        "text-sm font-semibold",
                        log.qty > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {log.qty > 0 ? `+${log.qty}` : log.qty}
                      </p>
                    </div>
                  </div>
                  {log.notes && (
                    <p className="mt-2 text-xs text-gray-400">{log.notes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {adjustProduct && (
        <StockAdjustDialog
          product={adjustProduct}
          onClose={() => setAdjustProduct(null)}
        />
      )}

      {scanOpen && (
        <ScanStockDialog onClose={() => setScanOpen(false)} />
      )}
    </div>
  )
}

function StockAdjustDialog({
  product,
  onClose,
}: {
  product: Product
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [type, setType] = useState<"STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT">("STOCK_IN")
  const [qty, setQty] = useState("")
  const [notes, setNotes] = useState("")

  const adjustMutation = useMutation({
    mutationFn: () =>
      fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, type, qty, notes }),
      }).then(async (r) => {
        if (!r.ok) { const err = await r.json(); throw new Error(err.error) }
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] })
      toast.success("Stock adjusted")
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const currentQty = product.stockQty
  const newQty =
    type === "STOCK_IN" ? currentQty + (parseFloat(qty) || 0) :
    type === "STOCK_OUT" ? Math.max(0, currentQty - (parseFloat(qty) || 0)) :
    parseFloat(qty) || currentQty

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Adjust Stock
        </h2>
        <p className="text-sm text-gray-500 mb-4">{product.name}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="flex gap-2">
              {([
                { value: "STOCK_IN" as const, label: "Stock In", icon: Plus },
                { value: "STOCK_OUT" as const, label: "Stock Out", icon: Minus },
                { value: "ADJUSTMENT" as const, label: "Set To", icon: Pencil },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setType(opt.value); setQty("") }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors flex-1 justify-center",
                    type === opt.value
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <opt.icon className="h-4 w-4" /> {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {type === "STOCK_IN" ? "Quantity to add" :
               type === "STOCK_OUT" ? "Quantity to remove" :
               "New quantity"}
            </label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              autoFocus
              className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Current stock</span>
              <span className="font-medium">{currentQty} {product.unit}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500">New stock</span>
              <span className="font-semibold text-gray-900">{newQty} {product.unit}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for adjustment"
              className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => adjustMutation.mutate()}
            disabled={!qty || adjustMutation.isPending}
            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
          >
            {adjustMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
