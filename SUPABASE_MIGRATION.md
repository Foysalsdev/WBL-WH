# Supabase PostgreSQL Migration Guide

## Overview
This guide walks you through migrating the WMS from local SQLite to Supabase PostgreSQL.

**Time required:** ~15 minutes
**Difficulty:** Easy (no code changes needed — just config)

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Fill in:
   - **Name:** `whirlpool-wms`
   - **Database Password:** (save this — you'll need it)
   - **Region:** Singapore (closest to Bangladesh)
   - **Plan:** Free (500MB database, sufficient for demo)
4. Wait ~2 minutes for provisioning

---

## Step 2: Get the Connection String

1. In Supabase dashboard → **Settings** → **Database**
2. Find **Connection string** → **URI** format
3. It looks like:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
4. Replace `[password]` with your database password

---

## Step 3: Update Prisma Schema

In `prisma/schema.prisma`, change line 12:

```prisma
# FROM:
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

# TO:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## Step 4: Update .env

In `.env`, replace:

```bash
# FROM:
DATABASE_URL=file:/home/z/my-project/db/custom.db

# TO:
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

---

## Step 5: Push Schema to Supabase

```bash
# Generate Prisma client for PostgreSQL
bun run db:generate

# Push schema to Supabase (creates all tables)
bun run db:push

# Seed demo data
bun run scripts/seed.ts
```

---

## Step 6: Verify

1. Go to Supabase dashboard → **Table Editor**
2. You should see all tables: User, Role, Permission, Customer, Supplier, Product, etc.
3. Run the app — it should work exactly the same, now on PostgreSQL

---

## Step 7: Deploy to Cloudflare Pages

### Option A: Cloudflare Pages (with adapter)

```bash
# Install Cloudflare adapter
bun add -D @cloudflare/next-on-pages

# Build for Cloudflare
npx @cloudflare/next-on-pages

# Deploy
npx wrangler pages deploy .vercel/output/static
```

### Option B: Vercel (recommended for Next.js)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import the repository
4. Add environment variables:
   - `DATABASE_URL` = your Supabase connection string
5. Deploy

---

## Environment Variables for Production

```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
NEXTAUTH_SECRET=your-random-secret-here
NEXTAUTH_URL=https://your-domain.com
```

---

## Notes

- **Prisma Accelerate:** If using Cloudflare Workers (edge runtime), you'll need Prisma Accelerate for connection pooling. With Vercel or Cloudflare Pages (Node.js runtime), direct connection works fine.
- **Connection Pooling:** Supabase provides PgBouncer on port 6543 (use this for serverless). Direct connection is port 5432.
- **Backups:** Supabase Free plan includes daily backups (7-day retention).
- **RLS (Row Level Security):** Supabase supports RLS, but our app handles permissions in the application layer via RBAC. Enable RLS as an additional security layer if needed.

---

## RBAC Roles (pre-seeded)

| Role | Email | Access |
|------|-------|--------|
| Admin | admin@whirlpool-bd.com | All modules, all actions |
| Manager | manager@whirlpool-bd.com | All modules except User Management (view only) |
| Staff | staff@whirlpool-bd.com | Dashboard, Inventory (view), Inbound/Outbound (create+post) |
| Viewer | (create via UI) | View-only access to all modules |

Admin can change any user's role and any role's permissions from the User Management interface.
