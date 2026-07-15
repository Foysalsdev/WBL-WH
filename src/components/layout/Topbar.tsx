'use client'

import { useEffect, useState } from 'react'
import { Search, Bell, Sun, Moon, Menu, RefreshCw, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useUI } from '@/lib/store/ui'
import { useAuth } from '@/lib/auth/session'
import { initials } from '@/lib/format'
import { systemApi } from '@/lib/api/endpoints'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════════════
//  Topbar — global search trigger, theme toggle, notifications, user
// ═══════════════════════════════════════════════════════════════

interface TopbarProps {
  onOpenMobileSidebar: () => void
}

export function Topbar({ onOpenMobileSidebar }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const { setCommandOpen, setNotificationsOpen } = useUI()
  const user = useAuth((s) => s.user)
  const [mounted, setMounted] = useState(false)
  const [reseeding, setReseeding] = useState(false)

  useEffect(() => setMounted(true), [])

  // ⌘K / Ctrl+K opens command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandOpen])

  async function reseed() {
    setReseeding(true)
    try {
      const r = await systemApi.reseed()
      if (r.ok) {
        toast.success('Demo data re-seeded', { description: 'Whirlpool BD warehouse data restored.' })
        setTimeout(() => window.location.reload(), 800)
      } else {
        toast.error('Reseed failed', { description: r.error })
      }
    } catch (e: any) {
      toast.error('Reseed failed', { description: e.message })
    } finally {
      setReseeding(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center gap-2 md:gap-3 border-b bg-background/80 glass px-2 md:px-6 shrink-0">
      {/* Mobile menu */}
      <Button
        variant="ghost" size="icon" className="md:hidden shrink-0"
        onClick={onOpenMobileSidebar} aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search trigger — compact on mobile */}
      <button
        onClick={() => setCommandOpen(true)}
        className="group flex items-center gap-2 md:gap-3 h-9 md:h-10 flex-1 md:flex-none md:w-full md:max-w-md rounded-lg bg-muted/60 px-2 md:px-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate hidden sm:inline">
          Search SKUs, orders, dealers…
        </span>
        <span className="flex-1 text-left sm:hidden">Search…</span>
        <kbd className="hidden md:inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono shrink-0">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1 hidden md:block" />

      {/* Actions */}
      <div className="flex items-center gap-1 md:gap-1.5 shrink-0">
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
          className="relative h-9 w-9"
          onClick={() => setNotificationsOpen(true)}
        >
          <Bell className="h-4 md:h-5 w-4 md:w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
        </Button>

        <Button
          variant="ghost" size="icon" aria-label="Toggle theme"
          className="h-9 w-9"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {mounted && theme === 'dark' ? <Sun className="h-4 md:h-5 w-4 md:w-5" /> : <Moon className="h-4 md:h-5 w-4 md:w-5" />}
        </Button>

        <Separator orientation="vertical" className="mx-1 h-7 hidden sm:block" />

        <div className="flex items-center gap-2 pl-0 sm:pl-1">
          <Avatar className="h-8 md:h-9 w-8 md:w-9 border shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
              {user ? initials(user.name) : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="hidden xl:block leading-tight">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
          onClick={() => {
            useAuth.getState().logout()
            window.location.reload()
          }}
          aria-label="Logout"
          title="Logout"
        >
          <LogOut className="h-4 md:h-5 w-4 md:w-5" />
        </Button>
      </div>
    </header>
  )
}
