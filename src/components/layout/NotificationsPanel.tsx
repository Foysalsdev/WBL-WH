'use client'

import { Bell, X, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useUI } from '@/lib/store/ui'

// ═══════════════════════════════════════════════════════════════
//  NotificationsPanel — sliding panel showing warehouse alerts
// ═══════════════════════════════════════════════════════════════

interface NotificationItem {
  id: string
  type: 'alert' | 'info' | 'success'
  title: string
  body: string
  time: string
}

// Placeholder notifications — Phase 2 will pull real data (low-stock, POD pending, etc.)
const PLACEHOLDER_NOTIFICATIONS: NotificationItem[] = [
  { id: '1', type: 'alert',   title: '4 SKUs below reorder level',        body: 'Whirlpool FP 570L, AC 2T, Dishwasher, Toaster need restocking.', time: '5m ago' },
  { id: '2', type: 'info',    title: 'PO-2026-00003 expected today',       body: 'Whirlpool Thailand consignment — 35 units of Dishwasher & Built-in Oven.', time: '2h ago' },
  { id: '3', type: 'success', title: 'SO-2026-00001 POD confirmed',         body: 'Delivered to Bashundhara Showroom in good condition.', time: '1d ago' },
  { id: '4', type: 'alert',   title: '2 units rejected at GRN',             body: 'QC failed for WHP-MW-25L-CONV against PO-2026-00002.', time: '1d ago' },
]

export function NotificationsPanel() {
  const { notificationsOpen, setNotificationsOpen } = useUI()

  return (
    <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <DialogContent className="p-0 gap-0 max-w-md top-[10%] translate-y-0 right-[5%] left-auto">
        <VisuallyHidden>
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription>Recent warehouse alerts and updates</DialogDescription>
        </VisuallyHidden>

        <div className="flex items-center justify-between px-4 h-14 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="font-semibold">Notifications</span>
            <Badge variant="secondary" className="text-[10px]">{PLACEHOLDER_NOTIFICATIONS.length}</Badge>
          </div>
          <button
            onClick={() => setNotificationsOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ScrollArea className="h-[400px]">
          <ul className="divide-y">
            {PLACEHOLDER_NOTIFICATIONS.map((n) => {
              const Icon = n.type === 'alert' ? AlertTriangle : n.type === 'success' ? CheckCircle2 : Info
              const tone = n.type === 'alert' ? 'text-amber-600 bg-amber-500/10' :
                           n.type === 'success' ? 'text-emerald-600 bg-emerald-500/10' :
                           'text-sky-600 bg-sky-500/10'
              return (
                <li key={n.id} className="flex gap-3 p-4 hover:bg-muted/40 transition-colors cursor-pointer">
                  <div className={`grid place-items-center h-9 w-9 rounded-lg shrink-0 ${tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{n.time}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </ScrollArea>

        <div className="border-t p-3">
          <button
            onClick={() => setNotificationsOpen(false)}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5"
          >
            Mark all as read
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
