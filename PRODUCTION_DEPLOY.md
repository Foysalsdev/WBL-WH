# Production Deployment Guide — WBL-WH

> **Complete step-by-step guide to deploy WBL-WH to production.**
> Time required: ~2 hours (first time) · Difficulty: Intermediate

---

## 📋 Pre-Deployment Checklist

Before starting, ensure you have:

- [ ] GitHub repository access (https://github.com/Foysalsdev/WBL-WH)
- [ ] Supabase account (free is fine for ~500MB DB)
- [ ] Cloudflare account (free tier sufficient)
- [ ] Domain name (optional — `wbl-wh.pages.dev` is fine for testing)
- [ ] **PAT revoked and regenerated** (if previously leaked)
- [ ] Local development environment tested (`bun run dev` works)

---

## 🚨 Critical Security Setup (DO NOT SKIP)

### Step 1: Generate Strong Secrets

```bash
# Generate NEXTAUTH_SECRET (required for session token signing)
openssl rand -base64 32
# Copy this value — you'll need it for Cloudflare

# Generate a strong admin password
openssl rand -base64 16
# Save this too
```

### Step 2: Revoke Leaked Credentials

If you have **ever** shared credentials in chat/email/git history:

1. **GitHub PAT** → Settings → Developer settings → Personal access tokens → Delete
2. **Supabase DB password** → Project settings → Database → Reset database password
3. **Any API keys** → Regenerate

---

## 🗄️ Database Setup (Supabase)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → Sign in
2. **New Project**
   - Name: `whirlpool-wms`
   - Database Password: (use a strong generated password — save it!)
   - Region: Singapore (closest to Bangladesh)
   - Plan: Free

3. Wait ~2 minutes for provisioning

### Step 2: Run Schema Migration

1. In Supabase dashboard → **SQL Editor** → **New query**
2. Open `supabase/migration.sql` from your local repo
3. Copy the **entire** contents and paste into SQL editor
4. Click **RUN**

This creates:
- 20 tables with proper foreign keys
- 25+ performance indexes
- Row Level Security (RLS) on every table
- Triggers for `updatedAt` columns
- Seed data: 4 RBAC roles, ~40 permissions, admin user, demo products

### Step 3: Run Finance Addon (if using Finance module)

1. Open `supabase/finance-addon.sql` from your local repo
2. Paste entire contents into a new SQL query → RUN

This adds 3 tables: Requisition, CashIn, Expense (with RLS + indexes)

### Step 4: Get Connection String

1. Supabase dashboard → **Settings** → **Database**
2. Find **Connection string** → **URI** format
3. It looks like:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
4. Replace `[password]` with your DB password from Step 1

### Step 5: Verify Migration

Run these verification queries in SQL Editor:

```sql
SELECT COUNT(*) FROM "User";          -- should be 1
SELECT COUNT(*) FROM "Role";          -- should be 4
SELECT COUNT(*) FROM "Permission";    -- should be ~40
SELECT COUNT(*) FROM "Product";       -- should be 5 (or 0 if no seed)
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- Every table should show rowsecurity = true
```

---

## ☁️ Cloudflare Pages Setup

### Step 1: Create Pages Project

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create**
2. **Pages** tab → **Connect to Git**
3. Select `Foysalsdev/WBL-WH` repository
4. Configure:

| Setting | Value |
|---------|-------|
| Project name | `wbl-wh` |
| Production branch | `main` |
| Framework preset | Next.js |
| Build command | `bun run build:cf` |
| Build output dir | `.vercel/output/static` |
| Root directory | `/` |

5. **Save and Deploy** (will fail first time — need env vars)

### Step 2: Set Environment Variables

In Cloudflare Pages → **Settings** → **Environment variables** (Production):

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (Supabase connection string from DB Step 4) |
| `NEXTAUTH_SECRET` | (Generated in Security Step 1) |
| `NEXTAUTH_URL` | `https://wbl-wh.pages.dev` (or your custom domain) |
| `NODE_ENV` | `production` |

**Important:** Mark `DATABASE_URL` and `NEXTAUTH_SECRET` as **Encrypted**.

### Step 3: Set Compatibility Flags

Settings → **Functions** → **Compatibility flags**:
- Add: `nodejs_compat`

### Step 4: Trigger First Deploy

- Push any commit to `main` branch → auto-deploys
- Or: Actions tab → **Retry deployment**

### Step 5: Verify Deployment

Visit `https://wbl-wh.pages.dev`:
- [ ] Page loads without errors
- [ ] Login page appears
- [ ] DevTools Console shows no red errors
- [ ] Lighthouse audit score > 90

---

## 🔐 Initial Admin Login & Password Change

### Step 1: Login with Default Credentials

After successful deployment:

```
URL:      https://wbl-wh.pages.dev
Email:    admin@whirlpool-bd.com
Password: Admin@2026
```

### Step 2: Change Admin Password IMMEDIATELY

**Option A: Via UI (recommended)**
1. Login → Profile menu → Change Password
2. Enter current: `Admin@2026`
3. New password: must have lowercase, uppercase, number, min 8 chars
4. Submit

**Option B: Via CLI script**
```bash
# Generate strong random password
bun run scripts/reset-admin-password.ts

# Or with custom password
bun run scripts/reset-admin-password.ts "MyStrongP@ss2026"
```

### Step 3: Create Additional Users

1. Login as admin → User Management module
2. Create users for manager, staff, viewer roles
3. Each user must change their password on first login (recommended)

### Step 4: Change Other Default Passwords

```bash
# Manager
bun run scripts/reset-admin-password.ts
# Then edit script to target manager email, or use UI

# Staff
# Same as above
```

Or simpler — change all passwords via UI Profile menu.

---

## 📊 Monitoring Setup

### Step 1: Health Check Endpoint

WBL-WH exposes `/api/health` endpoint:

```bash
curl https://wbl-wh.pages.dev/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-07-17T...",
  "environment": "production",
  "version": "2.0.0",
  "responseTimeMs": 45,
  "checks": {
    "database": { "status": "ok", "latencyMs": 12 }
  }
}
```

### Step 2: Uptime Monitoring (recommended)

1. Sign up at [UptimeRobot](https://uptimerobot.com) (free)
2. Add HTTP monitor:
   - URL: `https://wbl-wh.pages.dev/api/health`
   - Interval: 5 minutes
   - Alert if: status != 200 OR response time > 5s
3. Add email/SMS/Telegram alerts

### Step 3: Error Monitoring (optional)

For error tracking, sign up at [Sentry](https://sentry.io) (free tier):
1. Create new Next.js project
2. Get DSN URL
3. Add `SENTRY_DSN` env var in Cloudflare
4. (Code already has logger stub — just need to wire up Sentry SDK)

---

## 💾 Backup Strategy

### Step 1: Supabase Automatic Backups

Supabase Free plan includes:
- Daily automatic backups (7-day retention)
- Manual backup via dashboard anytime

Verify:
- Supabase dashboard → **Database** → **Backups**
- Should show daily backup schedule

### Step 2: Weekly Manual Backup (recommended)

Every Sunday:
```bash
# Using pg_dump (requires local psql)
pg_dump "postgresql://postgres.[ref]:[pwd]@..." > backup-$(date +%Y%m%d).sql

# Upload to cloud storage (Google Drive, Dropbox, etc.)
```

### Step 3: Test Restore (monthly)

Once a month, restore backup to a staging project to verify:
```bash
# Create staging project in Supabase
# Run backup SQL in staging
# Verify all data is present
```

---

## 🔄 CI/CD Pipeline

The repository includes `.github/workflows/ci.yml` that runs on every push:

1. **Build & Verify** — install deps, generate Prisma, lint, build
2. **Security Audit** — check for committed secrets, hard-coded tokens
3. **Deploy to Cloudflare** — auto-deploy on `main` branch push

### Required GitHub Secrets

Set in GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (from Cloudflare dashboard) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `DATABASE_URL` | Supabase connection string (for build-time Prisma) |
| `NEXTAUTH_SECRET` | Session signing secret |
| `NEXTAUTH_URL` | `https://wbl-wh.pages.dev` |

### Environments

Create GitHub environment called `production`:
- Settings → Environments → New environment → `production`
- Add required reviewers (your team) for production deploys
- This adds manual approval step before deploy

---

## 🚨 Incident Response

### If Site Goes Down

1. Check `/api/health` endpoint
2. Check Cloudflare status page
3. Check Supabase status page
4. Rollback to previous deployment in Cloudflare Pages → Deployments

### If Database Compromised

1. Supabase dashboard → **Database** → Reset password
2. Update `DATABASE_URL` in Cloudflare env vars
3. Trigger redeploy
4. Audit logs: review `AuditLog` table for suspicious activity
5. Force password reset for all users

### If Credentials Leak

1. Revoke the leaked credential immediately
2. Audit who accessed the repo/DB during leak window
3. Rotate all secrets (NEXTAUTH_SECRET, DB password, all user passwords)
4. Review audit logs for unauthorized access

---

## 📈 Post-Deployment Verification

After deployment, verify these end-to-end:

- [ ] Visit `https://wbl-wh.pages.dev` — loads without errors
- [ ] Login with admin credentials — redirects to dashboard
- [ ] **Change admin password** — Profile → Change Password
- [ ] Create a product → verify in list
- [ ] Create a PO → receive it → stock updates
- [ ] Create a SO → pick → scan → dispatch → PDF generates
- [ ] Open Audit Log module → shows your actions
- [ ] Open Finance module → create requisition → cash in → expense
- [ ] Open mobile view (DevTools) — responsive works
- [ ] Install as PWA on Android/iOS — gold icon appears
- [ ] Run Lighthouse — score 90+ on all metrics

---

## 🆘 Troubleshooting

### Build Fails in CI/CD

```bash
# Check CI logs in GitHub Actions tab
# Common issues:
# - Missing env vars → set GitHub secrets
# - Prisma generate failed → check DATABASE_URL
# - Lint errors → bun run lint locally
```

### Cloudflare Deploy Stuck

- Cloudflare Pages → Deployments → click stuck deploy → View logs
- Common: missing `nodejs_compat` flag (Settings → Functions)

### Login Doesn't Work

1. Check `/api/health` — DB must be `ok`
2. Check browser DevTools → Network → `/api/auth/login` response
3. Verify password: try reset via `bun run scripts/reset-admin-password.ts`
4. Check audit log for failed login attempts

### Database Connection Errors

- Verify `DATABASE_URL` is correct (port 6543 for pooler, 5432 for direct)
- Check Supabase project is not paused (free tier pauses after 1 week of inactivity)
- Verify IP not blocked (Supabase → Settings → Database → Network restrictions)

---

## ✅ Production Readiness Final Checklist

Before going live with real data:

- [ ] All secrets generated fresh (none reused from chat/history)
- [ ] Supabase project created + migration SQL run
- [ ] RLS enabled and verified on all tables
- [ ] Cloudflare Pages deployed successfully
- [ ] Environment variables set (encrypted)
- [ ] `nodejs_compat` flag enabled
- [ ] Default admin password changed
- [ ] All user passwords set (not defaults)
- [ ] Health check endpoint responds 200
- [ ] Uptime monitor configured
- [ ] Weekly backup process documented
- [ ] CI/CD pipeline green
- [ ] HTTPS enforced (Cloudflare automatic)
- [ ] End-to-end smoke test passed
- [ ] Lighthouse audit > 90

Once all items are checked, you're production-ready! 🎉

---

## 📞 Support

- **Code issues**: Open GitHub issue at https://github.com/Foysalsdev/WBL-WH/issues
- **Supabase docs**: https://supabase.com/docs
- **Cloudflare Pages docs**: https://developers.cloudflare.com/pages/

**Last updated**: July 2026
