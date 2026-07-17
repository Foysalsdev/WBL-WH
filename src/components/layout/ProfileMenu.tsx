'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import {
  Sun, Moon, Settings, LogOut, ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/session'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
//  ProfileMenu — dropdown with Light/Dark toggle, Settings, Logout
//  Replaces the hardcoded user card in Topbar.
// ═══════════════════════════════════════════════════════════════

export function ProfileMenu() {
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) return null

  const isDark = theme === 'dark'

  function handleLogout() {
    setOpen(false)
    logout()
    window.location.reload()
  }

  function toggleTheme() {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger — avatar + name + chevron */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent transition-colors"
        aria-label="Profile menu"
      >
        <Avatar className="h-8 md:h-9 w-8 md:w-9 border shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="hidden xl:block leading-tight text-left">
          <p className="text-sm font-medium truncate max-w-[120px]">{user.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
        </div>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-60 rounded-xl border bg-popover shadow-lg z-50 overflow-hidden animate-scale-in">
          {/* User info header */}
          <div className="flex items-center gap-3 p-3 border-b">
            <Avatar className="h-10 w-10 border shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            {/* Light/Dark toggle */}
            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="flex-1 text-left">{isDark ? 'Light mode' : 'Dark mode'}</span>
              <span className={cn('h-4 w-7 rounded-full transition-colors relative', isDark ? 'bg-primary' : 'bg-muted-foreground/30')}>
                <span className={cn('absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform', isDark ? 'translate-x-3' : 'translate-x-0.5')} />
              </span>
            </button>

            {/* Profile Settings */}
            <button
              onClick={() => {
                setOpen(false)
                window.location.href = '/?module=settings'
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              <span className="flex-1 text-left">Profile Settings</span>
            </button>

            {/* Divider */}
            <div className="my-1 h-px bg-border" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span className="flex-1 text-left">Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
