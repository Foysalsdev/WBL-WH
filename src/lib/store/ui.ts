'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModuleKey } from '@/domain/modules'

interface UIState {
  activeModule: ModuleKey
  sidebarCollapsed: boolean
  commandOpen: boolean
  notificationsOpen: boolean
  mastersTab: string

  setActiveModule: (m: ModuleKey) => void
  toggleSidebar: () => void
  setCommandOpen: (o: boolean) => void
  setNotificationsOpen: (o: boolean) => void
  setMastersTab: (t: string) => void
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      activeModule: 'dashboard',
      sidebarCollapsed: false,
      commandOpen: false,
      notificationsOpen: false,
      mastersTab: 'products',

      setActiveModule: (activeModule) => set({ activeModule }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
      setMastersTab: (mastersTab) => set({ mastersTab }),
    }),
    {
      name: 'whp-ui',
      partialize: (s) => ({
        activeModule: s.activeModule,
        sidebarCollapsed: s.sidebarCollapsed,
        mastersTab: s.mastersTab,
      }),
    },
  ),
)
