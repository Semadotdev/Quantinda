# Low Stock Notification: Mobile Modal / Desktop Dropdown

## File
`src/components/layout/header.tsx`

## Changes

### 1. Add `X` to lucide imports (line 14)
```typescript
import {
  LogOut,
  ChevronDown,
  Moon,
  Sun,
  Bell,
  AlertTriangle,
  ArrowRight,
  X,
} from "lucide-react"
```

### 2. Replace the current low stock panel (~line 68-121) with dual render

Current structure (lines 68-121):
```
{lowStockOpen && (
  <>
    <div className="fixed inset-0 z-10" onClick={...} />
    <div className="absolute right-0 top-full z-20 mt-1 w-72 ...">
      ...
    </div>
  </>
)}
```

Replace with responsive split:

```tsx
{lowStockOpen && (
  <>
    {/* Shared backdrop */}
    <div
      className="fixed inset-0 z-10"
      onClick={() => setLowStockOpen(false)}
    />

    {/* Mobile modal (hidden on sm+) */}
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 sm:hidden">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Low Stock Alerts
            {lowStock && lowStock.count > 0 && (
              <span className="ml-1 font-normal text-gray-400">({lowStock.count})</span>
            )}
          </p>
          <button
            onClick={() => setLowStockOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <LowStockContent />
        <div className="border-t border-gray-100 dark:border-gray-700">
          <Link
            href="/inventory"
            onClick={() => setLowStockOpen(false)}
            className="flex items-center justify-between rounded-b-2xl px-4 py-3 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          >
            View in Inventory
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>

    {/* Desktop dropdown (hidden on mobile) */}
    <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50 max-sm:hidden dark:border-gray-700 dark:bg-gray-900 dark:shadow-gray-900/50">
      <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Low Stock Alerts
          {lowStock && lowStock.count > 0 && (
            <span className="ml-1 font-normal text-gray-400">({lowStock.count})</span>
          )}
        </p>
      </div>
      <LowStockContent />
      <div className="border-t border-gray-100 dark:border-gray-700">
        <Link
          href="/inventory"
          onClick={() => setLowStockOpen(false)}
          className="flex items-center justify-between rounded-b-xl px-4 py-2.5 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
        >
          View in Inventory
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </>
)}
```

Where `<LowStockContent />` is the shared product list (extracted to avoid duplication):

```tsx
{lowStock && lowStock.products.length > 0 ? (
  <div className="max-h-60 overflow-y-auto">
    {lowStock.products.map((p) => (
      <div
        key={p.id}
        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {p.name}
          </p>
          <p className="text-xs text-gray-400">
            {p.stockQty} / {p.reorderLevel} {p.unit}
          </p>
        </div>
      </div>
    ))}
  </div>
) : (
  <div className="px-4 py-6 text-center">
    <p className="text-sm text-gray-400">All products are well-stocked</p>
  </div>
)}
```

The content is duplicated across both versions since extracting it into a separate component or variable isn't worth it for such a small amount of JSX. Both versions share the same content block, just wrapped in different container elements.
