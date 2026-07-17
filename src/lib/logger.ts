// ═══════════════════════════════════════════════════════════════
//  Structured Logger — JSON format for production monitoring
//  Usage: log.info('message', { meta: 'data' })
// ═══════════════════════════════════════════════════════════════

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  service: string
  environment: string
  [key: string]: unknown
}

const SERVICE = 'wbl-wh-api'
const ENV = process.env.NODE_ENV || 'development'

function emit(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: SERVICE,
    environment: ENV,
    ...(meta || {}),
  }

  // In production: stream to stdout (picked up by Cloudflare Workers / Vercel logs)
  // In development: pretty print
  if (ENV === 'production') {
    const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout
    stream.write(JSON.stringify(entry) + '\n')
  } else {
    const prefix = {
      debug: '\x1b[90m[debug]\x1b[0m',
      info:  '\x1b[36m[info]\x1b[0m',
      warn:  '\x1b[33m[warn]\x1b[0m',
      error: '\x1b[31m[error]\x1b[0m',
    }[level]
    const metaStr = meta && Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : ''
    const stream = level === 'error' || level === 'warn' ? console.error : console.log
    stream(`${prefix} ${message}${metaStr}`)
  }
}

export const log = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit('debug', msg, meta),
  info:  (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
}
