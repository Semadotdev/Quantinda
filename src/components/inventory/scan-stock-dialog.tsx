"use client"

import { useState, useRef, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Camera, X, Package, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Html5Qrcode } from "html5-qrcode"

type Product = {
  id: string
  name: string
  barcode: string | null
  stockQty: number
  unit: string
}

type ScanStockDialogProps = {
  onClose: () => void
}

export function ScanStockDialog({ onClose }: ScanStockDialogProps) {
  const queryClient = useQueryClient()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState("")
  const [foundProduct, setFoundProduct] = useState<Product | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [searching, setSearching] = useState(false)
  const [qty, setQty] = useState("1")
  const [manualBarcode, setManualBarcode] = useState("")
  const [showManual, setShowManual] = useState(false)
  const [notes, setNotes] = useState("")

  function startScanner() {
    setScanning(true)
  }

  function stopScanner() {
    setScanning(false)
  }

  useEffect(() => {
    if (!scanning) return

    const scanner = new Html5Qrcode("scanner-element")
    scannerRef.current = scanner
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 200 } },
      (decodedText) => {
        handleBarcodeDetected(decodedText)
      },
      () => {}
    ).catch(() => {
      setScanning(false)
      setShowManual(true)
      toast.error("Camera not available. Enter barcode manually.")
    })

    return () => {
      scanner.stop().catch(() => {})
      try { scanner.clear() } catch { /* ignore */ }
      if (scannerRef.current === scanner) scannerRef.current = null
    }
  }, [scanning])

  async function handleBarcodeDetected(barcode: string) {
    stopScanner()
    setScannedBarcode(barcode)
    setSearching(true)
    setNotFound(false)
    setFoundProduct(null)

    try {
      const res = await fetch(`/api/products?barcode=${encodeURIComponent(barcode)}&limit=1`)
      const data = await res.json()
      if (data.products?.length > 0) {
        setFoundProduct(data.products[0])
      } else {
        setNotFound(true)
      }
    } catch {
      toast.error("Failed to look up product")
    } finally {
      setSearching(false)
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualBarcode.trim()) return
    handleBarcodeDetected(manualBarcode.trim())
  }

  function resetScan() {
    setScannedBarcode("")
    setFoundProduct(null)
    setNotFound(false)
    setQty("1")
    setNotes("")
    setManualBarcode("")
    setShowManual(false)
    startScanner()
  }

  const adjustMutation = useMutation({
    mutationFn: () =>
      fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: foundProduct!.id,
          type: "STOCK_IN",
          qty: parseFloat(qty) || 1,
          notes: notes || "Scanned stock-in",
        }),
      }).then(async (r) => {
        if (!r.ok) { const err = await r.json(); throw new Error(err.error) }
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] })
      toast.success(`${foundProduct!.name} — Stock added`)
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Scan Stock In</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {scanning && !foundProduct && !notFound && (
          <div className="space-y-4">
            <div
              id="scanner-element"
              className="overflow-hidden rounded-xl bg-black"
              style={{ minHeight: 240 }}
            />
            <p className="text-center text-xs text-gray-400">
              Point camera at a QR code or barcode
            </p>
            <button
              onClick={stopScanner}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel Scan
            </button>
          </div>
        )}

        {!scanning && !foundProduct && !notFound && !searching && (
          <div className="space-y-4">
            <div
              onClick={startScanner}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-12 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50"
            >
              <Camera className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Tap to start scanning</p>
              <p className="mt-1 text-xs text-gray-400">QR code or barcode</p>
            </div>

            <button
              onClick={() => setShowManual(true)}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Or enter barcode manually
            </button>

            {showManual && (
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

        {searching && (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="mt-3 text-sm text-gray-500">Looking up product...</p>
          </div>
        )}

        {notFound && (
          <div className="space-y-4">
            <div className="rounded-xl bg-yellow-50 p-4 text-center">
              <Package className="mx-auto mb-2 h-8 w-8 text-yellow-400" />
              <p className="text-sm font-medium text-yellow-700">Product not found</p>
              <p className="mt-1 text-xs text-yellow-600">Barcode: {scannedBarcode}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={resetScan} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Try Again
              </button>
              <button onClick={onClose} className="flex-1 rounded-xl bg-gray-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-600 transition-colors">
                Close
              </button>
            </div>
          </div>
        )}

        {foundProduct && (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 font-bold">
                  {foundProduct.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{foundProduct.name}</p>
                  <p className="text-xs text-emerald-600">{foundProduct.barcode}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">On hand</p>
                  <p className="text-sm font-bold text-gray-900">{foundProduct.stockQty} {foundProduct.unit}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Quantity to add</label>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="1"
                autoFocus
                min="1"
                step="1"
                className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="rounded-xl bg-gray-50 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Current stock</span>
                <span className="font-medium">{foundProduct.stockQty} {foundProduct.unit}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-gray-500">After adding</span>
                <span className="font-semibold text-gray-900">
                  {foundProduct.stockQty + (parseFloat(qty) || 0)} {foundProduct.unit}
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Supplier delivery"
                className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={resetScan} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Scan Another
              </button>
              <button
                onClick={() => adjustMutation.mutate()}
                disabled={!qty || adjustMutation.isPending}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
              >
                {adjustMutation.isPending ? "Adding..." : "Add Stock"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
