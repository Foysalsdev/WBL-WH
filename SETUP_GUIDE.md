# 🚀 WBL-WH সেটআপ গাইড (একদম শুরু থেকে)

> এই গাইডটি তাদের জন্য যারা web development বোঝেন না।
> প্রতিটি ধাপ অনুসরণ করুন। কোনো ধাপে আটকে গেলে আমাকে বলুন।

---

## 📋 যা যা লাগবে (একবার install করতে হবে)

### ১. Bun (JavaScript runtime — Node.js এর বিকল্প, দ্রুত)

**Windows-এ:**
1. PowerShell খুলুন (Start menu → "PowerShell" সার্চ করুন)
2. এই command কপি-পেস্ট করে Enter চাপুন:
   ```
   powershell -c "irm bun.sh/install.ps1 | iex"
   ```
3. PowerShell বন্ধ করে আবার খুলুন (নতুন install recognize করার জন্য)
4. Verify: `bun --version` টাইপ করুন — version number দেখাবে

**Mac-এ:**
1. Terminal খুলুন
2. `curl -fsSL https://bun.sh/install | bash` টাইপ করে Enter
3. Terminal বন্ধ করে আবার খুলুন
4. Verify: `bun --version`

**Linux-এ:**
1. Terminal খুলুন
2. `curl -fsSL https://bun.sh/install | bash` টাইপ করে Enter
3. Terminal বন্ধ করে আবার খুলুন
4. Verify: `bun --version`

### ২. Git (version control — code download করার জন্য)

**Windows:** https://git-scm.com/download/win থেকে download করে install করুন (default settings-এ Next-Next চাপুন)

**Mac:** Terminal খুলুন, `git --version` টাইপ করুন — যদি না থাকে, auto install হবে

---

## 📥 Code Download করা (দুটি উপায়)

### উপায় ১: ZIP ডাউনলোড (সহজ)

1. https://github.com/Foysalsdev/WBL-WH খুলুন
2. সবুজ **"Code"** বাটনে ক্লিক করুন
3. **"Download ZIP"** সিলেক্ট করুন
4. ZIP ফাইলটি extract করুন (যেমন Desktop-এ `WBL-WH-main` ফোল্ডারে)

### উপায় ২: Git clone (ভালো)

Terminal/PowerShell খুলুন, যেখানে code রাখতে চান সেখানে যান:
```
cd Desktop
git clone https://github.com/Foysalsdev/WBL-WH.git
cd WBL-WH
```

---

## 🛠 সেটআপ করা (৩ ধাপ)

### ধাপ ১: Terminal খুলুন এবং project ফোল্ডারে যান

**Windows:**
1. project ফোল্ডার (যেখানে code extract করেছেন) খুলুন
2. ফোল্ডারের উপরে address bar-এ ক্লিক করুন
3. `cmd` লিখে Enter চাপুন — Command Prompt খুলবে সেই ফোল্ডারে

**অথবা:**
1. project ফোল্ডারে গিয়ে Right-click করুন
2. "Open in Terminal" বা "Open PowerShell window here" সিলেক্ট করুন

**Mac/Linux:** Terminal খুলুন, `cd` দিয়ে project ফোল্ডারে যান:
```
cd Desktop/WBL-WH-main
```

### ধাপ ২: Dependencies install করুন

Terminal-এ এই command টাইপ করে Enter চাপুন:
```
bun install
```

**যদি কাজ না করে:**
- `bun: command not found` → Bun install হয়নি, উপরের ধাপ ১ আবার করুন
- অন্য কোনো error → পুরো error message কপি করে আমাকে পাঠান

এই command ২-৩ মিনিট সময় নিতে পারে। শেষ হলে কিছু লেখা আসবে `packages installed` বা এমন কিছু।

### ধাপ ৩: Environment setup (NEXTAUTH_SECRET তৈরি)

একই Terminal-ে এই command টাইপ করে Enter চাপুন:
```
bun run scripts/setup-env.ts
```

**এটি কী করবে:**
- একটি random password (NEXTAUTH_SECRET) তৈরি করবে
- `.env` ফাইল বানাবে project ফোল্ডারে
- Screen-এ secret দেখাবে (production deploy-এর সময় লাগবে)

---

## 🗄 Database তৈরি করা

এই command টাইপ করুন:
```
bun run db:push
```

তারপর:
```
bun run seed
```

**যদি error আসে যে migration দরকার:**
```
bun run db:generate
bun run db:push
bun run seed
```

---

## 🚀 App চালু করা

এই command টাইপ করুন:
```
bun run dev
```

**একটি লম্বা লেখা আসবে। এর মধ্যে দেখবেন:**
```
▲ Next.js 16.1.3 (Turbopack)
- Local:   http://localhost:3000
```

**অর্থাৎ server চলছে!** এখন:

1. Browser (Chrome/Firefox) খুলুন
2. Address bar-এ লিখুন: **http://localhost:3000**
3. Login page আসবে

**Login credentials:**
```
Email:    admin@whirlpool-bd.com
Password: Admin@2026
```

---

## 🛑 Server বন্ধ করা

Terminal-এ গিয়ে `Ctrl + C` চাপুন (একসাথে)।

---

## ❌ সমস্যা হলে

### "bun: command not found"
Bun install হয়নি। উপরের "Bun install" ধাপ আবার করুন।
Windows-এ PowerShell বন্ধ করে আবার খুলুন।

### "Cannot find module" বা "module not found"
Dependencies install হয়নি। আবার করুন:
```
bun install
```

### Port 3000 already in use
অন্য কিছু চলছে 3000 port-এ। আগের server বন্ধ করুন বা অন্য port-এ চালান:
```
bun run dev -- -p 3001
```
তারপর http://localhost:3001 খুলুন।

### Login করার পর blank screen
Database reset করুন:
```
bun run db:push
bun run seed
```

### অন্য কোনো error
**পুরো error message কপি করে আমাকে পাঠান।** আমি দেখে বলব কী করতে হবে।

---

## 📸 Quick Reference (এই সব command মনে রাখুন)

```bash
bun install              # প্রথমবার — dependencies install
bun run scripts/setup-env.ts   # প্রথমবার — secret তৈরি
bun run db:push          # database schema sync
bun run seed             # demo data ঢোকানো
bun run dev              # server চালু করা (Ctrl+C দিয়ে বন্ধ)
bun run build            # production build করা
bun test                 # tests চালানো
bun run scripts/backup.ts  # database backup তৈরি
```

---

## 🎯 Quick Start (একসাথে সব করতে চাইলে)

Terminal খুলে project ফোল্ডারে গিয়ে এই সব একটা একটা করে করুন:

```bash
bun install
bun run scripts/setup-env.ts
bun run db:push
bun run seed
bun run dev
```

তারপর browser-এ http://localhost:3000 খুলুন। ✅

---

## 🆘 সাহায্য চাইলে

আমাকে এই তথ্য পাঠান:
1. আপনি কোন operating system-এ আছেন (Windows/Mac/Linux)?
2. কোন ধাপে আটকে গেছেন?
3. পুরো error message কপি করে দিন (screenshot বা text)
4. `bun --version` টাইপ করে যা দেখায় সেটা বলুন

আমি ধাপে ধাপে সাহায্য করব।
