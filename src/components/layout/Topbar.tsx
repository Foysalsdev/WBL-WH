'use client'

import { useEffect, useState } from 'react'
import { Search, Bell, Sun, Moon, Menu, RefreshCw } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useUI } from '@/lib/store/ui'
import { useSession } from '@/lib/auth/session'
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
  const user = useSession((s) => s.user)
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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 glass px-4 md:px-6">
      {/* Mobile menu */}
      <Button
        variant="ghost" size="icon" className="md:hidden"
        onClick={onOpenMobileSidebar} aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search trigger */}
      <button
        onClick={() => setCommandOpen(true)}
        className="group flex items-center gap-3 h-10 w-full max-w-md rounded-lg bg-muted/60 px-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">
          Search SKUs, orders, dealers…
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      {/* Actions */}
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
          onClick={() => setNotificationsOpen(true)}
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
          <Avatar className="h-9 w-9 border">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
              {user ? initials(user.name) : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="hidden xl:block leading-tight">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
