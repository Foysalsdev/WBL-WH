#!/usr/bin/env node
/**
 * 🚀 ONE-COMMAND SETUP — শুধু এই command টাইপ করুন, বাকি সব এটা করবে
 *
 * Usage:
 *   bun run scripts/start.ts
 *
 * এটা কী করবে:
 *   1. Dependencies install করবে (bun install)
 *   2. NEXTAUTH_SECRET তৈরি করবে + .env ফাইল বানাবে
 *   3. Database তৈরি করবে (db:push)
 *   4. Demo data ঢোকাবে (seed)
 *   5. Dev server চালু করবে
 *
 * আপনাকে শুধু browser খুলে http://localhost:3000 যেতে হবে।
 */
import { execSync, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

function log(msg: string) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ${msg}`)
  console.log('═'.repeat(60))
}

function run(cmd: string, label: string) {
  log(`⏳ ${label}...`)
  try {
    execSync(cmd, { stdio: 'inherit', cwd: process.cwd() })
    console.log(`✅ ${label} — সম্পন্ন`)
  } catch (e) {
    console.error(`❌ ${label} — ব্যর্থ`)
    console.error('Error:', e)
    process.exit(1)
  }
}

function main() {
  console.log('🚀 WBL-WH সম্পূর্ণ সেটআপ শুরু হচ্ছে...\n')
  console.log('এটি ৫-১০ মিনিট সময় নিতে পারে। অপেক্ষা করুন।')

  // Step 1: Check bun is available
  log('ধাপ ১/৫: Bun চেক করা হচ্ছে')
  try {
    execSync('bun --version', { stdio: 'inherit' })
    console.log('✅ Bun available')
  } catch {
    console.error('❌ Bun install নেই!')
    console.error('')
    console.error(' Bun install করুন:')
    console.error('   Windows: https://bun.sh/docs/installation#windows')
    console.error('   Mac/Linux: curl -fsSL https://bun.sh/install | bash')
    console.error('')
    console.error(' তারপর Terminal বন্ধ করে আবার খুলুন এবং আবার চালান:')
    console.error('   bun run scripts/start.ts')
    process.exit(1)
  }

  // Step 2: Install dependencies
  run('bun install', 'ধাপ ২/৫: Dependencies install করা হচ্ছে')

  // Step 3: Generate NEXTAUTH_SECRET + .env
  log('ধাপ ৩/৫: NEXTAUTH_SECRET তৈরি করা হচ্ছে')
  const secret = crypto.randomBytes(32).toString('base64')
  const envPath = path.resolve(process.cwd(), '.env')

  let envContent = `DATABASE_URL="file:./db/custom.db"
NEXTAUTH_SECRET="${secret}"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
`

  fs.writeFileSync(envPath, envContent, 'utf-8')
  console.log('✅ .env ফাইল তৈরি হয়েছে')
  console.log(`   NEXTAUTH_SECRET: ${secret.slice(0, 20)}...`)
  console.log('   (এটি production deploy-এর সময় লাগবে — সেভ করে রাখুন)')

  // Step 4: Generate Prisma client + push schema
  run('bun run db:generate', 'ধাপ ৪/৫: Database schema তৈরি হচ্ছে')
  run('bun run db:push', 'ধাপ ৪/৫: Database তৈরি হচ্ছে')

  // Step 5: Seed demo data
  run('bun run seed', 'ধাপ ৫/৫: Demo data ঢোকানো হচ্ছে')

  // Done!
  log('🎉 সেটআপ সম্পূর্ণ!')

  console.log(`
📌 পরবর্তী ধাপ:
   এই Terminal-এ dev server চালু করুন:
      bun run dev

   তারপর browser খুলুন: http://localhost:3000

   Login credentials:
      Email:    admin@whirlpool-bd.com
      Password: Admin@2026

   ⚠️  প্রথম login-এর পর পাসওয়ার্ড পরিবর্তন করুন!

💾 আপনার NEXTAUTH_SECRET (production-এর জন্য সেভ করুন):
   ${secret}
`)

  // Ask if user wants to start dev server now
  console.log('আপনি কি এখনই dev server চালু করতে চান? (y/n)')
  process.stdin.resume()
  process.stdin.once('data', (data) => {
    const answer = data.toString().trim().toLowerCase()
    if (answer === 'y' || answer === 'yes') {
      console.log('\n🚀 Dev server চালু হচ্ছে...')
      console.log('   বন্ধ করতে Ctrl+C চাপুন\n')
      const dev = spawn('bun', ['run', 'dev'], { stdio: 'inherit', cwd: process.cwd() })
      dev.on('close', () => process.exit(0))
    } else {
      console.log('\n👍 ঠিক আছে। পরে চালু করতে চাইলে:')
      console.log('   bun run dev')
      process.exit(0)
    }
  })
}

main()
