import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type Product = {
  id: string
  name: string
  barcode: string | null
  sku: string | null
  price: number
  cost: number
  unit: string
  stockQty: number
  reorderLevel: number
  description: string | null
  image: string | null
  isActive: boolean
  categoryId: string | null
  category: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

type ProductsResponse = {
  products: Product[]
  total: number
  page: number
  limit: number
}

type ProductFormData = {
  name: string
  barcode?: string
  sku?: string
  price: number
  cost?: number
  unit?: string
  stockQty?: number
  reorderLevel?: number
  categoryId?: string
  description?: string
}

export function useProducts(params: { q?: string; categoryId?: string; page?: number }) {
  const searchParams = new URLSearchParams()
  if (params.q) searchParams.set("q", params.q)
  if (params.categoryId) searchParams.set("categoryId", params.categoryId)
  if (params.page) searchParams.set("page", String(params.page))

  return useQuery<ProductsResponse>({
    queryKey: ["products", params],
    queryFn: () =>
      fetch(`/api/products?${searchParams}`).then((r) => {
        if (!r.ok) throw new Error("Failed to fetch products")
        return r.json()
      }),
  })
}

export function useProduct(id: string | null) {
  return useQuery<Product>({
    queryKey: ["product", id],
    queryFn: () =>
      fetch(`/api/products/${id}`).then((r) => {
        if (!r.ok) throw new Error("Failed to fetch product")
        return r.json()
      }),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ProductFormData) =>
      fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.error || "Failed to create product")
        }
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Product created")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<ProductFormData>) =>
      fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.error || "Failed to update product")
        }
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product", id] })
      toast.success("Product updated")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/products/${id}`, { method: "DELETE" }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.error || "Failed to delete product")
        }
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Product deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
