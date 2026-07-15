'use client'

import { ChevronLeft, CircleUser } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { MODULES, type ModuleKey } from '@/domain/modules'
import { useUI } from '@/lib/store/ui'
import { useSession } from '@/lib/auth/session'
import { cn } from '@/lib/utils'
import { BrandWordmark } from './BrandMark'

// ═══════════════════════════════════════════════════════════════
//  Sidebar — desktop rail + mobile drawer
// ═══════════════════════════════════════════════════════════════

interface SidebarProps {
  mobileOpen: boolean
  onMobileOpenChange: (o: boolean) => void
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  const { activeModule, setActiveModule, sidebarCollapsed, toggleSidebar } = useUI()

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={cn(
          'hidden md:flex flex-col shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
          sidebarCollapsed ? 'w-[68px]' : 'w-[248px]',
        )}
      >
        <SidebarContent
          collapsed={sidebarCollapsed}
          active={activeModule}
          onSelect={(m) => setActiveModule(m)}
          onCollapse={toggleSidebar}
        />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[260px] p-0 bg-sidebar border-sidebar-border">
          <SidebarContent
            collapsed={false}
            active={activeModule}
            onSelect={(m) => { setActiveModule(m); onMobileOpenChange(false) }}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

function SidebarContent({
  collapsed, active, onSelect, onCollapse,
}: {
  collapsed: boolean
  active: ModuleKey
  onSelect: (m: ModuleKey) => void
  onCollapse?: () => void
}) {
  const user = useSession((s) => s.user)

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={cn(
        'flex h-16 items-center border-b border-sidebar-border',
        collapsed ? 'justify-center px-2' : 'px-4',
      )}>
        <BrandWordmark collapsed={collapsed} />
      </div>

      {/* Collapse toggle (desktop only) */}
      {onCollapse && !collapsed && (
        <button
          onClick={onCollapse}
          className="hidden md:flex items-center gap-2 px-4 py-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Collapse
        </button>
      )}
      {onCollapse && collapsed && (
        <button
          onClick={onCollapse}
          className="hidden md:flex items-center justify-center px-2 py-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title="Expand sidebar"
        >
          <ChevronLeft className="h-4 w-4 rotate-180" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {!collapsed && (
          <p className="px-3 pt-2 pb-1.5 text-[11px] uppercase tracking-wider text-sidebar-foreground/50 font-medium">
            Warehouse Operations
          </p>
        )}
        {MODULES.map((m) => {
          const Icon = m.icon
          const isActive = active === m.key
          return (
            <button
              key={m.key}
              onClick={() => onSelect(m.key)}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center',
                !m.enabled && 'opacity-50 cursor-not-allowed',
              )}
              title={collapsed ? m.label : undefined}
              disabled={!m.enabled}
            >
              <Icon className={cn(
                'h-5 w-5 shrink-0',
                !isActive && 'text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground',
              )} />
              {!collapsed && (
                <span className="flex-1 text-left truncate">{m.label}</span>
              )}
              {!collapsed && !m.enabled && (
                <span className="text-[10px] text-sidebar-foreground/40 px-1.5 py-0.5 rounded bg-sidebar-foreground/10">
                  Soon
                </span>
              )}
              {!collapsed && isActive && m.enabled && (
                <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground/80" />
              )}
            </button>
          )
        })}
      </nav>

      {/* User card */}
      {!collapsed && user && (
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors cursor-pointer">
            <div className="grid place-items-center h-9 w-9 rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
              <CircleUser className="h-5 w-5" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
