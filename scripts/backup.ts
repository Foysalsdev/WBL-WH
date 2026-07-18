#!/usr/bin/env node
/**
 * Automated Database Backup Script
 *
 * What it does:
 *   - Exports entire database to a JSON file (works for SQLite + Supabase)
 *   - Saves to /backups/ folder with timestamp
 *   - Keeps last 30 days of backups (auto-deletes older)
 *   - Can be run manually or scheduled (cron/Cloudflare Workers)
 *
 * Usage:
 *   bun run scripts/backup.ts                    # create backup
 *   bun run scripts/backup.ts --restore=file.json # restore from backup
 *   bun run scripts/backup.ts --list              # list available backups
 *
 * Schedule (Linux cron — daily at 2 AM):
 *   0 2 * * * cd /path/to/project && bun run scripts/backup.ts >> logs/backup.log 2>&1
 */
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const db = new PrismaClient()

const BACKUP_DIR = path.resolve(process.cwd(), 'backups')

// All tables to backup (order matters for restore — parents first)
const TABLES = [
  'user', 'role', 'permission',
  'customer', 'supplier',
  'product', 'warehouse', 'location',
  'stock', 'movement',
  'purchaseOrder', 'purchaseOrderItem',
  'salesOrder', 'salesOrderItem',
  'dispatch', 'dispatchItem',
  'transportVendor', 'vehicle', 'courierVendor',
  'requisition', 'cashIn', 'expense',
  'return', 'returnItem',
  'auditLog',
]

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `backup-${timestamp}.json`
  const filepath = path.join(BACKUP_DIR, filename)

  // Ensure backup dir exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }

  console.log(`📦 Creating backup: ${filename}`)

  const backup: Record<string, any[]> = {}
  let totalRecords = 0

  for (const table of TABLES) {
    try {
      // @ts-ignore — dynamic table access
      const records = await db[table].findMany()
      backup[table] = records
      totalRecords += records.length
      console.log(`  ✓ ${table}: ${records.length} records`)
    } catch (e: any) {
      console.log(`  ⚠ ${table}: skipped (${e.message})`)
      backup[table] = []
    }
  }

  const metadata = {
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    totalRecords,
    tables: Object.fromEntries(Object.entries(backup).map(([k, v]) => [k, v.length])),
  }

  const output = { metadata, data: backup }
  fs.writeFileSync(filepath, JSON.stringify(output, null, 2), 'utf-8')

  const sizeKB = (fs.statSync(filepath).size / 1024).toFixed(2)
  console.log(`\n✅ Backup created: ${filepath}`)
  console.log(`   Size: ${sizeKB} KB | Records: ${totalRecords}`)

  // Clean old backups (keep last 30 days)
  await cleanOldBackups()

  await db.$disconnect()
}

async function restoreBackup(filepath: string) {
  if (!fs.existsSync(filepath)) {
    console.error(`❌ Backup file not found: ${filepath}`)
    process.exit(1)
  }

  console.log(`♻️  Restoring from: ${filepath}`)
  console.log('⚠️  WARNING: This will OVERWRITE current data!')
  console.log('   Press Ctrl+C within 5 seconds to cancel...\n')

  await new Promise(r => setTimeout(r, 5000))

  const raw = fs.readFileSync(filepath, 'utf-8')
  const backup = JSON.parse(raw)

  console.log(`📦 Backup metadata:`)
  console.log(`   Created: ${backup.metadata.timestamp}`)
  console.log(`   Records: ${backup.metadata.totalRecords}`)

  // Restore in reverse order (children first, parents last) for delete
  const reversed = [...TABLES].reverse()

  // Delete all existing data
  console.log('\n🗑️  Clearing current data...')
  for (const table of reversed) {
    try {
      // @ts-ignore
      await db[table].deleteMany({})
      console.log(`  ✓ Cleared ${table}`)
    } catch (e: any) {
      console.log(`  ⚠ Could not clear ${table}: ${e.message}`)
    }
  }

  // Restore data (parents first)
  console.log('\n📥 Restoring data...')
  for (const table of TABLES) {
    const records = backup.data[table] || []
    if (records.length === 0) continue
    try {
      // @ts-ignore
      await db[table].createMany({ data: records, skipDuplicates: true })
      console.log(`  ✓ ${table}: ${records.length} records`)
    } catch (e: any) {
      // Fallback: insert one by one
      console.log(`  ⚠ ${table}: bulk insert failed, trying one-by-one...`)
      let success = 0
      for (const r of records) {
        try {
          // @ts-ignore
          await db[table].create({ data: r })
          success++
        } catch {}
      }
      console.log(`    → ${success}/${records.length} restored`)
    }
  }

  console.log('\n✅ Restore complete!')
  await db.$disconnect()
}

async function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('No backups directory yet.')
    return
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()
    .reverse()

  if (files.length === 0) {
    console.log('No backups found.')
    return
  }

  console.log(`📋 Available backups (${files.length}):\n`)
  for (const f of files.slice(0, 20)) {
    const stat = fs.statSync(path.join(BACKUP_DIR, f))
    const sizeKB = (stat.size / 1024).toFixed(2)
    const date = stat.mtime.toLocaleString('en-GB')
    console.log(`  ${f}  (${sizeKB} KB, ${date})`)
  }

  if (files.length > 20) {
    console.log(`\n  ... and ${files.length - 20} older backups`)
  }

  console.log(`\nTotal: ${files.length} backups`)
  console.log(`Total size: ${(files.reduce((s, f) => s + fs.statSync(path.join(BACKUP_DIR, f)).size, 0) / 1024 / 1024).toFixed(2)} MB`)
}

async function cleanOldBackups(daysToKeep = 30) {
  if (!fs.existsSync(BACKUP_DIR)) return

  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('backup-'))

  let deleted = 0
  for (const f of files) {
    const filepath = path.join(BACKUP_DIR, f)
    const stat = fs.statSync(filepath)
    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(filepath)
      deleted++
    }
  }

  if (deleted > 0) {
    console.log(`\n🧹 Cleaned ${deleted} backup(s) older than ${daysToKeep} days`)
  }
}

// CLI handler
const args = process.argv.slice(2)
if (args[0] === '--list') {
  listBackups()
} else if (args[0]?.startsWith('--restore=')) {
  const filepath = args[0].replace('--restore=', '')
  restoreBackup(filepath)
} else {
  createBackup()
}
