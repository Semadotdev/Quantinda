export type Role = "SUPER_ADMIN" | "ADMIN" | "CASHIER"

export type Permission =
  | "products.manage"
  | "products.view"
  | "inventory.adjust"
  | "inventory.view"
  | "purchases.manage"
  | "purchases.view"
  | "suppliers.manage"
  | "suppliers.view"
  | "sales.view"
  | "sales.reports"
  | "users.manage"
  | "settings.view"
  | "pos.use"
  | "categories.manage"
  | "stores.manage"

const rolePermissions: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "products.manage",
    "products.view",
    "inventory.adjust",
    "inventory.view",
    "purchases.manage",
    "purchases.view",
    "suppliers.manage",
    "suppliers.view",
    "sales.view",
    "sales.reports",
    "users.manage",
    "settings.view",
    "pos.use",
    "categories.manage",
    "stores.manage",
  ],
  ADMIN: [
    "products.manage",
    "products.view",
    "inventory.adjust",
    "inventory.view",
    "purchases.manage",
    "purchases.view",
    "suppliers.manage",
    "suppliers.view",
    "sales.view",
    "sales.reports",
    "pos.use",
    "categories.manage",
  ],
  CASHIER: [
    "products.view",
    "inventory.view",
    "sales.view",
    "pos.use",
  ],
}

export function hasPermission(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false
  return rolePermissions[role]?.includes(permission) ?? false
}

export function can(role: Role | undefined): (permission: Permission) => boolean {
  return (permission: Permission) => hasPermission(role, permission)
}
