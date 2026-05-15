"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

type ThemeStore = {
  dark: boolean
  toggle: () => void
  setDark: (dark: boolean) => void
}

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark)
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      dark: false,
      toggle: () =>
        set((state) => {
          const next = !state.dark
          applyTheme(next)
          return { dark: next }
        }),
      setDark: (dark: boolean) => {
        applyTheme(dark)
        set({ dark })
      },
    }),
    { name: "quantinda-theme" }
  )
)

if (typeof window !== "undefined") {
  const stored = localStorage.getItem("quantinda-theme")
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      applyTheme(parsed.state?.dark ?? false)
    } catch {
      applyTheme(false)
    }
  }
}
