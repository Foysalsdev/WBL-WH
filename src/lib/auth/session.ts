'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setLogoutHandler } from '@/lib/api/client'

// ═══════════════════════════════════════════════════════════════
//  Auth store — login/logout, user session, RBAC permissions
// ═══════════════════════════════════════════════════════════════

interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  avatar: string | null
  active: boolean
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  permissions: string[]
  isAuthenticated: boolean
  isLoading: boolean

  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  hasPermission: (module: string, action: string) => boolean
  hasAnyPermission: (module: string) => boolean
  setPermissions: (perms: string[]) => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      permissions: [],
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
          const data = await res.json()

          if (!res.ok) {
            return { ok: false, error: data.error || 'Login failed' }
          }

          set({
            user: data.user,
            token: data.token,
            permissions: data.permissions || [],
            isAuthenticated: true,
            isLoading: false,
          })
          return { ok: true }
        } catch (e: any) {
          set({ isLoading: false })
          return { ok: false, error: e.message }
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          permissions: [],
          isAuthenticated: false,
        })
        // Clear HTTP-only cookie by navigating to logout endpoint
        if (typeof window !== 'undefined') {
          fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
        }
      },

      hasPermission: (module, action) => {
        const { permissions, user } = get()
        if (!user) return false
        // Admin has all permissions
        if (user.role === 'admin') return true
        return permissions.includes(`${module}.${action}`)
      },

      hasAnyPermission: (module) => {
        const { permissions, user } = get()
        if (!user) return false
        if (user.role === 'admin') return true
        return permissions.some(p => p.startsWith(`${module}.`))
      },

      setPermissions: (perms) => set({ permissions: perms }),
    }),
    {
      name: 'whp-auth',
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        permissions: s.permissions,
        isAuthenticated: s.isAuthenticated,
      }),
    },
  ),
)
