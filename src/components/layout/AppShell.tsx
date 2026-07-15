'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { NotificationsPanel } from './NotificationsPanel'

// ═══════════════════════════════════════════════════════════════
//  AppShell — top-level layout: sidebar + topbar + content + footer
//  Plus global overlays: command palette (⌘K) + notifications panel
// ═══════════════════════════════════════════════════════════════

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar mobileOpen={mobileSidebarOpen} onMobileOpenChange={setMobileSidebarOpen} />

      <div className="flex flex-1 flex-col min-w-0">
        <Topbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 min-w-0 overflow-x-hidden">
          {children}
        </main>

        <footer className="border-t bg-background px-6 py-3 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Whirlpool Bangladesh</span>
            <span>· Warehouse Management System · v2.0</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="font-mono">Phase 0 · Foundation</span>
          </span>
        </footer>
      </div>

      {/* Global overlays */}
      <CommandPalette />
      <NotificationsPanel />
    </div>
  )
}
