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
    <div className="flex h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/30 relative">
      {/* Ambient gradient orbs — gives depth behind glass surfaces */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/8 dark:bg-primary/12 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-80 w-80 rounded-full bg-accent/8 dark:bg-accent/12 blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 h-72 w-72 rounded-full bg-info/6 dark:bg-info/10 blur-3xl" />
      </div>

      <Sidebar mobileOpen={mobileSidebarOpen} onMobileOpenChange={setMobileSidebarOpen} />

      <div className="flex flex-1 flex-col min-w-0 h-[100dvh]">
        <Topbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          {children}
        </main>

        <footer className="glass-strong border-t border-border/60 px-3 py-2 text-[10px] text-muted-foreground flex flex-wrap items-center justify-between gap-1 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground">Whirlpool BD</span>
            <span className="hidden sm:inline">· WMS · v2.0</span>
          </span>
          <span className="font-mono hidden sm:inline">Phase 6 · Finance</span>
        </footer>
      </div>

      {/* Global overlays */}
      <CommandPalette />
      <NotificationsPanel />
    </div>
  )
}
