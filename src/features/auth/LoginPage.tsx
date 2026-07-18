'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth/session'
import { cn } from '@/lib/utils'
import { inputClass } from '@/lib/styles'

// ═══════════════════════════════════════════════════════════════
//  LoginPage — Whirlpool Bangladesh branded login
//  Two-column layout: banner (left) + login form (right)
//  Official Whirlpool branding: gold (#eeb111), navy, "Every day, care."
// ═══════════════════════════════════════════════════════════════

export function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated) router.push('/')
  }, [isAuthenticated, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please enter email and password')
      return
    }
    const result = await login(email, password)
    if (!result.ok) setError(result.error || 'Login failed')
  }

  function fillDemo(role: string) {
    setEmail(`${role}@whirlpool-bd.com`)
    setPassword('Admin@2026')
  }

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-background">
      {/* ═══ Left: Whirlpool Banner (hidden on mobile) ═══ */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#000000] via-[#0a0a0a] to-[#1a1a1a]">
        {/* Background image with overlay */}
        <img
          src="/whirlpool-banner.jpg"
          alt="Whirlpool — Every day, care."
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-[#eeb111]/15" />

        {/* Gold accent vertical bar (Whirlpool brand) */}
        <div className="absolute left-0 top-0 h-full w-1.5 bg-[#eeb111]" />

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Top: Logo + tagline */}
          <div>
            <img
              src="/whirlpool-logo.svg"
              alt="Whirlpool"
              className="h-12 mb-6 brightness-0 invert"
              style={{ objectFit: 'contain' }}
            />
            <p className="text-sm font-light tracking-wider text-white/70 uppercase">
              Every day, care.
            </p>
          </div>

          {/* Middle: Hero text */}
          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
              Warehouse
              <br />
              Management
              <br />
              <span className="text-[#eeb111]">System</span>
            </h1>
            <p className="text-base text-white/70 max-w-md leading-relaxed">
              Central warehouse operations for Whirlpool Bangladesh.
              Track inventory, manage dispatches, and serve every dealer with care.
            </p>
          </div>

          {/* Bottom: Stats / heritage */}
          <div className="flex items-center gap-8">
            <div>
              <p className="text-2xl font-bold text-[#eeb111]">110+</p>
              <p className="text-xs text-white/60 uppercase tracking-wider">Years Global</p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div>
              <p className="text-2xl font-bold text-[#eeb111]">BD</p>
              <p className="text-xs text-white/60 uppercase tracking-wider">Bangladesh</p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div>
              <p className="text-2xl font-bold text-[#eeb111]">24/7</p>
              <p className="text-xs text-white/60 uppercase tracking-wider">Operations</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Right: Login Form ═══ */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
        {/* Ambient gold orbs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[#eeb111]/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#eeb111]/8 blur-3xl" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo (banner hidden on mobile) */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <img
              src="/whirlpool-logo.svg"
              alt="Whirlpool"
              className="h-12 mb-2"
              style={{ objectFit: 'contain' }}
            />
            <p className="text-xs text-muted-foreground italic">Every day, care.</p>
          </div>

          {/* Header (desktop) */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to access the warehouse dashboard
            </p>
          </div>

          {/* Login card with glass effect */}
          <div className="glass-card rounded-2xl p-6 md:p-8">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@whirlpool-bd.com"
                    className={cn(inputClass, 'pl-10 h-11')}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={cn(inputClass, 'pl-10 pr-10 h-11')}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ios-press p-1 rounded-md"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-lg bg-[#eeb111] text-[#142032] font-semibold text-sm shadow-lg shadow-[#eeb111]/30 hover:bg-[#d99d0a] hover:shadow-[#eeb111]/40 active:scale-[0.98] transition-all duration-200 ios-press disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign in to Dashboard'
                )}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 pt-6 border-t border-border/60">
              <p className="text-[11px] text-muted-foreground mb-3 text-center uppercase tracking-wider">
                Demo Credentials (click to fill)
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { role: 'admin', label: 'Admin', color: 'bg-[#eeb111]/10 text-[#d99d0a] border-[#eeb111]/30' },
                  { role: 'manager', label: 'Manager', color: 'bg-sky-500/10 text-sky-600 border-sky-500/30' },
                  { role: 'staff', label: 'Staff', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
                ].map((d) => (
                  <button
                    key={d.role}
                    type="button"
                    onClick={() => fillDemo(d.role)}
                    className={cn(
                      'h-9 rounded-lg border text-xs font-medium ios-press transition-all',
                      d.color
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              © 2026 Whirlpool of Bangladesh · Central Warehouse
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Need help? Call 09610 20 40 20
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
