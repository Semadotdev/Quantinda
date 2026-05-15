"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Users, Shield, UserCog, Trash2, X, Package, Building2, Pencil, Tag } from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"
import { ConfirmModal } from "@/components/ui/confirm-modal"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type User = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  store?: { id: string; name: string }
}

type UserForm = { name: string; email: string; password: string; pin: string; role: string; storeId: string }

type Category = {
  id: string
  name: string
  description: string | null
  _count: { products: number }
}

type Store = {
  id: string
  name: string
  code: string
  address: string | null
  currency: string
  taxRate: number
  receiptFooter: string | null
  isActive: boolean
  _count: { users: number; products: number }
}

export default function SettingsPage() {
  const { isAdmin, isSuperAdmin, can } = usePermissions()
  const [tab, setTab] = useState("users")

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
          <Shield className="h-8 w-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
        <p className="mt-1 text-sm text-gray-400">Only admins can access settings.</p>
      </div>
    )
  }

  const tabs = [
    { id: "users", label: "Users", icon: Users },
    { id: "categories", label: "Categories", icon: Package },
    { id: "tags", label: "Tags", icon: Tag },
    ...(isSuperAdmin ? [{ id: "stores", label: "Stores", icon: Building2 }] : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage users, categories, and stores</p>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-gray-50 p-1 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors shrink-0",
                tab === t.id
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === "users" && <UserSection />}
      {tab === "categories" && <CategorySection />}
      {tab === "tags" && <TagSection />}
      {tab === "stores" && <StoreSection />}
    </div>
  )
}

