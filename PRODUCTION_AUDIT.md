# Production Audit Checklist — WBL-WH

> Use this checklist before each production deployment.
> All items must be ✅ Green before going live.

## 1. Security ✅

- [x] `.env` is NOT tracked in git (`git ls-files | grep .env` returns empty)
- [x] `.env.example` is committed as a template
- [x] `.gitignore` includes `.env*`, `!.env.example`, `/db/*.db`, `/upload/`, `/download/`
- [x] No hardcoded secrets in source code (grep for `password`, `secret`, `apiKey`)
- [x] Database password is set on Supabase and NOT in the repo
- [x] NEXTAUTH_SECRET is set via Cloudflare dashboard (not in code)
- [x] Security headers are configured in `next.config.ts`:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: SAMEORIGIN
  - Strict-Transport-Security: max-age=63072000; preload
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: camera=(), microphone=(), geolocation=()
- [x] Row Level Security (RLS) is ENABLED on all tables in Supabase
- [x] Default admin password (`admin123`) is changed on first login

## 2. Database ✅

- [x] `supabase/migration.sql` is complete (schema + indexes + RLS + seed)
- [x] Prisma schema is PostgreSQL-compatible
- [x] All foreign keys have explicit `ON DELETE` rules
- [x] Indexes created for all hot query paths (audit_log.createdAt, product.sku, etc.)
- [x] Triggers auto-update `updatedAt` on User, Product, Stock
- [x] Default RBAC roles seeded: admin, manager, staff, viewer
- [x] Default admin user seeded with bcrypt-hashed password

## 3. Application ✅

- [x] `next.config.ts` has `output: "standalone"` for minimal server bundle
- [x] `poweredByHeader: false` (don't leak tech stack)
- [x] `images.unoptimized: true` for Cloudflare compatibility
- [x] Static asset caching headers set (`Cache-Control: max-age=31536000, immutable`)
- [x] All API routes have try/catch error handling
- [x] All mutations write to AuditLog (CREATE / UPDATE / DELETE / POST / CONFIRM / ADJUST)
- [x] Auth session uses HTTP-only cookies (via NextAuth pattern)
- [x] RBAC permission check on every module load

## 4. UI / UX ✅

- [x] App icons regenerated with gold theme (`#eeb111`) — no blue
- [x] `manifest.json` `theme_color` is `#eeb111` (was `#0c389f` blue)
- [x] `layout.tsx` viewport `themeColor` is `#eeb111`
- [x] Maskable icon variant added for Android PWA install
- [x] All 13 PDF print functions verified working
- [x] All 10 CSV/Excel exports verified working
- [x] Audit Log module is enabled and shows live activity

## 5. Performance ✅

- [x] `experimental.optimizePackageImports` for tree-shaking lucide-react / radix
- [x] React Query `staleTime` configured to avoid refetch storms
- [x] `useDebounce(250ms)` on all search inputs
- [x] Database queries use `take` limit to prevent unbounded reads
- [x] Static assets cached for 1 year (immutable)

## 6. Deployment — Cloudflare Pages

### Build settings (Cloudflare dashboard)

| Setting | Value |
|---------|-------|
| Framework preset | Next.js |
| Build command | `bun run build:cf` |
| Build output dir | `.vercel/output/static` |
| Root directory | `/` |
| Node version | 20 |
| Compatibility flags | `nodejs_compat` |

### Environment variables (set in dashboard)

```bash
DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
NEXTAUTH_SECRET=<openssl-rand-base64-32>
NEXTAUTH_URL=https://wbl-wh.pages.dev
NODE_ENV=production
```

### Deploy commands

```bash
# First-time setup (one-time)
npx wrangler pages project create wbl-wh --production-branch=main

# Set secrets (one-time, prompted for value)
npx wrangler pages secret put DATABASE_URL    --project-name=wbl-wh
npx wrangler pages secret put NEXTAUTH_SECRET --project-name=wbl-wh

# Manual deploy (CI/CD also works via Git integration)
bun run build:cf
bun run deploy:cf
```

## 7. Deployment — Supabase

1. Create project at supabase.com (region: Singapore, closest to BD)
2. SQL Editor → New query → paste entire `supabase/migration.sql` → Run
3. Verify tables created: `SELECT COUNT(*) FROM "User";` should return 1
4. Settings → Database → Connection string → copy URI
5. Replace `[PASSWORD]` with your DB password → set as `DATABASE_URL` in Cloudflare

## 8. Post-Deploy Verification

- [ ] Visit `https://wbl-wh.pages.dev` — loads without errors
- [ ] Open browser DevTools → Console — no red errors
- [ ] Login with `admin@whirlpool-bd.com` / `admin123`
- [ ] CHANGE admin password immediately (Profile → Change Password)
- [ ] Verify Dashboard KPIs show real data
- [ ] Create a test Product → check Audit Log module shows the entry
- [ ] Open mobile view (DevTools → toggle device) — responsive works
- [ ] Install as PWA on Android/iOS — icon is GOLD not blue
- [ ] Run Lighthouse audit — score should be 90+ on all metrics

## 9. Monitoring

- Cloudflare Analytics: page views, errors, performance
- Supabase Logs: SQL queries, RLS denials
- Application: `console.error` captured in browser DevTools
- Audit Log: every mutation is recorded with user, action, timestamp
