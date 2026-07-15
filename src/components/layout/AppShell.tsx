'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { NotificationsPanel } from './NotificationsPanel'

// ═══════════════════════════════════════════════════════════════
//  AppShell — top-level layout: sidebar + topbar + content + footer
//  Layout strategy:
//  - Outer container: h-screen + overflow-hidden (no page-level scroll)
//  - Sidebar: h-screen, own internal scroll if nav overflows
//  - Main column: h-screen + flex-col, with main as flex-1 overflow-y-auto
//  This means the sidebar stays put while only the content scrolls.
// ═══════════════════════════════════════════════════════════════

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar mobileOpen={mobileSidebarOpen} onMobileOpenChange={setMobileSidebarOpen} />

      <div className="flex flex-1 flex-col min-w-0 h-screen">
        <Topbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          {children}
        </main>

        <footer className="border-t bg-background px-6 py-3 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Whirlpool Bangladesh</span>
            <span>· Warehouse Management System · v2.0</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="font-mono">Phase 2 · Catalog complete</span>
          </span>
        </footer>
      </div>

      {/* Global overlays */}
      <CommandPalette />
      <NotificationsPanel />
    </div>
  )
}
