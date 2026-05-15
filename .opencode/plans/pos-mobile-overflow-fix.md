# POS Mobile Overflow Fix

## Problem
Removing `-m-6` (negative margin) from the POS outer div shifted the POS from starting at main's border to starting within main's `p-6` padding. The old height `h-[calc(100dvh-56px)]` only accounted for the 56px header, missing the 48px of main padding (24px top + 24px bottom). This made the POS 48px taller than the available space, causing:

1. **Vertical overflow** — POS > viewport
2. **Scrollbar appears** — reduces content width  
3. **Horizontal overflow** — everything shifts right
4. **Header appears to overflow** — the whole layout feels broken

## Fix
Change POS outer div height on mobile from `calc(100dvh-56px)` to `calc(100dvh-104px)`.

104px = 56px (header `h-14`) + 48px (main `p-6` padding top + bottom).

**File**: `src/app/(dashboard)/pos/page.tsx`
**Line**: ~309

**Change:**
```
// Current (broken):
<div className="flex flex-col lg:flex-row lg:h-[calc(100dvh-5rem)]">

// Fixed:
<div className="flex flex-col lg:flex-row h-[calc(100dvh-104px)] lg:h-[calc(100dvh-5rem)]">
```

Keeps desktop height unchanged (`lg:h-[calc(100dvh-5rem)]`).

## Previous changes (already applied)
1. Removed `h-[calc(100dvh-56px)]` from outer div — ✅ done
2. Changed `overflow-hidden` → `lg:overflow-hidden` on inner div — ✅ done
3. Added `truncate` to header store name — ✅ done

## Remaining
This single line-height fix is the remaining step to resolve the overflow issue. No other changes needed.
