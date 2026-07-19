# 🚀 Supabase Setup Guide (সহজ বাংলায়)

> আপনি Supabase-এ deploy করতে চান — এই guide অনুসরণ করুন।

---

## ধাপ ১: Supabase Project তৈরি

১. https://supabase.com খুলুন → Sign up/Login করুন
২. **New Project** ক্লিক করুন
৩. এই তথ্য দিন:
   - **Name:** `whirlpool-wms`
   - **Database Password:** (একটা শক্ত পাসওয়ার্ড দিন, সেভ করুন!)
   - **Region:** Singapore ( closest to Bangladesh)
   - **Plan:** Free

৪. ২ মিনিট অপেক্ষা করুন — project ready হবে

---

## ধাপ ২: Database Schema তৈরি

১. Supabase Dashboard → **SQL Editor** → **New query**
২. আপনার project থেকে `supabase/migration.sql` ফাইলটি খুলুন
৩. সব content copy করে SQL Editor-এ paste করুন
৪. **RUN** ক্লিক করুন
৫. একইভাবে `supabase/rls-policies.sql` চালান
৬. একইভাবে `supabase/finance-addon.sql` চালান

---

## ধাপ ৩: Connection String নিন

১. Supabase Dashboard → **Settings** → **Database**
২. **Connection string** → **URI** খুঁজুন
৩. এটা দেখতে এমন:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
৪. `[password]` এর জায়গায় আপনার database password বসান

---

## ধাপ ৪: Prisma Schema পরিবর্তন

`prisma/schema.prisma` ফাইলে এই লাইন পরিবর্তন করুন:

```prisma
datasource db {
  provider = "postgresql"   // "sqlite" থেকে পরিবর্তন করুন
  url      = env("DATABASE_URL")
}
```

---

## ধাপ ৫: .env ফাইল আপডেট

`.env` ফাইলে এই তিনটি লাইন দিন:

```env
DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
NEXTAUTH_SECRET="(আপনার secret — bun run scripts/setup-env.ts দিয়ে তৈরি করুন)"
NEXTAUTH_URL="http://localhost:3000"
```

---

## ধাপ ৬: Database Push + Seed

Terminal-এ চালান:

```bash
bun run db:generate
bun run db:push
bun run seed
```

---

## ধাপ ৭: Verify

```bash
bun run dev
```

Browser: http://localhost:3000
Login: admin@whirlpool-bd.com / Admin@2026

---

## 📞 সাহায্য

কোনো ধাপে আটকে গেলে আমাকে বলুন।
