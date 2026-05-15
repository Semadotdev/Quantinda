"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, Barcode, Minus, Plus, Trash2, ShoppingCart, Printer, X, Camera, Loader2 } from "lucide-react"
import { useCart, CartItem } from "@/stores/cart"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useOnline } from "@/hooks/use-online"
import { cacheProducts, getCachedProducts, queueSale } from "@/lib/db"
import { Html5Qrcode } from "html5-qrcode"

type Product = {
  id: string
  name: string
  barcode: string | null
  price: number
  stockQty: number
  unit: string
  category: { id: string; name: string } | null
  tags: { tag: { id: string; name: string } }[]
}

type Category = {
  id: string
  name: string
  _count: { products: number }
}

type SaleResponse = {
  id: string
  receiptNo: string
  subtotal: number
  discount: number
  total: number
  tendered: number
  change: number
  createdAt: string
  items: {
    product: { name: string; unit: string }
    qty: number
    unitPrice: number
    subtotal: number
  }[]
}

export default function POSPage() {
  const { data: session } = useSession()
  const { items, addItem, updateQty, removeItem, clearCart, subtotal, itemCount } = useCart()
  const [query, setQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [showPayment, setShowPayment] = useState(false)
  const [tendered, setTendered] = useState("")
  const [processing, setProcessing] = useState(false)
  const [lastSale, setLastSale] = useState<SaleResponse | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [manualBarcode, setManualBarcode] = useState("")
  const [showManualBarcode, setShowManualBarcode] = useState(false)
  const [searchingBarcode, setSearchingBarcode] = useState(false)
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  })

  const isOnline = useOnline()
  const [offlineProducts, setOfflineProducts] = useState<Product[]>([])

  const { data: productsData, isLoading } = useQuery<{ products: Product[] }>({
    queryKey: ["products", query, selectedCategory],
    queryFn: () => {
      const params = new URLSearchParams()
      if (query) params.set("q", query)
      if (selectedCategory) params.set("categoryId", selectedCategory)
      params.set("limit", "100")
      return fetch(`/api/products?${params}`).then((r) => r.json())
    },
  })

  useEffect(() => {
    if (productsData?.products) {
      cacheProducts(
        productsData.products.map((p) => ({
          id: p.id,
          name: p.name,
          barcode: p.barcode,
          price: p.price,
          cost: 0,
          unit: p.unit,
          stockQty: p.stockQty,
          categoryName: p.category?.name ?? null,
          tagNames: p.tags?.map((t: { tag: { name: string } }) => t.tag.name) ?? [],
          updatedAt: new Date().toISOString(),
        }))
      )
    }
  }, [productsData])

  useEffect(() => {
    if (!isOnline) {
      getCachedProducts().then((cached) =>
        setOfflineProducts(
          cached.map((p) => ({
            id: p.id,
            name: p.name,
            barcode: p.barcode,
            price: p.price,
            stockQty: p.stockQty,
            unit: p.unit,
            category: p.categoryName ? { id: "", name: p.categoryName } : null,
            tags: p.tagNames?.map((name) => ({ tag: { id: "", name } })) ?? [],
          }))
        )
      )
    }
  }, [isOnline])

  const products = isOnline ? (productsData?.products ?? []) : offlineProducts
  const stockMap = Object.fromEntries(products.map((p) => [p.id, p.stockQty]))

  const total = subtotal()
  const change = Math.max(0, parseFloat(tendered || "0") - total)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPayment(false)
        setLastSale(null)
      }
      if (e.key === "F8" && items.length > 0 && !showPayment && !lastSale) {
        e.preventDefault()
        setShowPayment(true)
      }
      if (e.key === "F2") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [items.length, showPayment, lastSale])

  const quickAmounts = [20, 50, 100, 200, 500, 1000]

  function handleProductClick(product: Product) {
    if (product.stockQty <= 0) {
      toast.error("Out of stock")
      return
    }
    const existing = items.find((i) => i.productId === product.id)
    if (existing && existing.qty >= product.stockQty) {
      toast.error(`Only ${product.stockQty} ${product.unit} available`)
      return
    }
    addItem({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      price: product.price,
      cost: 0,
      unit: product.unit,
    })
    setQuery("")
  }

  async function handlePay() {
    const tenderAmount = parseFloat(tendered || "0")
    if (tenderAmount < total) {
      toast.error("Insufficient payment")
      return
    }

    setProcessing(true)
    try {
      if (!isOnline) {
        await queueSale({
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            qty: item.qty,
            subtotal: item.subtotal,
          })),
          total: total,
          tendered: tenderAmount,
        })
        setShowPayment(false)
        setTendered("")
        clearCart()
        toast.success("Sale queued — will sync when online")
        setProcessing(false)
        return
      }

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            price: item.price,
          })),
          tendered: tenderAmount,
          discount: 0,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Payment failed")
      }

      const sale: SaleResponse = await res.json()
      setLastSale(sale)
      setShowPayment(false)
      setTendered("")
      clearCart()
      toast.success(`Sale complete — ${sale.receiptNo}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed")
    } finally {
      setProcessing(false)
    }
  }

  function startScanner() {
    setScanning(true)
  }

  function stopScanner() {
    setScanning(false)
    setShowManualBarcode(false)
    setManualBarcode("")
  }

  useEffect(() => {
    if (!scanning) return

    const scanner = new Html5Qrcode("pos-scanner-el")
    scannerRef.current = scanner
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 200 } },
      (decodedText) => handleBarcodeDetected(decodedText),
      () => {}
    ).catch(() => {
      setScanning(false)
      setShowManualBarcode(true)
      toast.error("Camera not available. Enter barcode manually.")
    })

    return () => {
      scanner.stop().catch(() => {})
      try { scanner.clear() } catch { }
      if (scannerRef.current === scanner) scannerRef.current = null
    }
  }, [scanning])

  async function handleBarcodeDetected(barcode: string) {
    stopScanner()
    setSearchingBarcode(true)

    try {
      const res = await fetch(`/api/products?barcode=${encodeURIComponent(barcode)}&limit=1`)
      const data = await res.json()
      if (data.products?.length > 0) {
        const product = data.products[0]
        if (product.stockQty <= 0) {
          toast.error(`${product.name} is out of stock`)
          return
        }
        const existing = items.find((i) => i.productId === product.id)
        if (existing && existing.qty >= product.stockQty) {
          toast.error(`Only ${product.stockQty} ${product.unit} available`)
          return
        }
        addItem({
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          price: product.price,
          cost: 0,
          unit: product.unit,
        })
        toast.success(`${product.name} added to cart`)
      } else {
        toast.error("Product not found for this barcode")
      }
    } catch {
      toast.error("Failed to look up product")
    } finally {
      setSearchingBarcode(false)
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualBarcode.trim()) return
    handleBarcodeDetected(manualBarcode.trim())
  }

  if (lastSale) {
    return <ReceiptView sale={lastSale} onClose={() => setLastSale(null)} storeName={session?.user?.storeName || "Store"} />
  }

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products (F2)..."
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 max-sm:py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <button
            onClick={startScanner}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 max-sm:px-3 max-sm:py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Barcode className="h-4 w-4" /> <span className="max-sm:hidden">Scan</span>
          </button>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory("")}
            aria-label={selectedCategory === "" ? "All products (active)" : "Show all products"}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              !selectedCategory
                ? "bg-amber-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            All
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              aria-label={selectedCategory === cat.id ? `${cat.name} (active)` : `Filter by ${cat.name}`}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                selectedCategory === cat.id
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading && isOnline ? (
            <div className="flex items-center justify-center h-full">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="mb-3 h-12 w-12 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 min-w-0">
              {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-2xl border-2 p-4 max-sm:p-3 text-center transition-all",
                      product.stockQty <= 0
                        ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                        : "border-gray-100 bg-white hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5"
                    )}
                  >
                    <div className="mb-2 flex h-14 w-14 max-sm:h-12 max-sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 text-xl max-sm:text-lg font-bold text-emerald-600">
                      {product.name.charAt(0)}
                    </div>
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{product.unit}</p>
                    <p className="mt-1.5 text-base max-sm:text-sm font-bold text-emerald-600">
                      ₱{product.price.toFixed(2)}
                    </p>
                    {product.tags && product.tags.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                        {product.tags.map((pt) => (
                          <span key={pt.tag.id} className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                            {pt.tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {product.stockQty <= product.stockQty && product.stockQty > 0 && product.stockQty <= 5 && (
                    <p className="mt-0.5 text-xs text-red-500">
                      {product.stockQty} left
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

      <div className="shrink-0 lg:hidden border-t border-gray-100 bg-white max-h-[40dvh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">Cart ({itemCount()})</span>
          </div>
          {items.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-600 transition-colors">
              Clear all
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center px-4">
              <ShoppingCart className="mb-2 h-6 w-6 text-gray-200" />
              <p className="text-xs text-gray-400">Cart is empty</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <CartRow
                  key={item.productId}
                  item={item}
                  stockQty={stockMap[item.productId] ?? 999}
                  onUpdateQty={(qty) => updateQty(item.productId, qty)}
                  onRemove={() => removeItem(item.productId)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-gray-100 px-4 py-2 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium text-gray-900">₱{total.toFixed(2)}</span>
          </div>
          <button
            onClick={() => setShowPayment(true)}
            disabled={items.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            Pay (F8)
          </button>
        </div>
      </div>
      </div>

    <div className="hidden lg:flex w-80 shrink-0 flex-col border-l border-gray-100 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">
              Cart ({itemCount()})
            </span>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-500 hover:text-red-600 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <ShoppingCart className="mb-2 h-8 w-8 text-gray-200" />
              <p className="text-sm text-gray-400">Cart is empty</p>
              <p className="text-xs text-gray-300">Click products to add</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <CartRow
                  key={item.productId}
                  item={item}
                  stockQty={stockMap[item.productId] ?? 999}
                  onUpdateQty={(qty) => updateQty(item.productId, qty)}
                  onRemove={() => removeItem(item.productId)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium text-gray-900">₱{total.toFixed(2)}</span>
          </div>
          <button
            onClick={() => setShowPayment(true)}
            disabled={items.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:shadow-xl disabled:opacity-50"
          >
            Pay (F8)
          </button>
        </div>
      </div>

      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Payment</h2>
              <button
                onClick={() => setShowPayment(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 rounded-xl bg-emerald-50 p-4 text-center">
              <p className="text-xs text-emerald-600 uppercase tracking-wider font-medium">
                Total Due
              </p>
              <p className="text-3xl font-bold text-emerald-700">
                ₱{total.toFixed(2)}
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Cash Received
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400">
                  ₱
                </span>
                <input
                  type="number"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="block w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-2xl font-bold text-gray-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setTendered(String(amount))}
                    className={cn(
                      "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                      parseFloat(tendered || "0") === amount
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    ₱{amount}
                  </button>
                ))}
              </div>

              {parseFloat(tendered || "0") >= total && (
                <div className="rounded-xl bg-green-50 p-3 text-center">
                  <p className="text-xs text-green-600 uppercase tracking-wider font-medium">
                    Change
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    ₱{change.toFixed(2)}
                  </p>
                </div>
              )}

              {parseFloat(tendered || "0") > 0 && parseFloat(tendered || "0") < total && (
                <div className="rounded-xl bg-red-50 p-3 text-center">
                  <p className="text-xs text-red-600 font-medium">
                    Short by ₱{(total - parseFloat(tendered || "0")).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowPayment(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePay}
                disabled={processing || parseFloat(tendered || "0") < total}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:shadow-xl disabled:opacity-50"
              >
                {processing ? "Processing..." : "Complete Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(scanning || searchingBarcode) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Scan Barcode</h2>
              <button onClick={stopScanner} className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!searchingBarcode && (
              <div className="space-y-4">
                <div
                  id="pos-scanner-el"
                  className="overflow-hidden rounded-xl bg-black"
                  style={{ minHeight: 240 }}
                />
                <p className="text-center text-xs text-gray-400">
                  Point camera at a barcode
                </p>

                <button
                  onClick={stopScanner}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>

                <div className="text-center">
                  <button
                    onClick={() => setShowManualBarcode(true)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Or enter barcode manually
                  </button>
                </div>

                {showManualBarcode && (
                  <form onSubmit={handleManualSubmit} className="flex gap-2">
                    <input
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      placeholder="Type barcode..."
                      autoFocus
                      className="block flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
                    >
                      Search
                    </button>
                  </form>
                )}
              </div>
            )}

            {searchingBarcode && (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <p className="mt-3 text-sm text-gray-500">Looking up product...</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

function CartRow({
  item,
  stockQty,
  onUpdateQty,
  onRemove,
}: {
  item: CartItem
  stockQty: number
  onUpdateQty: (qty: number) => void
  onRemove: () => void
}) {
  const atMax = item.qty >= stockQty

  return (
    <div className="group px-4 py-2.5 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {item.name}
          </p>
          <p className="text-xs text-gray-400">₱{item.price.toFixed(2)} each</p>
        </div>
        <button
          onClick={onRemove}
          aria-label={`Remove ${item.name} from cart`}
          className="ml-2 rounded-lg p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdateQty(item.qty - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-8 text-center text-sm font-medium text-gray-900">
            {item.qty}
          </span>
          <button
            onClick={() => onUpdateQty(item.qty + 1)}
            disabled={atMax}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg border transition-colors",
              atMax
                ? "border-gray-100 text-gray-300 cursor-not-allowed"
                : "border-gray-200 text-gray-500 hover:bg-gray-100"
            )}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <span className="text-sm font-semibold text-gray-900">
          ₱{item.subtotal.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

function ReceiptView({
  sale,
  onClose,
  storeName,
}: {
  sale: SaleResponse
  onClose: () => void
  storeName: string
}) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  function handlePrint() {
    const content = receiptRef.current
    if (!content) return
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>Receipt ${sale.receiptNo}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0; padding: 8px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 2px 0; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .border-top { border-top: 1px dashed #000; }
            .fw-bold { font-weight: bold; }
            .mt-2 { margin-top: 8px; }
            .mb-2 { margin-bottom: 8px; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  async function handleSaveImage() {
    const content = receiptRef.current
    if (!content || saving) return
    setSaving(true)
    try {
      const { toPng } = await import("html-to-image")
      const dataUrl = await toPng(content, { quality: 1, pixelRatio: 2 })
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `receipt-${sale.receiptNo}.png`
      a.click()
    } catch {
      toast.error("Failed to save receipt image")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div
        ref={receiptRef}
        className="w-full max-w-[80mm] bg-white p-4 shadow-lg rounded-2xl"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        <div className="text-center mb-4">
          <p className="text-lg font-bold">{storeName}</p>
          <p className="text-xs text-gray-500">Smart Sari-Sari Store POS</p>
          <p className="text-xs text-gray-500">
            {new Date(sale.createdAt).toLocaleString("en-PH")}
          </p>
          <p className="text-xs text-gray-500">Receipt: {sale.receiptNo}</p>
        </div>

        <div className="border-t border-dashed border-gray-300 my-2" />

        {sale.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="flex-1">
              {item.product.name}
              <br />
              <span className="text-xs text-gray-400">
                {item.qty} x ₱{item.unitPrice.toFixed(2)}
              </span>
            </span>
            <span className="text-right font-medium">
              ₱{item.subtotal.toFixed(2)}
            </span>
          </div>
        ))}

        <div className="border-t border-dashed border-gray-300 my-2" />

        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>₱{sale.subtotal.toFixed(2)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between text-sm">
            <span>Discount</span>
            <span>-₱{sale.discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold mt-1">
          <span>TOTAL</span>
          <span>₱{sale.total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Cash</span>
          <span>₱{sale.tendered.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Change</span>
          <span>₱{sale.change.toFixed(2)}</span>
        </div>

        <div className="border-t border-dashed border-gray-300 mt-3 mb-2" />
        <p className="text-center text-xs text-gray-500">
          Thank you for your purchase!
        </p>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-[80mm] px-2">
        <button
          onClick={handlePrint}
          aria-label="Print receipt"
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex-1"
        >
          <Printer className="h-4 w-4" /> Print
        </button>
        <button
          onClick={handleSaveImage}
          disabled={saving}
          aria-label="Save receipt as image"
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 flex-1"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {saving ? "Saving..." : "Save as Image"}
        </button>
        <button
          onClick={onClose}
          aria-label="Start new sale"
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl flex-1"
        >
          New Sale
        </button>
      </div>
    </div>
  )
}
