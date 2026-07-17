import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { log } from '@/lib/logger'

// GET /api/health — health check endpoint for uptime monitors
// Returns 200 if app + DB are healthy, 503 otherwise
export async function GET() {
  const start = Date.now()
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {}

  // Check 1: Database connection
  try {
    const dbStart = Date.now()
    await db.$queryRaw`SELECT 1`
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart }
  } catch (e: any) {
    checks.database = { status: 'fail', error: e.message }
    log.error('Health check: DB failed', { error: e.message })
  }

  const allOk = Object.values(checks).every(c => c.status === 'ok')
  const responseTimeMs = Date.now() - start

  const body = {
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '2.0.0',
    responseTimeMs,
    checks,
  }

  log.info('Health check', { status: body.status, responseTimeMs })

  return NextResponse.json(body, {
    status: allOk ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
