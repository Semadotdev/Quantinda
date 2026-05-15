# Quantinda — Smart Sari-Sari Store POS & Inventory

## Tech Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4 + shadcn/ui
- Prisma 7 + PostgreSQL (Neon on Vercel)
- NextAuth.js v5
- TanStack Query + Zustand
- Lucide Icons

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — Lint
- `npm run db:push` — Push schema to DB
- `npm run db:seed` — Seed database
- `npm run db:studio` — Open Prisma Studio

## Prisma
Uses `prisma-client` generator outputting to `src/generated/prisma`.
Import: `import { PrismaClient } from "@/generated/prisma/client"`
Uses `PrismaPg` adapter for connection pooling.

## Database
Local dev: Prisma Dev (embedded PostgreSQL)
Production: Neon (serverless PostgreSQL via Vercel)

## Auth
NextAuth.js v5 with JWT strategy.
Login: email/password or PIN.
Roles: SUPER_ADMIN, ADMIN, CASHIER.

## Project Structure
- `src/app/(auth)/login` — Login page
- `src/app/(dashboard)/` — Authenticated pages
- `src/components/` — UI components
- `src/lib/auth.ts` — NextAuth config
- `src/lib/prisma.ts` — Prisma client singleton
- `src/proxy.ts` — Edge proxy (middleware replacement)
- `prisma/schema.prisma` — Database schema
