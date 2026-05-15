"use client"

import { useState } from "react"
import { Plus, Truck, Pencil, Trash2, Phone, Mail, MapPin } from "lucide-react"
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, type Supplier } from "@/hooks/use-suppliers"

export default function SuppliersPage() {
  const { data: suppliers, isLoading } = useSuppliers()
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()
  const deleteSupplier = useDeleteSupplier()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: string; name: string; contact: string; phone: string; email: string; address: string } | null>(null)
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")

  function openCreate() {
    setEditing(null)
    setName(""); setContact(""); setPhone(""); setEmail(""); setAddress("")
    setFormOpen(true)
  }

  function openEdit(s: Supplier) {
    setEditing({ id: s.id, name: s.name || "", contact: s.contact || "", phone: s.phone || "", email: s.email || "", address: s.address || "" })
    setName(s.name); setContact(s.contact || ""); setPhone(s.phone || ""); setEmail(s.email || ""); setAddress(s.address || "")
    setFormOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = { name, contact, phone, email, address }
    if (editing) {
      await updateSupplier.mutateAsync({ id: editing.id, ...data })
    } else {
      await createSupplier.mutateAsync(data)
    }
    setFormOpen(false)
  }

  async function handleDelete(id: string) {
    if (confirm("Delete this supplier?")) await deleteSupplier.mutateAsync(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your suppliers</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl">
          <Plus className="h-4 w-4" /> Add Supplier
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" /></div>
        ) : suppliers?.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <Truck className="mb-3 h-12 w-12 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">No suppliers yet</p>
          </div>
        ) : (
          suppliers?.map((supplier) => (
            <div key={supplier.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                  <Truck className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(supplier)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(supplier.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <h3 className="mt-3 text-base font-semibold text-gray-900">{supplier.name}</h3>
              {supplier.contact && <p className="mt-0.5 text-sm text-gray-500">{supplier.contact}</p>}
              <div className="mt-3 space-y-1.5">
                {supplier.phone && <p className="flex items-center gap-2 text-sm text-gray-500"><Phone className="h-3.5 w-3.5 text-gray-300" />{supplier.phone}</p>}
                {supplier.email && <p className="flex items-center gap-2 text-sm text-gray-500"><Mail className="h-3.5 w-3.5 text-gray-300" />{supplier.email}</p>}
                {supplier.address && <p className="flex items-center gap-2 text-sm text-gray-500"><MapPin className="h-3.5 w-3.5 text-gray-300" />{supplier.address}</p>}
              </div>
              <div className="mt-4 border-t border-gray-50 pt-3">
                <p className="text-xs text-gray-400">{supplier._count.purchaseOrders} purchase order(s)</p>
              </div>
            </div>
          ))
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{editing ? "Edit Supplier" : "Add Supplier"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input value={name} onChange={(e) => setName(e.target.value)} required className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label><input value={contact} onChange={(e) => setContact(e.target.value)} className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 resize-none" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-50">
                  {editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
