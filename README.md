# WBL-WH · Whirlpool Bangladesh WMS

A production-grade Warehouse Management System for Whirlpool Bangladesh operations.

![Tech](https://img.shields.io/badge/Next.js-16-black) ![Tech](https://img.shields.io/badge/Prisma-6-blue) ![Tech](https://img.shields.io/badge/Supabase-PostgreSQL-green) ![Tech](https://img.shields.io/badge/Cloudflare-Pages-orange) ![License](https://img.shields.io/badge/license-MIT-brightgreen)

## Features

- **Dashboard** — live KPIs, low-stock alerts, recent activity
- **Inventory** — stock levels, movement ledger, adjustments
- **Catalog & Parties** — products, dealers, sourcing, warehouses, transport/courier vendors
- **Inbound (GRN)** — purchase orders, goods receipt, quality check
- **Outbound (Dispatch)** — pick → scan → invoice → dispatch → POD with partial delivery
- **Reports** — stock valuation, movements, sales & purchase summaries (PDF + Excel + CSV)
- **User Management** — RBAC with 4 system roles + custom roles
- **Audit Log** — immutable activity trail with filtering & export

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | Next.js API Routes (Node.js runtime) |
| Database | Prisma ORM + Supabase PostgreSQL (production) / SQLite (local dev) |
| Auth | Custom JWT session with bcrypt password hashing |
| Hosting | Cloudflare Pages (with `@cloudflare/next-on-pages`) |
| Charts | Recharts |
| Icons | Lucide |

## Quick Start (Local Dev)

```bash
# 1. Install dependencies
bun install

# 2. Copy environment template
cp .env.example .env
# Edit .env — keep DATABASE_URL=file:./db/custom.db for local SQLite

# 3. Generate Prisma client & push schema
bun run db:generate
bun run db:push

# 4. Seed demo data
bun run scripts/seed.ts

# 5. Start dev server
bun run dev
# Open http://localhost:3000
# Login: admin@whirlpool-bd.com / admin123
```

## Production Deployment

See **[PRODUCTION_AUDIT.md](./PRODUCTION_AUDIT.md)** for the complete checklist.

### TL;DR

1. **Supabase:** Create project → SQL Editor → paste `supabase/migration.sql` → Run
2. **Prisma:** Change provider to `postgresql` in `prisma/schema.prisma`
3. **Cloudflare Pages:**
   - Connect this GitHub repo
   - Build command: `bun run build:cf`
   - Output dir: `.vercel/output/static`
   - Compatibility flag: `nodejs_compat`
   - Set env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

See **[SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md)** for step-by-step.

## Security

- ✅ `.env` is git-ignored (only `.env.example` is committed)
- ✅ Row Level Security (RLS) enabled on every Supabase table
- ✅ Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ bcrypt password hashing (cost factor 10)
- ✅ HTTP-only auth cookies
- ✅ RBAC enforced at module, action, and API layer
- ✅ Audit Log records every mutation (immutable)

**⚠️ Change the default admin password (`admin123`) immediately after first login.**

## Documentation

- [Production Audit Checklist](./PRODUCTION_AUDIT.md)
- [Supabase Migration Guide](./SUPABASE_MIGRATION.md)
- [PDF / Export Audit Report](./PDF_AUDIT_REPORT.md)

## License

MIT © Whirlpool Bangladesh
