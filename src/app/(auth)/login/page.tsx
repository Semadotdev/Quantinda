"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ShoppingBag, Eye, EyeOff, KeyRound } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [usePin, setUsePin] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const credentials: Record<string, string> = { email }

    if (usePin) {
      credentials.pin = password
    } else {
      credentials.password = password
    }

    const result = await signIn("credentials", {
      ...credentials,
      redirect: false,
    })

    if (result?.error) {
      setError(usePin ? "Invalid email or PIN" : "Invalid email or password")
      setLoading(false)
    } else {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/logo-text.png"
            alt="Quantinda"
            className="mx-auto mb-4 h-24 w-auto object-contain"
          />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-xl shadow-gray-200/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@store.com"
                required
                className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    {usePin ? "PIN" : "Password"}
                  </label>
                  <button
                    type="button"
                    onClick={() => { setUsePin(!usePin); setPassword(""); setError("") }}
                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
                  >
                    <KeyRound className="h-3 w-3" />
                    {usePin ? "Use password" : "Use PIN"}
                  </button>
                </div>
                <div className="relative mt-1">
                  <input
                    id="password"
                    type={showPassword ? "text" : usePin ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      if (usePin) {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 4)
                        setPassword(val)
                      } else {
                        setPassword(e.target.value)
                      }
                    }}
                    placeholder={usePin ? "••••" : "••••••••"}
                    required
                    maxLength={usePin ? 4 : undefined}
                    inputMode={usePin ? "numeric" : "text"}
                    className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:shadow-xl hover:shadow-emerald-300 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Quantinda v1.0 — Smart Sari-Sari Store Management
        </p>
      </div>
    </div>
  )
}
