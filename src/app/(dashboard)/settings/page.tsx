"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Users, Shield, UserCog, Trash2, X } from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"
import { toast } from "sonner"

type User = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

type UserForm = {
  name: string
  email: string
  password: string
  pin: string
  role: string
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const { isSuperAdmin } = usePermissions()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<UserForm>({ name: "", email: "", password: "", pin: "", role: "CASHIER" })

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
    enabled: isSuperAdmin,
  })

  const createUser = useMutation({
    mutationFn: (data: UserForm) =>
      fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.error) }
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setFormOpen(false)
      resetForm()
      toast.success("User created")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserForm & { isActive: boolean }> }) =>
      fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.error) }
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setFormOpen(false)
      resetForm()
      toast.success("User updated")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/users/${id}`, { method: "DELETE" }).then(async (r) => {
        if (!r.ok) { const e = await r.json(); throw new Error(e.error) }
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("User deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function resetForm() {
    setForm({ name: "", email: "", password: "", pin: "", role: "CASHIER" })
    setEditingId(null)
  }

  function openEdit(user: User) {
    setEditingId(user.id)
    setForm({ name: user.name, email: user.email, password: "", pin: "", role: user.role })
    setFormOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editingId) {
      const data: Partial<UserForm & { isActive: boolean }> = { name: form.name, email: form.email, role: form.role }
      if (form.password) data.password = form.password
      if (form.pin) data.pin = form.pin
      updateUser.mutate({ id: editingId, data })
    } else {
      createUser.mutate(form)
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
          <Shield className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="mt-1 text-sm text-gray-400">Only SUPER_ADMIN can access settings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage users and store configuration</p>
        </div>
        <button
          onClick={() => { resetForm(); setFormOpen(true) }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-200 transition-all hover:shadow-xl"
        >
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        ) : users?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="mb-3 h-12 w-12 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">No users yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users?.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-amber-600">
                          {user.name.charAt(0)}
                        </div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        <UserCog className="h-3 w-3" />
                        {user.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(user)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this user?")) deleteUser.mutate(user.id)
                          }}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-12">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit User" : "Add User"}
              </h2>
              <button onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password {editingId && <span className="text-gray-400 font-normal">(leave blank to keep)</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingId}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PIN (optional)</label>
                <input
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value })}
                  maxLength={4}
                  placeholder="4-digit PIN"
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                >
                  <option value="CASHIER">Cashier</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUser.isPending || updateUser.isPending}
                  className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-200 transition-all hover:shadow-xl disabled:opacity-50"
                >
                  {editingId ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