function UserSection() {
  const queryClient = useQueryClient()
  const { isSuperAdmin } = usePermissions()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<UserForm>({ name: "", email: "", password: "", pin: "", role: "CASHIER", storeId: "" })
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)

  const { data: usersData, isLoading } = useQuery<{ users: User[]; total: number; page: number; limit: number }>({
    queryKey: ["users", page, limit],
    queryFn: () => fetch(`/api/users?page=${page}&limit=${limit}`).then((r) => r.json()),
    enabled: isSuperAdmin,
  })
  const users = usersData?.users
  const total = usersData?.total ?? 0

  const { data: stores } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: () => fetch("/api/stores").then((r) => r.json()),
    enabled: isSuperAdmin,
  })

  const createUser = useMutation({
    mutationFn: (data: UserForm) =>
      fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setFormOpen(false); resetForm(); toast.success("User created") },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserForm & { isActive: boolean }> }) =>
      fetch(`/api/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setFormOpen(false); resetForm(); toast.success("User updated") },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/users/${id}`, { method: "DELETE" }).then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("User deleted") },
    onError: (err: Error) => toast.error(err.message),
  })

  function resetForm() { setForm({ name: "", email: "", password: "", pin: "", role: "CASHIER", storeId: "" }); setEditingId(null) }

  function openEdit(user: User) { setEditingId(user.id); setForm({ name: user.name, email: user.email, password: "", pin: "", role: user.role, storeId: user.store?.id || "" }); setFormOpen(true) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...form }
    if (!payload.storeId) delete (payload as any).storeId
    if (editingId) {
      const data: any = { name: payload.name, email: payload.email, role: payload.role }
      if (payload.storeId) data.storeId = payload.storeId
      if (payload.password) data.password = payload.password
      if (payload.pin) data.pin = payload.pin
      updateUser.mutate({ id: editingId, data })
    } else {
      createUser.mutate(payload)
    }
  }

  if (!isSuperAdmin) return null

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">Manage user accounts and roles</p>
        <button onClick={() => { resetForm(); setFormOpen(true) }} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl">
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>
        ) : users?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center"><Users className="mb-3 h-12 w-12 text-gray-200" /><p className="text-sm font-medium text-gray-500">No users yet</p></div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Store</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users?.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-600">{user.name.charAt(0)}</div><p className="text-sm font-medium text-gray-900">{user.name}</p></div></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{user.store?.name || "—"}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600"><UserCog className="h-3 w-3" />{user.role.replace("_", " ")}</span></td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{user.isActive ? "Active" : "Inactive"}</span></td>
                      <td className="px-4 py-3 text-right"><div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(user)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setDeleteUserId(user.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {users?.map((user) => (
                <div key={user.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 text-sm font-bold text-emerald-600">{user.name.charAt(0)}</div>
                      <div className="min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{user.name}</p><p className="text-xs text-gray-400 truncate">{user.email}</p>{user.store?.name && <p className="text-xs text-gray-400 truncate mt-0.5">{user.store.name}</p>}</div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => openEdit(user)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setDeleteUserId(user.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600"><UserCog className="h-3 w-3" />{user.role.replace("_", " ")}</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{user.isActive ? "Active" : "Inactive"}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {total > limit && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Show</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
              className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="10">10</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="text-sm text-gray-400">entries</span>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-400">
              Page {page} of {Math.ceil(total / limit)}
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
                disabled={page >= Math.ceil(total / limit)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteUserId}
        title="Delete User"
        message="Delete this user?"
        onConfirm={() => {
          if (deleteUserId) deleteUser.mutate(deleteUserId)
          setDeleteUserId(null)
        }}
        onCancel={() => setDeleteUserId(null)}
        loading={deleteUser.isPending}
      />

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-12">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit User" : "Add User"}</h2>
              <button onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Password {editingId && <span className="text-gray-400 font-normal">(leave blank to keep)</span>}</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingId} className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></div>
              <div><label className="block text-sm font-medium text-gray-700">PIN (optional)</label><input value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} maxLength={4} placeholder="4-digit PIN" className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Role</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"><option value="CASHIER">Cashier</option><option value="ADMIN">Admin</option><option value="SUPER_ADMIN">Super Admin</option></select></div>
              {stores && stores.length > 0 && (
                <div><label className="block text-sm font-medium text-gray-700">Store</label><select value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })} className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"><option value="">Select store...</option>{stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setFormOpen(false)} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={createUser.isPending || updateUser.isPending} className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50">{editingId ? "Save Changes" : "Create User"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function CategorySection() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  })

  const createCategory = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); setFormOpen(false); toast.success("Category created") },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateCategory = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      fetch(`/api/categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); setFormOpen(false); toast.success("Category updated") },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteCategory = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/categories/${id}`, { method: "DELETE" }).then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); toast.success("Category deleted") },
    onError: (err: Error) => toast.error(err.message),
  })

  function openCreate() { setEditingId(null); setName(""); setDescription(""); setFormOpen(true) }

  function openEdit(cat: Category) { setEditingId(cat.id); setName(cat.name); setDescription(cat.description || ""); setFormOpen(true) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editingId) {
      updateCategory.mutate({ id: editingId, data: { name, description: description || undefined } })
    } else {
      createCategory.mutate({ name, description: description || undefined })
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">Organize products into categories</p>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl">
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>
      ) : categories?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-gray-100 bg-white"><Package className="mb-3 h-12 w-12 text-gray-200" /><p className="text-sm font-medium text-gray-500">No categories yet</p></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories?.map((cat) => (
            <div key={cat.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50">
                  <Package className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(cat)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteCategoryId(cat.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-900">{cat.name}</h3>
              {cat.description && <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">{cat.description}</p>}
              <p className="mt-2 text-xs text-gray-400">{cat._count.products} product(s)</p>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteCategoryId}
        title="Delete Category"
        message="Delete this category?"
        onConfirm={() => {
          if (deleteCategoryId) deleteCategory.mutate(deleteCategoryId)
          setDeleteCategoryId(null)
        }}
        onCancel={() => setDeleteCategoryId(null)}
        loading={deleteCategory.isPending}
      />

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Category" : "Add Category"}</h2>
              <button onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input value={name} onChange={(e) => setName(e.target.value)} required className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setFormOpen(false)} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={createCategory.isPending || updateCategory.isPending} className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50">{editingId ? "Save" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

type TagData = {
  id: string
  name: string
  _count: { products: number }
}

function TagSection() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null)

  const { data: tags, isLoading } = useQuery<TagData[]>({
    queryKey: ["tags"],
    queryFn: () => fetch("/api/tags").then((r) => r.json()),
  })

  const createTag = useMutation({
    mutationFn: (data: { name: string }) =>
      fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tags"] }); setFormOpen(false); toast.success("Tag created") },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateTag = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      fetch(`/api/tags/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tags"] }); setFormOpen(false); toast.success("Tag updated") },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteTag = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/tags/${id}`, { method: "DELETE" }).then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tags"] }); toast.success("Tag deleted") },
    onError: (err: Error) => toast.error(err.message),
  })

  function openCreate() { setEditingId(null); setName(""); setFormOpen(true) }

  function openEdit(tag: TagData) { setEditingId(tag.id); setName(tag.name); setFormOpen(true) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editingId) {
      updateTag.mutate({ id: editingId, data: { name } })
    } else {
      createTag.mutate({ name })
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">Label products with tags for easy filtering and reporting</p>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl">
          <Plus className="h-4 w-4" /> Add Tag
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>
      ) : tags?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-gray-100 bg-white"><Tag className="mb-3 h-12 w-12 text-gray-200" /><p className="text-sm font-medium text-gray-500">No tags yet</p></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags?.map((tag) => (
            <div key={tag.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50">
                  <Tag className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(tag)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteTagId(tag.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-900">{tag.name}</h3>
              <p className="mt-2 text-xs text-gray-400">{tag._count.products} product(s)</p>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTagId}
        title="Delete Tag"
        message="Delete this tag? Products will keep their current tags."
        onConfirm={() => {
          if (deleteTagId) deleteTag.mutate(deleteTagId)
          setDeleteTagId(null)
        }}
        onCancel={() => setDeleteTagId(null)}
        loading={deleteTag.isPending}
      />

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Tag" : "Add Tag"}</h2>
              <button onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input value={name} onChange={(e) => setName(e.target.value)} required className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" placeholder="e.g. Diaper, Best Seller" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setFormOpen(false)} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={createTag.isPending || updateTag.isPending} className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50">{editingId ? "Save" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function StoreSection() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", code: "", address: "", currency: "PHP", taxRate: "0", receiptFooter: "" })
  const [deleteStoreId, setDeleteStoreId] = useState<string | null>(null)

  const { data: stores, isLoading } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: () => fetch("/api/stores").then((r) => r.json()),
  })

  const createStore = useMutation({
    mutationFn: (data: typeof form) =>
      fetch("/api/stores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, taxRate: parseFloat(data.taxRate) || 0 }) })
        .then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stores"] }); setFormOpen(false); resetForm(); toast.success("Store created") },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateStore = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form & { isActive: boolean }> }) =>
      fetch(`/api/stores/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, taxRate: data.taxRate !== undefined ? parseFloat(data.taxRate as string) || 0 : undefined }) })
        .then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stores"] }); setFormOpen(false); resetForm(); toast.success("Store updated") },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteStore = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/stores/${id}`, { method: "DELETE" }).then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error) }; return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stores"] }); toast.success("Store deleted") },
    onError: (err: Error) => toast.error(err.message),
  })

  function resetForm() { setForm({ name: "", code: "", address: "", currency: "PHP", taxRate: "0", receiptFooter: "" }); setEditingId(null) }

  function openCreate() { resetForm(); setFormOpen(true) }

  function openEdit(store: Store) {
    setEditingId(store.id)
    setForm({ name: store.name, code: store.code, address: store.address || "", currency: store.currency, taxRate: String(store.taxRate), receiptFooter: store.receiptFooter || "" })
    setFormOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editingId) {
      updateStore.mutate({ id: editingId, data: { ...form } })
    } else {
      createStore.mutate(form)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">Manage stores and branches</p>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl">
          <Plus className="h-4 w-4" /> Add Store
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>
      ) : stores?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-gray-100 bg-white"><Building2 className="mb-3 h-12 w-12 text-gray-200" /><p className="text-sm font-medium text-gray-500">No stores yet</p></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {stores?.map((store) => (
            <div key={store.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-purple-50">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{store.name}</h3>
                    <p className="text-xs text-gray-400">{store.code}{store.address ? ` · ${store.address}` : ""}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(store)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteStoreId(store.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
                <div className="flex gap-3 text-xs text-gray-400">
                  <span>{store._count.users} user(s)</span>
                  <span>{store._count.products} product(s)</span>
                </div>
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", store.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
                  {store.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteStoreId}
        title="Delete Store"
        message="Delete this store? This will also delete all associated data."
        onConfirm={() => {
          if (deleteStoreId) deleteStore.mutate(deleteStoreId)
          setDeleteStoreId(null)
        }}
        onCancel={() => setDeleteStoreId(null)}
        loading={deleteStore.isPending}
      />

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-12">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Store" : "Add Store"}</h2>
              <button onClick={() => { setFormOpen(false); resetForm() }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Code *</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="e.g. MNL-01" className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Currency</label><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"><option value="PHP">PHP</option><option value="USD">USD</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label><input type="number" step="0.01" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Receipt Footer</label><textarea value={form.receiptFooter} onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })} rows={2} className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none" placeholder="Thank you for your purchase!" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setFormOpen(false); resetForm() }} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={createStore.isPending || updateStore.isPending} className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50">{editingId ? "Save Changes" : "Create Store"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
