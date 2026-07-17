#!/usr/bin/env node
/**
 * FIRST-RUN SETUP SCRIPT
 * Run this ONCE before deploying to production.
 * It generates NEXTAUTH_SECRET and saves it to .env.local
 *
 * Usage:
 *   bun run scripts/setup-env.ts
 *
 * What it does:
 *   1. Generates a secure NEXTAUTH_SECRET (random 32-byte string)
 *   2. Checks if .env exists, creates .env.local if not
 *   3. Saves the secret + template env vars
 *   4. Prints next steps
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

function generateSecret(length = 32): string {
  return crypto.randomBytes(length).toString('base64')
}

function main() {
  console.log('🔐 WBL-WH First-Run Setup\n')
  console.log('This script will generate secure secrets for your app.\n')

  const secret = generateSecret(32)
  const envPath = path.resolve(process.cwd(), '.env')
  const envExamplePath = path.resolve(process.cwd(), '.env.example')
  const envLocalPath = path.resolve(process.cwd(), '.env.local')

  // Read .env.example as template
  let template = ''
  if (fs.existsSync(envExamplePath)) {
    template = fs.readFileSync(envExamplePath, 'utf-8')
  } else {
    template = `DATABASE_URL="file:./db/custom.db"
NEXTAUTH_SECRET="REPLACE_ME"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"`
  }

  // Replace placeholders
  let envContent = template
    .replace(/NEXTAUTH_SECRET="[^"]*"/, `NEXTAUTH_SECRET="${secret}"`)
    .replace(/generate-with-openssl-rand-base64-32/, secret)

  // For local dev, keep SQLite
  // For production (Cloudflare), user will replace DATABASE_URL manually
  if (!envContent.includes('DATABASE_URL')) {
    envContent = `DATABASE_URL="file:./db/custom.db"\n` + envContent
  }

  // Write to .env (local dev) — overwrites if exists
  fs.writeFileSync(envPath, envContent, 'utf-8')
  console.log('✅ Created .env file with secure NEXTAUTH_SECRET')
  console.log('')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  YOUR NEXTAUTH_SECRET (save this — for Cloudflare env vars):')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`  ${secret}`)
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('')
  console.log('📋 NEXT STEPS:')
  console.log('')
  console.log('1. LOCAL DEV (right now):')
  console.log('   - .env file created with secure secret')
  console.log('   - Run: bun run db:push && bun run seed')
  console.log('   - Run: bun run dev')
  console.log('   - Open: http://localhost:3000')
  console.log('')
  console.log('2. PRODUCTION DEPLOY (later):')
  console.log('   - Use the NEXTAUTH_SECRET above in Cloudflare env vars')
  console.log('   - Also set DATABASE_URL (from Supabase) and NEXTAUTH_URL')
  console.log('   - See PRODUCTION_DEPLOY.md for step-by-step')
  console.log('')
  console.log('⚠️  NEVER commit .env to git (it is in .gitignore)')
  console.log('⚠️  NEVER share NEXTAUTH_SECRET in chat/email')
  console.log('')
}

main()
