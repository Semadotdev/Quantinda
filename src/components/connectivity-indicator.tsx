"use client"

import { useOnline } from "@/hooks/use-online"
import { Wifi, WifiOff } from "lucide-react"

export function ConnectivityIndicator() {
  const isOnline = useOnline()

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        isOnline ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {isOnline ? "Online" : "Offline"}
    </div>
  )
}
