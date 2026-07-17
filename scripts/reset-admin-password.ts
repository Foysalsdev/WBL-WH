#!/usr/bin/env node
/**
 * Admin Password Reset Script
 * Usage:
 *   bun run scripts/reset-admin-password.ts <new-password>
 *
 * Or interactive (no arg):
 *   bun run scripts/reset-admin-password.ts
 *
 * This script:
 *   1. Generates a strong random password (if not provided)
 *   2. Hashes it with bcrypt cost 12
 *   3. Updates the default admin user
 *   4. Prints the new password (only once — save it!)
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const db = new PrismaClient()

function generateStrongPassword(): string {
  // 24 chars: mix of letters, numbers, symbols
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz23456789!@#$%^&*'
  const bytes = crypto.randomBytes(24)
  let pwd = ''
  for (let i = 0; i < 24; i++) {
    pwd += chars[bytes[i] % chars.length]
  }
  // Ensure compliance with policy
  return pwd + 'Aa1!'
}

async function main() {
  const providedPwd = process.argv[2]
  const newPwd = providedPwd || generateStrongPassword()

  // Validate
  if (newPwd.length < 8) {
    console.error('❌ Password must be at least 8 characters')
    process.exit(1)
  }
  if (!/[a-z]/.test(newPwd) || !/[A-Z]/.test(newPwd) || !/[0-9]/.test(newPwd)) {
    console.error('❌ Password must contain lowercase, uppercase, and a number')
    process.exit(1)
  }

  const email = 'admin@whirlpool-bd.com'

  console.log('🔐 Resetting admin password...\n')

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`❌ Admin user not found: ${email}`)
    console.error('   Run `bun run scripts/seed.ts` first to create the admin user.')
    process.exit(1)
  }

  const hash = await bcrypt.hash(newPwd, 12)
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: hash },
  })

  // Log to audit
  await db.auditLog.create({
    data: {
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      userName: 'System',
      details: 'Admin password reset via CLI script',
    },
  })

  console.log('✅ Admin password updated successfully!\n')
  console.log('═══════════════════════════════════════════════════')
  console.log('  Email:    admin@whirlpool-bd.com')
  console.log(`  Password: ${newPwd}`)
  console.log('═══════════════════════════════════════════════════')
  console.log('\n⚠️  SAVE THIS PASSWORD NOW — it will not be shown again.')
  console.log('⚠️  After first login, change it via Profile → Change Password.\n')

  await db.$disconnect()
}

main().catch((e) => {
  console.error('❌ Failed:', e)
  process.exit(1)
})
