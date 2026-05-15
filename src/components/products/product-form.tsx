"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { useQuery } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { X, Barcode, Loader2, Search, Tag } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"
import { useCategories } from "@/hooks/use-categories"
import { useCreateProduct, useUpdateProduct, useProduct } from "@/hooks/use-products"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  cost: z.coerce.number().min(0).optional(),
  unit: z.string().min(1, "Unit is required"),
  stockQty: z.coerce.number().min(0).optional(),
  reorderLevel: z.coerce.number().min(0).optional(),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
})

type ProductFormData = z.infer<typeof productSchema>

type ProductFormProps = {
  productId?: string | null
  onClose: () => void
}

type BarcodeInfo = {
  product_name?: string
  brands?: string
  quantity?: string
  categories?: string
}

function detectUnit(qty?: string): string {
  if (!qty) return "pc"
  const lower = qty.toLowerCase()
  if (lower.includes("ml")) return "ml"
  if (lower.includes("l ") || lower.includes("liter")) return "l"
  if (lower.includes("kg")) return "kg"
  if (lower.includes("g ")) return "g"
  if (lower.includes("can") || lower.includes("can")) return "can"
  if (lower.includes("bottle")) return "bottle"
  if (lower.includes("pack")) return "pack"
  if (lower.includes("sachet")) return "sachet"
  return "pc"
}

