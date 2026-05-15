import Dexie, { type Table } from "dexie"

export type OfflineProduct = {
  id: string
  name: string
  barcode: string | null
  price: number
  cost: number
  unit: string
  stockQty: number
  categoryName: string | null
  updatedAt: string
}

export type PendingSale = {
  id?: string
  items: {
    productId: string
    name: string
    price: number
    qty: number
    subtotal: number
  }[]
  total: number
  tendered: number
  createdAt: string
  syncedAt?: string
}

class OfflineDB extends Dexie {
  products!: Table<OfflineProduct, string>
  pendingSales!: Table<PendingSale, string>

  constructor() {
    super("quantinda-offline")
    this.version(1).stores({
      products: "id, name, barcode, updatedAt",
      pendingSales: "++id, createdAt",
    })
  }
}

export const db = new OfflineDB()

export async function cacheProducts(products: OfflineProduct[]) {
  await db.products.bulkPut(products)
}

export async function getCachedProducts() {
  return db.products.orderBy("name").toArray()
}

export async function searchCachedProducts(query: string) {
  return db.products
    .filter((p) => {
      const matchName = p.name.toLowerCase().includes(query.toLowerCase())
      const matchBarcode = p.barcode ? p.barcode.includes(query) : false
      return matchName || matchBarcode
    })
    .toArray()
}

export async function queueSale(sale: Omit<PendingSale, "createdAt">) {
  await db.pendingSales.add({
    ...sale,
    createdAt: new Date().toISOString(),
  })
}

export async function getPendingSales() {
  return db.pendingSales.orderBy("createdAt").toArray()
}

export async function removePendingSale(id: string) {
  await db.pendingSales.delete(id)
}
