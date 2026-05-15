import { DefaultSession, DefaultUser } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      storeId: string
      storeName: string
      storeCode: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    storeId: string
    storeName: string
    storeCode: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    storeId: string
    storeName: string
    storeCode: string
  }
}
