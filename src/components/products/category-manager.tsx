"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/use-categories"

export function CategoryManager() {
  const { data: categories, isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [showAdd, setShowAdd] = useState(false)

  async function handleCreate() {
    if (!newName.trim()) return
    await createCategory.mutateAsync({ name: newName.trim() })
    setNewName("")
    setShowAdd(false)
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return
    await updateCategory.mutateAsync({ id, name: editName.trim() })
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    if (confirm("Delete this category? Products will be uncategorized.")) {
      await deleteCategory.mutateAsync(id)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Categories</h3>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {showAdd && (
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Category name"
            className="block w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            autoFocus
          />
          <button
            onClick={handleCreate}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => { setShowAdd(false); setNewName("") }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-gray-400 py-2">Loading...</div>
      ) : categories?.length === 0 ? (
        <div className="text-sm text-gray-400 py-2">No categories yet</div>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {categories?.map((cat) => (
            <div
              key={cat.id}
              className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              {editingId === cat.id ? (
                <div className="flex gap-2 w-full">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(cat.id)}
                    className="block w-full rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(cat.id)}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">{cat.name}</span>
                    <span className="text-xs text-gray-400">
                      ({cat._count.products})
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingId(cat.id); setEditName(cat.name) }}
                      className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
