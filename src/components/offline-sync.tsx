"use client"

import { useEffect } from "react"
import { useOnline } from "@/hooks/use-online"
import { syncPendingSales, setupPeriodicSync } from "@/services/sync"

export function OfflineSync() {
  const isOnline = useOnline()

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!isOnline) return

    syncPendingSales()

    const cleanup = setupPeriodicSync()
    return () => {
      cleanup.then((fn) => fn())
    }
  }, [isOnline])

  return null
}