export function ProductForm({ productId, onClose }: ProductFormProps) {
  const { data: categories } = useCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct(productId || "")
  const { data: existingProduct } = useProduct(productId || null)
  const [scanning, setScanning] = useState(false)
  const [searching, setSearching] = useState(false)
  const [tagSearch, setTagSearch] = useState("")
  const html5Ref = useRef<Html5Qrcode | null>(null)

  const { data: allTags } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["tags"],
    queryFn: () => fetch("/api/tags").then((r) => r.json()),
  })

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      barcode: "",
      sku: "",
      price: 0,
      cost: 0,
      unit: "pc",
      stockQty: 0,
      reorderLevel: 0,
      categoryId: "",
      description: "",
      tagIds: [],
    },
  })

  const selectedTagIds = watch("tagIds") ?? []

  useEffect(() => {
    if (existingProduct) {
      const tagIds = existingProduct.tags?.map((t) => t.tag.id) ?? []
      reset({
        name: existingProduct.name,
        barcode: existingProduct.barcode || "",
        sku: existingProduct.sku || "",
        price: existingProduct.price,
        cost: existingProduct.cost,
        unit: existingProduct.unit,
        stockQty: existingProduct.stockQty,
        reorderLevel: existingProduct.reorderLevel,
        categoryId: existingProduct.categoryId || "",
        description: existingProduct.description || "",
        tagIds,
      })
    }
  }, [existingProduct, reset])

  useEffect(() => {
    if (!scanning) return

    const scanner = new Html5Qrcode("product-scanner-el")
    html5Ref.current = scanner
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        handleBarcodeScanned(decodedText)
      },
      () => {}
    ).catch(() => {
      setScanning(false)
      toast.error("Camera not available")
    })

    return () => {
      scanner.stop().catch(() => {})
      try { scanner.clear() } catch { }
      if (html5Ref.current === scanner) html5Ref.current = null
    }
  }, [scanning])

  function startScanner() {
    setScanning(true)
  }

  function stopScanner() {
    setScanning(false)
  }

  async function handleBarcodeScanned(barcode: string) {
    stopScanner()
    setValue("barcode", barcode)
    await lookupBarcode(barcode)
  }

  async function lookupBarcode(barcode: string) {
    setSearching(true)
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
      )
      const data = await res.json()
      if (data.status === 1 && data.product) {
        const p: BarcodeInfo = data.product
        if (p.product_name) setValue("name", p.product_name)
        const descParts: string[] = []
        if (p.brands) descParts.push(p.brands)
        if (p.quantity) descParts.push(p.quantity)
        if (descParts.length > 0) setValue("description", descParts.join(" · "))
        if (p.quantity) {
          const unit = detectUnit(p.quantity)
          setValue("unit", unit)
        }
        toast.success("Product info found!")
      } else {
        toast.info("Product not found in database. Fill in details manually.")
      }
    } catch {
      toast.error("Failed to look up barcode")
    } finally {
      setSearching(false)
    }
  }

  async function handleManualLookup() {
    const barcode = getValues("barcode")
    if (!barcode?.trim()) return
    await lookupBarcode(barcode.trim())
  }

  async function onSubmit(data: ProductFormData) {
    if (productId) {
      await updateProduct.mutateAsync(data)
    } else {
      await createProduct.mutateAsync(data)
    }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Name *
          </label>
          <input
            {...register("name")}
            className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="e.g. Coke 355ml"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Barcode
          </label>
          <div className="flex gap-2">
            <input
              {...register("barcode")}
              className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Scan or type"
            />
            <button
              type="button"
              onClick={scanning ? stopScanner : startScanner}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {scanning ? <X className="h-4 w-4" /> : <Barcode className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleManualLookup}
              disabled={searching}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SKU
          </label>
          <input
            {...register("sku")}
            className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="Optional SKU"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Selling Price *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              ₱
            </span>
            <input
              {...register("price")}
              type="number"
              step="0.01"
              className="block w-full rounded-xl border border-gray-200 pl-8 pr-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="0.00"
            />
          </div>
          {errors.price && (
            <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cost Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              ₱
            </span>
            <input
              {...register("cost")}
              type="number"
              step="0.01"
              className="block w-full rounded-xl border border-gray-200 pl-8 pr-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit
          </label>
          <select
            {...register("unit")}
            className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
            <option value="pc">Piece (pc)</option>
            <option value="sachet">Sachet</option>
            <option value="bottle">Bottle</option>
            <option value="can">Can</option>
            <option value="pack">Pack</option>
            <option value="kg">Kilogram (kg)</option>
            <option value="g">Gram (g)</option>
            <option value="l">Liter (L)</option>
            <option value="ml">Milliliter (ml)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            {...register("categoryId")}
            className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">No category</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          {allTags && allTags.length > 0 ? (
            <div className="relative">
              {selectedTagIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedTagIds.map((id) => {
                    const tag = allTags.find((t) => t.id === id)
                    if (!tag) return null
                    return (
                      <span key={id} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 px-2.5 py-1 text-xs font-medium">
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => setValue("tagIds", selectedTagIds.filter((tid) => tid !== id))}
                          className="hover:text-emerald-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
              <input
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Search tags..."
                className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
              {tagSearch && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-lg max-h-48 overflow-y-auto">
                  {(() => {
                    const filtered = allTags.filter((t) =>
                      t.name.toLowerCase().includes(tagSearch.toLowerCase())
                    )
                    return filtered.length > 0 ? (
                      filtered.map((tag) => {
                        const active = selectedTagIds.includes(tag.id)
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              const next = active
                                ? selectedTagIds.filter((id) => id !== tag.id)
                                : [...selectedTagIds, tag.id]
                              setValue("tagIds", next)
                              setTagSearch("")
                            }}
                            className={cn(
                              "flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors",
                              active
                                ? "bg-emerald-50 text-emerald-700"
                                : "text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            <Tag className={cn("h-4 w-4", active ? "text-emerald-500" : "text-gray-300")} />
                            <span className="flex-1">{tag.name}</span>
                            {active && <span className="text-emerald-500 text-xs font-medium">Selected</span>}
                          </button>
                        )
                      })
                    ) : (
                      <p className="px-4 py-3 text-sm text-gray-400">No tags match</p>
                    )
                  })()}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No tags available. Add tags in Settings first.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Initial Stock
          </label>
          <input
            {...register("stockQty")}
            type="number"
            step="0.01"
            className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reorder Level
          </label>
          <input
            {...register("reorderLevel")}
            type="number"
            step="0.01"
            className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="0"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            {...register("description")}
            rows={3}
            className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none"
            placeholder="Optional description..."
          />
        </div>
      </div>

      {scanning && (
        <div className="overflow-hidden rounded-xl bg-black" style={{ minHeight: 200 }}>
          <div id="product-scanner-el" />
          <div className="bg-gradient-to-t from-black/60 to-transparent p-3">
            <p className="text-center text-xs text-white">
              Point camera at a barcode
            </p>
          </div>
        </div>
      )}

      {searching && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-sm text-emerald-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Looking up barcode...
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:shadow-xl hover:shadow-emerald-300 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : productId ? "Update Product" : "Add Product"}
        </button>
      </div>
    </form>
  )
}
