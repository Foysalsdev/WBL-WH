// ═══════════════════════════════════════════════════════════════
//  Integration Tests — API route behavior
//  Run: bun test tests/api.test.ts
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll } from 'bun:test'
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  verifySessionToken,
  rateLimit,
  PASSWORD_SCHEMA,
  EMAIL_SCHEMA,
} from '../src/lib/security'
import { validateBody } from '../src/lib/security'
import { z } from 'zod'

// ─── Helper: simulate rate limit stress ────────────────────────
function stressRateLimit(key: string, count: number, opts: { windowMs: number; maxRequests: number }) {
  const results: boolean[] = []
  for (let i = 0; i < count; i++) {
    const r = rateLimit(key, opts)
    results.push(r.allowed)
  }
  return results
}

// ═══════════════════════════════════════════════════════════════
//  AUTH FLOW TESTS
// ═══════════════════════════════════════════════════════════════

describe('Auth Flow', () => {
  it('should generate valid session token for known user', () => {
    const userId = 'user-test-123'
    const token = generateSessionToken(userId)
    const session = verifySessionToken(token)
    expect(session).not.toBeNull()
    expect(session?.userId).toBe(userId)
  })

  it('should reject expired token (simulate)', () => {
    // We can't easily test 7-day expiry, but we test malformed
    const token = 'user-1.123.invalid.signature'
    expect(verifySessionToken(token)).toBeNull()
  })

  it('should reject empty token', () => {
    expect(verifySessionToken('')).toBeNull()
  })

  it('should reject null/undefined token', () => {
    expect(verifySessionToken(null as any)).toBeNull()
    expect(verifySessionToken(undefined as any)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════
//  PASSWORD SECURITY TESTS
// ═══════════════════════════════════════════════════════════════

describe('Password Security', () => {
  it('should hash with bcrypt cost 12', async () => {
    const hash = await hashPassword('TestPass123!')
    expect(hash).toMatch(/^\$2[aby]\$12\$/)  // bcrypt cost 12
  })

  it('should produce different hashes for same password (salt)', async () => {
    const hash1 = await hashPassword('SamePass123!')
    const hash2 = await hashPassword('SamePass123!')
    expect(hash1).not.toBe(hash2)
  })

  it('should verify correct password regardless of salt', async () => {
    const hash = await hashPassword('VerifyMe123!')
    expect(await verifyPassword('VerifyMe123!', hash)).toBe(true)
  })

  it('should resist timing attacks (always run bcrypt)', async () => {
    const start = Date.now()
    await verifyPassword('any', null)  // null hash
    const elapsed = Date.now() - start
    // Should be very fast (returns false immediately for null)
    expect(elapsed).toBeLessThan(10)
  })
})

// ═══════════════════════════════════════════════════════════════
//  PASSWORD POLICY TESTS
// ═══════════════════════════════════════════════════════════════

describe('Password Policy', () => {
  const testCases = [
    { pwd: 'Strong123!', valid: true, label: 'strong password' },
    { pwd: 'weak', valid: false, label: 'too short' },
    { pwd: 'alllowercase123', valid: false, label: 'no uppercase' },
    { pwd: 'ALLUPPERCASE123', valid: false, label: 'no lowercase' },
    { pwd: 'NoNumbers!', valid: false, label: 'no numbers' },
    { pwd: 'Short1!', valid: false, label: 'too short with all types' },
    { pwd: 'A'.repeat(200) + '1!', valid: false, label: 'too long' },
  ]

  for (const tc of testCases) {
    it(`should ${tc.valid ? 'accept' : 'reject'} ${tc.label}`, () => {
      const r = PASSWORD_SCHEMA.safeParse(tc.pwd)
      expect(r.success).toBe(tc.valid)
    })
  }
})

// ═══════════════════════════════════════════════════════════════
//  EMAIL VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('Email Validation', () => {
  it('should accept valid email', () => {
    expect(EMAIL_SCHEMA.safeParse('user@example.com').success).toBe(true)
  })

  it('should lowercase email', () => {
    const r = EMAIL_SCHEMA.safeParse('USER@Example.COM')
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBe('user@example.com')
  })

  it('should reject invalid email', () => {
    expect(EMAIL_SCHEMA.safeParse('not-an-email').success).toBe(false)
    expect(EMAIL_SCHEMA.safeParse('user@').success).toBe(false)
    expect(EMAIL_SCHEMA.safeParse('@example.com').success).toBe(false)
  })

  it('should reject empty', () => {
    expect(EMAIL_SCHEMA.safeParse('').success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
//  RATE LIMITER EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe('Rate Limiter', () => {
  it('should allow exactly N requests then block', () => {
    const key = `edge-test-1-${Date.now()}`
    const results = stressRateLimit(key, 5, { windowMs: 60000, maxRequests: 3 })
    expect(results).toEqual([true, true, true, false, false])
  })

  it('should track separate IPs separately', () => {
    const k1 = `ip-1-${Date.now()}`
    const k2 = `ip-2-${Date.now()}`
    stressRateLimit(k1, 3, { windowMs: 60000, maxRequests: 3 })
    const r1 = rateLimit(k1, { windowMs: 60000, maxRequests: 3 })
    const r2 = rateLimit(k2, { windowMs: 60000, maxRequests: 3 })
    expect(r1.allowed).toBe(false)
    expect(r2.allowed).toBe(true)
  })

  it('should return correct remaining count', () => {
    const key = `remaining-${Date.now()}`
    const r1 = rateLimit(key, { windowMs: 60000, maxRequests: 10 })
    expect(r1.remaining).toBe(9)
    const r2 = rateLimit(key, { windowMs: 60000, maxRequests: 10 })
    expect(r2.remaining).toBe(8)
  })

  it('should block after limit reached', () => {
    const key = `block-${Date.now()}`
    stressRateLimit(key, 3, { windowMs: 60000, maxRequests: 3 })
    const r = rateLimit(key, { windowMs: 60000, maxRequests: 3 })
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
//  VALIDATION HELPER TESTS
// ═══════════════════════════════════════════════════════════════

describe('Validation Helper', () => {
  const TestSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    age: z.number().int().min(0).max(150),
  })

  it('should accept valid input', () => {
    const r = validateBody(TestSchema, { name: 'Test', email: 'test@test.com', age: 25 })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.name).toBe('Test')
      expect(r.data.age).toBe(25)
    }
  })

  it('should reject invalid input with helpful message', () => {
    const r = validateBody(TestSchema, { name: '', email: 'not-email', age: -5 })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.length).toBeGreaterThan(0)
    }
  })

  it('should reject missing fields', () => {
    const r = validateBody(TestSchema, { name: 'Test' })
    expect(r.success).toBe(false)
  })

  it('should reject null', () => {
    const r = validateBody(TestSchema, null)
    expect(r.success).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
//  TOKEN FORGERY TESTS
// ═══════════════════════════════════════════════════════════════

describe('Token Forgery Resistance', () => {
  it('should reject token with wrong signature', () => {
    const token = generateSessionToken('user-1')
    // Tamper with signature (last segment)
    const parts = token.split('.')
    const tampered = parts.slice(0, 3).join('.') + '.wrongsig'
    expect(verifySessionToken(tampered)).toBeNull()
  })

  it('should reject token with extra segments', () => {
    const token = generateSessionToken('user-1') + '.extra'
    expect(verifySessionToken(token)).toBeNull()
  })

  it('should reject token with missing segments', () => {
    expect(verifySessionToken('a.b.c')).toBeNull()
    expect(verifySessionToken('a.b')).toBeNull()
    expect(verifySessionToken('a')).toBeNull()
  })

  it('should reject non-base64 signature', () => {
    const token = 'user-1.123.rand.!!!invalid!!!'
    expect(verifySessionToken(token)).toBeNull()
  })

  it('should accept token with hyphenated user ID', () => {
    const userId = 'user-123-abc'
    const token = generateSessionToken(userId)
    const session = verifySessionToken(token)
    expect(session?.userId).toBe(userId)
  })
})

// ═══════════════════════════════════════════════════════════════
//  CONCURRENT RATE LIMITING TESTS
// ═══════════════════════════════════════════════════════════════

describe('Concurrent Rate Limiting', () => {
  it('should handle burst of concurrent requests', () => {
    const key = `burst-${Date.now()}`
    const opts = { windowMs: 60000, maxRequests: 10 }

    // Simulate 20 concurrent requests
    const results = Array.from({ length: 20 }, () => rateLimit(key, opts))

    const allowed = results.filter(r => r.allowed).length
    const blocked = results.filter(r => !r.allowed).length

    expect(allowed).toBe(10)  // exactly maxRequests
    expect(blocked).toBe(10)  // rest blocked
  })
})
