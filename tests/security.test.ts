// ═══════════════════════════════════════════════════════════════
//  Security module tests — password hashing, token, rate limit
//  Run: bun test tests/security.test.ts
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'bun:test'
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  verifySessionToken,
  rateLimit,
  PASSWORD_SCHEMA,
} from '../src/lib/security'

describe('Password Hashing', () => {
  it('should hash a password and verify it', async () => {
    const plain = 'TestPass123!'
    const hash = await hashPassword(plain)
    expect(hash).not.toBe(plain)
    expect(hash.startsWith('$2')).toBe(true)

    const valid = await verifyPassword(plain, hash)
    expect(valid).toBe(true)
  })

  it('should reject wrong password', async () => {
    const hash = await hashPassword('CorrectPass123!')
    const valid = await verifyPassword('WrongPass456!', hash)
    expect(valid).toBe(false)
  })

  it('should reject null hash', async () => {
    const valid = await verifyPassword('any', null)
    expect(valid).toBe(false)
  })

  it('should reject short passwords', async () => {
    try {
      await hashPassword('short')
      expect(false).toBe(true) // should not reach
    } catch (e: any) {
      expect(e.message).toContain('at least 8')
    }
  })
})

describe('Password Policy', () => {
  it('should accept strong password', () => {
    const r = PASSWORD_SCHEMA.safeParse('StrongPass123!')
    expect(r.success).toBe(true)
  })

  it('should reject password without uppercase', () => {
    const r = PASSWORD_SCHEMA.safeParse('weakpass123')
    expect(r.success).toBe(false)
  })

  it('should reject password without number', () => {
    const r = PASSWORD_SCHEMA.safeParse('WeakPassword')
    expect(r.success).toBe(false)
  })

  it('should reject too short password', () => {
    const r = PASSWORD_SCHEMA.safeParse('Ab1!')
    expect(r.success).toBe(false)
  })
})

describe('Session Token', () => {
  it('should generate and verify token', () => {
    const userId = 'user-abc-123'
    const token = generateSessionToken(userId)
    expect(token.split('.').length).toBe(4)

    const session = verifySessionToken(token)
    expect(session).not.toBeNull()
    expect(session?.userId).toBe(userId)
  })

  it('should reject tampered token', () => {
    const token = generateSessionToken('user-1')
    const tampered = token.slice(0, -5) + 'XXXXX'
    const session = verifySessionToken(tampered)
    expect(session).toBeNull()
  })

  it('should reject malformed token', () => {
    expect(verifySessionToken('not-a-valid-token')).toBeNull()
    expect(verifySessionToken('a.b.c')).toBeNull()
    expect(verifySessionToken('')).toBeNull()
  })
})

describe('Rate Limiter', () => {
  it('should allow requests within limit', () => {
    const key = `test-allow-${Date.now()}`
    for (let i = 0; i < 5; i++) {
      const r = rateLimit(key, { windowMs: 60000, maxRequests: 5 })
      expect(r.allowed).toBe(true)
    }
  })

  it('should block requests exceeding limit', () => {
    const key = `test-block-${Date.now()}`
    for (let i = 0; i < 3; i++) {
      rateLimit(key, { windowMs: 60000, maxRequests: 3 })
    }
    const r = rateLimit(key, { windowMs: 60000, maxRequests: 3 })
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it('should reset after window expires', () => {
    const key = `test-reset-${Date.now()}`
    // Use very short window
    for (let i = 0; i < 2; i++) {
      rateLimit(key, { windowMs: 1, maxRequests: 2 })
    }
    // Wait 5ms for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const r = rateLimit(key, { windowMs: 1, maxRequests: 2 })
        expect(r.allowed).toBe(true)
        resolve()
      }, 10)
    })
  })

  it('should track separate keys independently', () => {
    const key1 = `test-sep-1-${Date.now()}`
    const key2 = `test-sep-2-${Date.now()}`
    rateLimit(key1, { windowMs: 60000, maxRequests: 1 })
    const r1 = rateLimit(key1, { windowMs: 60000, maxRequests: 1 })
    const r2 = rateLimit(key2, { windowMs: 60000, maxRequests: 1 })
    expect(r1.allowed).toBe(false)
    expect(r2.allowed).toBe(true)
  })
})
