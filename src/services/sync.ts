import { getPendingSales, removePendingSale } from "@/lib/db"
import { toast } from "sonner"

export async function syncPendingSales() {
  const pending = await getPendingSales()
  if (pending.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  for (const sale of pending) {
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: sale.items.map((i) => ({
            productId: i.productId,
            qty: i.qty,
            price: i.price,
          })),
          tendered: sale.tendered,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        if (err.error?.includes("stock") || err.error?.includes("not found")) {
          await removePendingSale(sale.id!)
          failed++
        } else {
          failed++
        }
        continue
      }

      await removePendingSale(sale.id!)
      synced++
    } catch {
      failed++
    }
  }

  return { synced, failed }
}

export async function setupPeriodicSync() {
  const sync = async () => {
    const pending = await getPendingSales()
    if (pending.length === 0) return

    const result = await syncPendingSales()
    if (result.synced > 0) {
      toast.success(`${result.synced} pending sale(s) synced`)
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} sale(s) failed to sync`)
    }
  }

  sync()

  const interval = setInterval(sync, 30_000)
  return () => clearInterval(interval)
}
