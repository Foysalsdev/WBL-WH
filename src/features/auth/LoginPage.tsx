'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth/session'
import { cn } from '@/lib/utils'
import { inputClass } from '@/lib/styles'

// ═══════════════════════════════════════════════════════════════
//  LoginPage — branded login with Whirlpool identity
// ═══════════════════════════════════════════════════════════════

export function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    const result = await login(email, password)
    if (!result.ok) {
      setError(result.error || 'Login failed')
    }
    // If ok, useEffect will redirect
  }

  function fillDemo(role: string) {
    setEmail(`${role}@whirlpool-bd.com`)
    setPassword('Admin@2026')
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-primary/10 dark:from-primary/20 dark:via-background dark:to-primary/5 relative overflow-hidden">
      {/* Ambient gold orbs (Whirlpool brand) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo + tagline */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/whirlpool-logo.svg"
            alt="Whirlpool"
            className="h-14 mb-3"
            style={{ objectFit: 'contain' }}
          />
          <p className="text-xs text-muted-foreground italic tracking-wide">
            Every day, care.
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Warehouse Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Whirlpool Bangladesh · Central Warehouse
          </p>
          <img
            src="/whirlpool-logo-white.svg"
            alt="Whirlpool"
            className="h-12 mb-3 hidden dark:block"
            style={{ objectFit: 'contain' }}
          />
          <h1 className="text-xl font-semibold tracking-tight">Warehouse Management System</h1>
          <p className="text-sm text-muted-foreground mt-1">Whirlpool Bangladesh</p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-lg">
          <h2 className="text-lg font-semibold mb-1">Sign in to your account</h2>
          <p className="text-sm text-muted-foreground mb-6">Enter your credentials to access the dashboard</p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  className={inputClass + ' pl-9'}
                  placeholder="admin@whirlpool-bd.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={inputClass + ' pl-9 pr-9'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm',
                'hover:bg-primary/90 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'inline-flex items-center justify-center gap-2',
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-muted-foreground mb-2">Demo accounts (click to fill):</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: 'admin', label: 'Admin' },
                { role: 'manager', label: 'Manager' },
                { role: 'staff', label: 'Staff' },
              ].map((d) => (
                <button
                  key={d.role}
                  onClick={() => fillDemo(d.role)}
                  className="h-8 rounded-md border border-input bg-background hover:bg-accent text-xs font-medium transition-colors"
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">Any password works in demo mode</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Whirlpool Bangladesh · WMS v2.0 · Powered by Next.js
        </p>
      </div>
    </div>
  )
}
