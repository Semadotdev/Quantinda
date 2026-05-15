"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Search, Plus, Package, Barcode, Edit, Trash2 } from "lucide-react"
import { useProducts, useDeleteProduct } from "@/hooks/use-products"
import { useCategories } from "@/hooks/use-categories"
import { ProductForm } from "@/components/products/product-form"
import { CategoryManager } from "@/components/products/category-manager"
import { cn } from "@/lib/utils"
import { useOnline } from "@/hooks/use-online"
import { cacheProducts, getCachedProducts } from "@/lib/db"
import { usePermissions } from "@/hooks/use-permissions"

export default function ProductsPage() {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showCategories, setShowCategories] = useState(false)
  const deleteProduct = useDeleteProduct()
  const isOnline = useOnline()
  const { can } = usePermissions()
  const [offlineData, setOfflineData] = useState<{
    products: {
      id: string
      name: string
      barcode: string | null
      price: number
      cost: number
      unit: string
      stockQty: number
      reorderLevel: number
      category: { id: string; name: string } | null
    }[]
    total: number
    page: number
    limit: number
  } | null>(null)

  const { data, isLoading } = useProducts({
    q: debouncedQuery,
    categoryId: categoryFilter,
    page,
  })

  const displayData = isOnline ? data : offlineData

  useEffect(() => {
    if (data?.products) {
      cacheProducts(
        data.products.map((p) => ({
          id: p.id,
          name: p.name,
          barcode: p.barcode,
          price: p.price,
          cost: p.cost,
          unit: p.unit,
          stockQty: p.stockQty,
          categoryName: p.category?.name ?? null,
          updatedAt: new Date().toISOString(),
        }))
      )
    }
  }, [data])

  useEffect(() => {
    if (!isOnline) {
      getCachedProducts().then((cached) =>
        setOfflineData({
          products: cached.map((p) => ({
            id: p.id,
            name: p.name,
            barcode: p.barcode,
            price: p.price,
            cost: p.cost,
            unit: p.unit,
            stockQty: p.stockQty,
            reorderLevel: 0,
            category: p.categoryName ? { id: "", name: p.categoryName } : null,
          })),
          total: cached.length,
          page: 1,
          limit: cached.length,
        })
      )
    }
  }, [isOnline])

  const { data: categories } = useCategories()

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const debounceTimer = useCallback((value: string) => {
    clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(value)
      setPage(1)
    }, 300)
  }, [])

  function handleSearch(value: string) {
    setQuery(value)
    debounceTimer(value)
  }

  function openAddForm() {
    setEditingId(null)
    setFormOpen(true)
  }

  function openEditForm(id: string) {
    setEditingId(id)
    setFormOpen(true)
  }

  function handleDelete(id: string) {
    if (confirm("Delete this product? This cannot be undone.")) {
      deleteProduct.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your product catalog
          </p>
        </div>
        {can("products.manage") && (
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:shadow-xl"
          >
            <Plus className="h-4 w-4" /> Add Product
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by name, barcode, or SKU..."
                className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">All categories</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowCategories(!showCategories)}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                showCategories
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              )}
            >
              Categories
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : displayData?.products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Package className="mb-3 h-12 w-12 text-gray-200" />
                <p className="text-sm font-medium text-gray-500">
                  {debouncedQuery || categoryFilter
                    ? "No products match your search"
                    : "No products yet"}
                </p>
                <p className="text-xs text-gray-400">
                  {debouncedQuery || categoryFilter
                    ? "Try different search terms"
                    : "Add your first product to get started"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Barcode
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Stock
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {displayData?.products.map((product) => (
                        <tr
                          key={product.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-xs font-bold text-gray-400">
                                {product.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {product.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {product.unit}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {product.barcode ? (
                              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                <Barcode className="h-3.5 w-3.5 text-gray-300" />
                                {product.barcode}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {product.category ? (
                              <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                                {product.category.name}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-semibold text-gray-900">
                              ₱
                              {product.price.toLocaleString("en-PH", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                            {product.cost > 0 && (
                              <p className="text-xs text-gray-400">
                                Cost: ₱
                                {product.cost.toLocaleString("en-PH", {
                                  minimumFractionDigits: 2,
                                })}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                product.stockQty <= 0
                                  ? "bg-red-50 text-red-700"
                                  : product.stockQty <= product.reorderLevel
                                    ? "bg-yellow-50 text-yellow-700"
                                    : "bg-green-50 text-green-700"
                              )}
                            >
                              {product.stockQty}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {can("products.manage") && (
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => openEditForm(product.id)}
                                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(product.id)}
                                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {isOnline && displayData && displayData.total > displayData.limit && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                    <p className="text-sm text-gray-400">
                      Page {displayData.page} of {Math.ceil(displayData.total / displayData.limit)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= Math.ceil(displayData.total / displayData.limit)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {showCategories && (
          <div className="w-full shrink-0 lg:w-72">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <CategoryManager />
            </div>
          </div>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-12">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Product" : "Add Product"}
              </h2>
              <button
                onClick={() => setFormOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ProductForm
              productId={editingId}
              onClose={() => { setFormOpen(false); setEditingId(null) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
