'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle, Search } from 'lucide-react'
import { useAuth } from '@/lib/auth/session'
import { cn } from '@/lib/utils'
import { inputClass } from '@/lib/styles'

// ═══════════════════════════════════════════════════════════════
//  LoginPage — Whirlpool Bangladesh branded (matches website)
//  Layout: white background, gold accent, official logo + tagline
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
    <div className="min-h-[100dvh] flex flex-col bg-white">
      {/* ═══ Top Bar (matches website header) ═══ */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo (left) */}
          <img
            src="/whirlpool-logo.svg"
            alt="Whirlpool"
            className="h-8"
            style={{ objectFit: 'contain' }}
          />
          {/* Search bar (right) — decorative */}
          <div className="hidden md:flex items-center gap-2 h-9 px-3 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-400 w-64">
            <Search className="h-3.5 w-3.5" />
            <span>e.g. Inventory, Orders, Dealers</span>
          </div>
        </div>
      </header>

      {/* ═══ Main Content ═══ */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 bg-gradient-to-b from-white via-gray-50 to-white">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Hero (matches website hero banner) */}
          <div className="hidden lg:block">
            {/* Gold vertical accent bar */}
            <div className="flex items-start gap-4">
              <div className="w-1 h-32 bg-[#eeb111] mt-2" />
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-medium">
                  Every day, care.
                </p>
                <h1 className="text-4xl xl:text-5xl font-bold text-gray-900 leading-tight tracking-tight">
                  Warehouse
                  <br />
                  Management
                  <br />
                  <span className="text-[#eeb111]">System</span>
                </h1>
                <p className="mt-6 text-base text-gray-600 max-w-md leading-relaxed">
                  Extraordinary Range for Extraordinary Care, Everyday.
                  Central warehouse operations for Whirlpool Bangladesh.
                </p>
                {/* Stats */}
                <div className="mt-8 flex items-center gap-6">
                  <div>
                    <p className="text-2xl font-bold text-[#eeb111]">110+</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Years Global</p>
                  </div>
                  <div className="h-8 w-px bg-gray-300" />
                  <div>
                    <p className="text-2xl font-bold text-[#eeb111]">BD</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Bangladesh</p>
                  </div>
                  <div className="h-8 w-px bg-gray-300" />
                  <div>
                    <p className="text-2xl font-bold text-[#eeb111]">24/7</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Operations</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Login Card */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-6">
              <img
                src="/whirlpool-logo.svg"
                alt="Whirlpool"
                className="h-10"
                style={{ objectFit: 'contain' }}
              />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 p-8">
              <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Welcome back</h2>
              <p className="text-sm text-gray-500 mt-1 mb-6">
                Sign in to access the warehouse dashboard
              </p>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@whirlpool-bd.com"
                      className="w-full h-11 pl-10 pr-3 rounded-lg border border-gray-300 bg-white text-sm outline-none transition-all hover:border-gray-400 focus:border-[#eeb111] focus:ring-2 focus:ring-[#eeb111]/15"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 pl-10 pr-10 rounded-lg border border-gray-300 bg-white text-sm outline-none transition-all hover:border-gray-400 focus:border-[#eeb111] focus:ring-2 focus:ring-[#eeb111]/15"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded"
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
                  className="w-full h-11 rounded-lg bg-[#eeb111] text-gray-900 font-semibold text-sm shadow-lg shadow-[#eeb111]/30 hover:bg-[#d99d0a] hover:shadow-[#eeb111]/40 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
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
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-[11px] text-gray-500 mb-3 text-center uppercase tracking-wider">
                  Demo Credentials (click to fill)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { role: 'admin', label: 'Admin' },
                    { role: 'manager', label: 'Manager' },
                    { role: 'staff', label: 'Staff' },
                  ].map((d) => (
                    <button
                      key={d.role}
                      type="button"
                      onClick={() => fillDemo(d.role)}
                      className="h-9 rounded-lg border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700 hover:bg-[#eeb111]/10 hover:border-[#eeb111]/30 hover:text-[#d99d0a] transition-all active:scale-95"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Help text */}
            <p className="mt-6 text-center text-xs text-gray-400">
              Need help? Call <span className="text-gray-600 font-medium">09610 20 40 20</span>
            </p>
          </div>
        </div>
      </main>

      {/* ═══ Footer (matches website footer) ═══ */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/whirlpool-logo.svg"
              alt="Whirlpool"
              className="h-6"
              style={{ objectFit: 'contain' }}
            />
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs text-gray-500">Warehouse Management System</span>
          </div>
          <p className="text-xs text-gray-400">
            © 2026 Whirlpool of Bangladesh. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
