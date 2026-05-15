# Quantinda — Smart Sari-Sari Store POS & Inventory

A modern, mobile-responsive point-of-sale and inventory management system built for sari-sari stores in the Philippines. Features barcode scanning, offline support, sales analytics, and multi-store management.

## Features

- **POS Terminal** — Barcode scanner integration (camera-based), mobile-responsive cart, receipt generation, offline sale queuing
- **Inventory Management** — Stock tracking, low stock alerts with header badge, adjustment history, stock-in/stock-out logging
- **Purchases** — Purchase order creation and receiving with multi-item support
- **Sales Analytics** — Revenue charts, top products, daily trends, tag-based filtering, profit margin tracking
- **Role-based Access** — SUPER_ADMIN, ADMIN, CASHIER, and TESTER roles with granular permissions
- **Multi-store** — Separate branches with isolated data per store
- **Tags** — Flexible product labeling with filtering across products, POS, and reports
- **Categories** — Product categorization with full CRUD
- **Offline Support** — IndexedDB caching for products, sale queuing for offline transactions
- **Responsive Design** — Mobile-first with adaptive layouts (cards on mobile, tables on desktop)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | TypeScript |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Database** | [Neon](https://neon.tech/) Serverless PostgreSQL |
| **ORM** | [Prisma 7](https://www.prisma.io/) |
| **Auth** | [NextAuth.js v5](https://next-auth.js.org/) (JWT) |
| **State** | [TanStack Query](https://tanstack.com/query/latest) + [Zustand](https://github.com/pmndrs/zustand) |
| **Offline** | [Dexie.js](https://dexie.org/) (IndexedDB) |
| **Barcode** | [html5-qrcode](https://github.com/mebjas/html5-qrcode) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Icons** | [Lucide](https://lucide.dev/) |
| **Forms** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| **Deployment** | [Vercel](https://vercel.com/) |

## Screenshots

<!-- Add screenshots here:
![POS Terminal](screenshots/pos.png)
![Inventory](screenshots/inventory.png)
![Sales Reports](screenshots/sales.png)
-->

## Demo Accounts

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Tester** | tester@quantinda.com | tester123 | Full access to isolated demo data |

> The **Tester** account operates in a completely separate **Demo Store**. All data created by the tester is isolated from the main store's data and can be reset anytime with `npm run db:demo-reset`.

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL (or use [Neon](https://neon.tech/) for cloud)

### 1. Clone and install

```bash
git clone https://github.com/Semadotdev/quantinda.git
cd quantinda
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Set `DATABASE_URL` to your PostgreSQL connection string. For local development with Prisma Dev:

```env
DATABASE_URL="postgresql://..."
```

### 3. Generate Prisma client and push schema

```bash
npm run db:generate
npm run db:push
```

### 4. Seed the database

```bash
npm run db:seed
```

This creates:
- **Main Branch** store with sample products, categories, and tags
- **Demo Store** with separate prototype data and sample sales
- Four user accounts (admin, cashier, manager, tester)

### 5. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note for WSL2 users:** Camera hardware is not accessible inside WSL2. Open the app in your Windows browser and it will work.

### Reset Demo Data

```bash
npm run db:demo-reset
```

Deletes all Demo Store data and re-seeds fresh sample data. Safe to run anytime — only affects the Demo Store.

## Project Structure

```
src/
├── app/
│   ├── (auth)/login          # Login page
│   ├── (dashboard)/
│   │   ├── page.tsx          # Dashboard overview
│   │   ├── pos/              # POS terminal
│   │   ├── products/         # Product catalog
│   │   ├── inventory/        # Stock overview + history
│   │   ├── purchases/        # Purchase orders
│   │   ├── suppliers/        # Supplier management
│   │   ├── sales/            # Sales analytics & reports
│   │   └── settings/         # Users, categories, tags, stores
│   └── api/                  # REST API routes
├── components/
│   ├── layout/               # Header, sidebar, dashboard layout
│   ├── products/             # Product form, category manager
│   ├── inventory/            # Scan stock dialog
│   └── ui/                   # Reusable UI components
├── hooks/                    # TanStack Query hooks
├── lib/                      # Utilities, permissions, Prisma client
├── stores/                   # Zustand stores (theme, etc.)
└── generated/prisma/         # Generated Prisma client
```

## Deployment

This app is designed to deploy seamlessly to Vercel with Neon PostgreSQL.

### 1. Set up Neon

Create a project at [neon.tech](https://neon.tech/). Get two connection strings:
- **Pooled URL** → `DATABASE_URL` (for serverless connection pooling)
- **Direct URL** → `DIRECT_URL` (for Prisma migrations)

### 2. Deploy to Vercel

```bash
vercel
```

Set environment variables in the Vercel dashboard:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon pooled connection string |
| `DIRECT_URL` | Neon direct connection string |
| `NEXTAUTH_URL` | Your Vercel deployment URL |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |

### 3. Push schema and seed

```bash
npm run db:push
npm run db:seed
```

## Architecture

### Data Isolation

All data is scoped by `storeId`. Each user belongs to a store and can only access data within that store. The Demo Store provides a safe sandbox for testing.

### Permission System

Four roles with granular permissions:
- **SUPER_ADMIN** — all permissions including store and user management
- **ADMIN** — all permissions except user and store management
- **CASHIER** — POS, view products and inventory
- **TESTER** — same as ADMIN but restricted to the Demo Store

### Offline Support

Products are cached in IndexedDB via Dexie.js. When offline, the POS uses cached data and queues sales for syncing when connectivity returns.

## License

MIT
