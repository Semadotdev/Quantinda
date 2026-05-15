import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type Supplier = {
  id: string
  name: string
  contact: string | null
  phone: string | null
  email: string | null
  address: string | null
  _count: { purchaseOrders: number }
}

export function useSuppliers() {
  return useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: () => fetch("/api/suppliers").then((r) => r.json()),
  })
}

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; contact?: string; phone?: string; email?: string; address?: string }) =>
      fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Supplier created") },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; contact?: string; phone?: string; email?: string; address?: string }) =>
      fetch(`/api/suppliers/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Supplier updated") },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/suppliers/${id}`, { method: "DELETE" }).then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["suppliers"] }); toast.success("Supplier deleted") },
    onError: (e: Error) => toast.error(e.message),
  })
}
