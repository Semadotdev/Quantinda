import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type Category = {
  id: string
  name: string
  description: string | null
  _count: { products: number }
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () =>
      fetch("/api/categories").then((r) => {
        if (!r.ok) throw new Error("Failed to fetch categories")
        return r.json()
      }),
  })
}

type CategoryFormData = {
  name: string
  description?: string
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CategoryFormData) =>
      fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.error || "Failed to create category")
        }
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      toast.success("Category created")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...data }: CategoryFormData & { id: string }) =>
      fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.error || "Failed to update category")
        }
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      toast.success("Category updated")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/categories/${id}`, { method: "DELETE" }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.error || "Failed to delete category")
        }
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      toast.success("Category deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
