'use client'
import {
  LayoutDashboard, Boxes, Database, PackageOpen, Truck, BarChart3, ClipboardList,
  Search, Bell, Sun, Moon, Menu, ChevronLeft, RefreshCw, Warehouse, CircleUser,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import { useApp, MODULES, type ModuleKey } from '@/store/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { toast } from 'sonner'

const ICONS: Record<string, any> = {
  LayoutDashboard, Boxes, Database, PackageOpen, Truck, BarChart3, ClipboardList,
}

// Whirlpool wordmark — simplified "W" mark in a gold ring (mimics the brand's swirl)
function WhirlpoolMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="0" y="0" width="48" height="48" rx="10" fill="var(--whp-blue)" />
      {/* gold swirl arc */}
      <path
        d="M 10 30 C 10 18, 18 10, 30 10 C 38 10, 41 14, 41 18 C 41 22, 38 24, 34 24 C 31 24, 30 22, 30 21"
        stroke="var(--whp-gold)" strokeWidth="3.5" strokeLinecap="round" fill="none"
      />
      {/* W shape */}
      <text
        x="24" y="34" textAnchor="middle"
        fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900" fill="white"
      >W</text>
    </svg>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { active, setActive, sidebarCollapsed, toggleSidebar } = useApp()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [reseeding, setReseeding] = useState(false)
  useEffect(() => setMounted(true), [])

  async function reseed() {
    setReseeding(true)
    try {
      const r = await fetch('/api/seed', { method: 'POST' })
      const j = await r.json()
      if (j.ok) {
        toast.success('Demo data re-seeded', { description: 'Whirlpool BD warehouse data restored.' })
        setTimeout(() => window.location.reload(), 800)
      } else {
        toast.error('Reseed failed', { description: j.error })
      }
    } catch (e: any) {
      toast.error('Reseed failed', { description: e.message })
    } finally {
      setReseeding(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar — desktop */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ${
          sidebarCollapsed ? 'w-[68px]' : 'w-[248px]'
        }`}
      >
        <SidebarContent collapsed={sidebarCollapsed} active={active} setActive={setActive} />
      </aside>

      {/* Sidebar — mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0 bg-sidebar border-sidebar-border">
          <SidebarContent collapsed={false} active={active} setActive={(a) => { setActive(a); setMobileOpen(false) }} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 px-4 md:px-6">
          <Button
            variant="ghost" size="icon" className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="hidden md:inline-flex"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={`h-5 w-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </Button>

          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search SKUs, orders, dealers…  (⌘K)"
              className="pl-9 h-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') toast.info('Global search coming soon', { description: 'Try the sidebar navigation for now.' })
              }}
            />
          </div>

          <div className="flex-1 sm:hidden" />

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost" size="sm" className="hidden lg:inline-flex gap-2 text-muted-foreground"
              onClick={reseed} disabled={reseeding}
              title="Reset demo data"
            >
              <RefreshCw className={`h-4 w-4 ${reseeding ? 'animate-spin' : ''}`} />
              <span className="hidden xl:inline">{reseeding ? 'Reseeding…' : 'Reseed'}</span>
            </Button>
            <Button
              variant="ghost" size="icon" aria-label="Notifications"
              className="relative"
              onClick={() => toast.info('No new notifications')}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
            </Button>
            <Button
              variant="ghost" size="icon" aria-label="Toggle theme"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {mounted && theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Separator orientation="vertical" className="mx-1 h-7" />
            <div className="flex items-center gap-2 pl-1">
              <Avatar className="h-9 w-9 bg-primary/10 border">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">FA</AvatarFallback>
              </Avatar>
              <div className="hidden xl:block leading-tight">
                <p className="text-sm font-medium">Foysal Ahmed</p>
                <p className="text-xs text-muted-foreground">Warehouse Admin</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>

        <footer className="border-t bg-background px-6 py-3 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Whirlpool Bangladesh</span>
            <span>· Warehouse Management System · v2.0</span>
          </span>
          <span className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">Single-warehouse</Badge>
            <span>Next.js 16 · Prisma · SQLite</span>
          </span>
        </footer>
      </div>
    </div>
  )
}

function SidebarContent({
  collapsed, active, setActive,
}: { collapsed: boolean; active: ModuleKey; setActive: (a: ModuleKey) => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={`flex h-16 items-center gap-3 border-b border-sidebar-border ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
        <WhirlpoolMark size={36} />
        {!collapsed && (
          <div className="leading-tight min-w-0">
            <p className="font-semibold tracking-tight truncate text-sidebar-foreground">Whirlpool BD</p>
            <p className="text-[11px] text-sidebar-foreground/60 truncate">Warehouse Management</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {!collapsed && (
          <p className="px-3 pt-2 pb-1.5 text-[11px] uppercase tracking-wider text-sidebar-foreground/50 font-medium">Warehouse Ops</p>
        )}
        {MODULES.map((m) => {
          const Icon = ICONS[m.icon] || LayoutDashboard
          const isActive = active === m.key
          return (
            <button
              key={m.key}
              onClick={() => setActive(m.key)}
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? m.label : undefined}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? '' : 'text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground'}`} />
              {!collapsed && (
                <span className="flex-1 text-left truncate">{m.label}</span>
              )}
              {!collapsed && isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground/80" />
              )}
            </button>
          )
        })}
      </nav>

      {/* User card at bottom */}
      {!collapsed && (
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors cursor-pointer">
            <div className="grid place-items-center h-9 w-9 rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
              <CircleUser className="h-5 w-5" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">Foysal Ahmed</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">admin@whirlpool-bd.com</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
