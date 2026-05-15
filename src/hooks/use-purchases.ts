import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type PurchaseOrder = {
  id: string
  poNumber: string
  status: "PENDING" | "PARTIAL" | "RECEIVED" | "CANCELLED"
  total: number
  notes: string | null
  orderedAt: string
  receivedAt: string | null
  supplier: { id: string; name: string } | null
  user: { name: string }
  items: {
    id: string
    qty: number
    unitCost: number
    subtotal: number
    product: { id: string; name: string; unit: string }
  }[]
}

type POsResponse = { orders: PurchaseOrder[]; total: number; page: number; limit: number }

export function usePurchaseOrders(page = 1) {
  return useQuery<POsResponse>({
    queryKey: ["purchase-orders", page],
    queryFn: () => fetch(`/api/purchases?page=${page}`).then((r) => r.json()),
  })
}

export function useCreatePO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { supplierId?: string; notes?: string; items: { productId: string; qty: number; unitCost: number }[] }) =>
      fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-orders"] }); toast.success("Purchase order created") },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useReceivePO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/purchases/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "RECEIVED" }) })
        .then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase-orders"] }); qc.invalidateQueries({ queryKey: ["products"] }); toast.success("PO received — stock updated") },
    onError: (e: Error) => toast.error(e.message),
  })
}
