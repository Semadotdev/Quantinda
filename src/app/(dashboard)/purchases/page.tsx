"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus, ShoppingBag, Package, X, Minus, Check } from "lucide-react"
import { usePurchaseOrders, useCreatePO, useReceivePO } from "@/hooks/use-purchases"
import { useSuppliers } from "@/hooks/use-suppliers"
import { cn } from "@/lib/utils"

type Product = { id: string; name: string; price: number; cost: number; unit: string }

export default function PurchasesPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = usePurchaseOrders(page)
  const receivePO = useReceivePO()
  const [formOpen, setFormOpen] = useState(false)

  const statusColor = (status: string) =>
    status === "RECEIVED" ? "bg-green-50 text-green-700" :
    status === "PENDING" ? "bg-yellow-50 text-yellow-700" :
    status === "CANCELLED" ? "bg-red-50 text-red-700" :
    "bg-blue-50 text-blue-700"

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="mt-1 text-sm text-gray-500">Purchase orders and receiving</p>
        </div>
        <button onClick={() => setFormOpen(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl self-start sm:self-auto">
          <Plus className="h-4 w-4" /> New PO
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>
        ) : data?.orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="mb-3 h-12 w-12 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">No purchase orders yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data?.orders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{order.poNumber}</span>
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", statusColor(order.status))}>{order.status}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {order.supplier?.name || "No supplier"} — {order.user.name} — {new Date(order.orderedAt).toLocaleDateString("en-PH")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">₱{order.total.toFixed(2)}</p>
                    {order.status === "PENDING" && (
                      <button onClick={() => receivePO.mutate(order.id)} className="mt-1 flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors">
                        <Check className="h-3 w-3" /> Receive
                      </button>
                    )}
                  </div>
                </div>
                {order.items.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.items.map((item) => (
                      <span key={item.id} className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-600">
                        {item.product.name} — {item.qty} × ₱{item.unitCost.toFixed(2)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {data && data.total > data.limit && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-sm text-gray-400">Page {data.page} of {Math.ceil(data.total / data.limit)}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">Previous</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(data.total / data.limit)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {formOpen && <POForm onClose={() => setFormOpen(false)} />}
    </div>
  )
}

function POForm({ onClose }: { onClose: () => void }) {
  const { data: suppliersData } = useSuppliers()
  const suppliers = suppliersData?.suppliers
  const createPO = useCreatePO()
  const [supplierId, setSupplierId] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<{ productId: string; name: string; qty: string; unitCost: string; unit: string }[]>([])

  const { data: productsData } = useQuery<{ products: Product[] }>({
    queryKey: ["products", "all"],
    queryFn: () => fetch("/api/products?limit=200").then((r) => r.json()),
  })

  function addRow() {
    setItems([...items, { productId: "", name: "", qty: "1", unitCost: "0", unit: "pc" }])
  }

  function updateRow(index: number, field: string, value: string) {
    const updated = [...items]
    if (field === "productId") {
      const product = productsData?.products.find((p) => p.id === value)
      updated[index] = {
        ...updated[index],
        productId: value,
        name: product?.name || "",
        unitCost: String(product?.cost || product?.price || 0),
        unit: product?.unit || "pc",
      }
    } else {
      ;(updated[index] as Record<string, string>)[field] = value
    }
    setItems(updated)
  }

  function removeRow(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createPO.mutateAsync({
      supplierId: supplierId || undefined,
      notes,
      items: items.map((i) => ({ productId: i.productId, qty: parseFloat(i.qty), unitCost: parseFloat(i.unitCost) })),
    })
    onClose()
  }

  const total = items.reduce((sum, i) => sum + (parseFloat(i.qty) || 0) * (parseFloat(i.unitCost) || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-12">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Create Purchase Order</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-50"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100">
                <option value="">No supplier</option>
                {suppliers?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" placeholder="Optional" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Items</label>
              <button type="button" onClick={addRow} className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"><Plus className="h-3 w-3" /> Add Item</button>
            </div>
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
                <Package className="mx-auto mb-2 h-6 w-6 text-gray-200" />
                <p className="text-xs text-gray-400">Click &quot;Add Item&quot; to add products</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <select value={item.productId} onChange={(e) => updateRow(i, "productId", e.target.value)} className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 outline-none">
                      <option value="">Select product</option>
                      {productsData?.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" value={item.qty} onChange={(e) => updateRow(i, "qty", e.target.value)} placeholder="Qty" className="w-16 rounded-xl border border-gray-200 px-3 py-2 text-sm text-center focus:border-emerald-400 outline-none" />
                    <div className="relative w-20">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">₱</span>
                      <input type="number" step="0.01" value={item.unitCost} onChange={(e) => updateRow(i, "unitCost", e.target.value)} className="w-full rounded-xl border border-gray-200 pl-6 pr-3 py-2 text-sm focus:border-emerald-400 outline-none" />
                    </div>
                    <button type="button" onClick={() => removeRow(i)} className="rounded-lg p-2 text-gray-300 hover:text-red-500 hover:bg-red-50"><Minus className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">Total</span>
            <span className="text-lg font-bold text-gray-900">₱{total.toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={items.length === 0 || createPO.isPending} className="rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50">
              {createPO.isPending ? "Creating..." : "Create PO"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
