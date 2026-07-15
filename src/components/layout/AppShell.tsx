'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { NotificationsPanel } from './NotificationsPanel'

// ═══════════════════════════════════════════════════════════════
//  AppShell — top-level layout (mobile + desktop)
//
//  Mobile (< md): sidebar = drawer overlay, topbar = compact
//  Desktop (>= md): sidebar = fixed rail, main = scrollable content
// ═══════════════════════════════════════════════════════════════

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <Sidebar mobileOpen={mobileSidebarOpen} onMobileOpenChange={setMobileSidebarOpen} />

      <div className="flex flex-1 flex-col min-w-0 h-[100dvh]">
        <Topbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          {children}
        </main>

        <footer className="border-t bg-background px-3 py-2 text-[10px] text-muted-foreground flex flex-wrap items-center justify-between gap-1 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground">Whirlpool BD</span>
            <span className="hidden sm:inline">· WMS · v2.0</span>
          </span>
          <span className="font-mono hidden sm:inline">Phase 5 · Reports</span>
        </footer>
      </div>

      {/* Global overlays */}
      <CommandPalette />
      <NotificationsPanel />
    </div>
  )
}
