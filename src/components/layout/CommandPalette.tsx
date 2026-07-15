'use client'

import { useEffect, useState } from 'react'
import {
  Search, ArrowRight, LayoutDashboard, Boxes, Database, PackageOpen,
  Truck, BarChart3, ClipboardList, Sun, Moon, RefreshCw,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { MODULES, type ModuleKey } from '@/domain/modules'
import { useUI } from '@/lib/store/ui'
import { cn } from '@/lib/utils'
import { systemApi } from '@/lib/api/endpoints'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════════════
//  CommandPalette — ⌘K / Ctrl+K — fuzzy navigation & quick actions
// ═══════════════════════════════════════════════════════════════

interface CommandItem {
  id: string
  label: string
  hint?: string
  icon: any
  group: 'Navigate' | 'Actions' | 'Theme'
  keywords?: string
  disabled?: boolean
  action: () => void
}

export function CommandPalette() {
  const { commandOpen, setCommandOpen, setActiveModule } = useUI()
  const { theme, setTheme } = useTheme()
  const [query, setQuery] = useState('')

  // Reset query when palette opens/closes
  useEffect(() => { if (commandOpen) setQuery('') }, [commandOpen])

  async function reseed() {
    setCommandOpen(false)
    try {
      const r = await systemApi.reseed()
      if (r.ok) {
        toast.success('Demo data re-seeded')
        setTimeout(() => window.location.reload(), 600)
      }
    } catch (e: any) {
      toast.error('Reseed failed', { description: e.message })
    }
  }

  const items: CommandItem[] = [
    ...MODULES.map((m) => ({
      id: `nav-${m.key}`,
      label: m.label,
      hint: m.description,
      icon: m.icon,
      group: 'Navigate' as const,
      keywords: m.shortLabel,
      disabled: !m.enabled,
      action: () => { setActiveModule(m.key as ModuleKey); setCommandOpen(false) },
    })),
    { id: 'theme-toggle', label: 'Toggle theme', hint: 'Light ↔ Dark', icon: theme === 'dark' ? Sun : Moon, group: 'Theme', action: () => { setTheme(theme === 'dark' ? 'light' : 'dark'); setCommandOpen(false) } },
    { id: 'action-reseed', label: 'Reseed demo data', hint: 'Reset all data to defaults', icon: RefreshCw, group: 'Actions', action: reseed },
  ]

  const filtered = query
    ? items.filter((i) => {
        const q = query.toLowerCase()
        return i.label.toLowerCase().includes(q) ||
               i.hint?.toLowerCase().includes(q) ||
               i.keywords?.toLowerCase().includes(q) ||
               i.group.toLowerCase().includes(q)
      })
    : items

  // Group filtered items
  const groups = filtered.reduce((acc, item) => {
    (acc[item.group] ||= []).push(item)
    return acc
  }, {} as Record<string, CommandItem[]>)

  return (
    <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
      <DialogContent className="p-0 gap-0 overflow-hidden max-w-2xl top-[20%] translate-y-0">
        <VisuallyHidden>
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>Search modules and quick actions</DialogDescription>
        </VisuallyHidden>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 h-14 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] font-mono text-muted-foreground border rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="px-2">
              <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{group}</p>
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    disabled={item.disabled}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent',
                    )}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                    {item.hint && <span className="text-xs text-muted-foreground truncate max-w-xs">{item.hint}</span>}
                    {item.disabled && <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">Soon</span>}
                    {!item.disabled && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </button>
                )
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No commands match &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
