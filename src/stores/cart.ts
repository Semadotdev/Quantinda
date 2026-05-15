import { create } from "zustand"

export type CartItem = {
  productId: string
  name: string
  barcode: string | null
  price: number
  cost: number
  unit: string
  qty: number
  subtotal: number
}

type CartStore = {
  items: CartItem[]
  addItem: (product: {
    id: string
    name: string
    barcode: string | null
    price: number
    cost: number
    unit: string
  }) => void
  updateQty: (productId: string, qty: number) => void
  removeItem: (productId: string) => void
  clearCart: () => void
  subtotal: () => number
  itemCount: () => number
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product) =>
    set((state) => {
      const existing = state.items.find(
        (item) => item.productId === product.id
      )
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  qty: item.qty + 1,
                  subtotal: (item.qty + 1) * item.price,
                }
              : item
          ),
        }
      }
      return {
        items: [
          ...state.items,
          {
            productId: product.id,
            name: product.name,
            barcode: product.barcode,
            price: product.price,
            cost: product.cost,
            unit: product.unit,
            qty: 1,
            subtotal: product.price,
          },
        ],
      }
    }),

  updateQty: (productId, qty) =>
    set((state) => {
      if (qty <= 0) {
        return {
          items: state.items.filter(
            (item) => item.productId !== productId
          ),
        }
      }
      return {
        items: state.items.map((item) =>
          item.productId === productId
            ? { ...item, qty, subtotal: qty * item.price }
            : item
        ),
      }
    }),

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.productId !== productId),
    })),

  clearCart: () => set({ items: [] }),

  subtotal: () => get().items.reduce((sum, item) => sum + item.subtotal, 0),

  itemCount: () => get().items.reduce((sum, item) => sum + item.qty, 0),
}))
