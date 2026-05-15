import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "./prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { store: true },
        })

        if (!user || !user.isActive) return null

        if (credentials.pin) {
          if (user.pin !== credentials.pin) return null
        } else {
          const isValid = await compare(
            credentials.password as string,
            user.password
          )
          if (!isValid) return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          storeId: user.storeId,
          storeName: user.store.name,
          storeCode: user.store.code,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.storeId = user.storeId
        token.storeName = user.storeName
        token.storeCode = user.storeCode
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.storeId = token.storeId as string
        session.user.storeName = token.storeName as string
        session.user.storeCode = token.storeCode as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
})
