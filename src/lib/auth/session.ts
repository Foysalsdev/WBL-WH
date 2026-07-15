'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  Session store — currently hardcoded admin (Phase 8: NextAuth)
// ═══════════════════════════════════════════════════════════════

interface SessionState {
  user: User | null
  setSession: (user: User) => void
  clear: () => void
  /** Check if user has one of the given roles */
  can: (...roles: UserRole[]) => boolean
}

const DEFAULT_USER: User = {
  id: 'usr_admin',
  email: 'admin@whirlpool-bd.com',
  name: 'Foysal Ahmed',
  role: 'admin',
  avatar: null,
  active: true,
  createdAt: new Date('2026-01-01'),
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      user: DEFAULT_USER,
      setSession: (user) => set({ user }),
      clear: () => set({ user: null }),
      can: (...roles) => {
        const u = get().user
        return !!u && roles.includes(u.role)
      },
    }),
    { name: 'whp-session' },
  ),
)
