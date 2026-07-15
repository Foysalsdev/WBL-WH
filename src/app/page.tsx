'use client'

import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/lib/api/query-provider'
import { AppShell } from '@/components/layout/AppShell'
import { useUI } from '@/lib/store/ui'
import { useAuth } from '@/lib/auth/session'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { CatalogPage } from '@/features/catalog/CatalogPage'
import { InboundPage } from '@/features/inbound/InboundPage'
import { OutboundPage } from '@/features/outbound/OutboundPage'
import { ReportsPage } from '@/features/reports/ReportsPage'

const ENABLED_MODULES = new Set(['dashboard', 'inventory', 'masters', 'inbound', 'outbound', 'reports'])

export default function Home() {
  const activeModule = useUI((s) => s.activeModule)
  const isAuthenticated = useAuth((s) => s.isAuthenticated)

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryProvider>
        {!isAuthenticated ? (
          <LoginPage />
        ) : (
          <AppShell>
            {activeModule === 'dashboard'  && <DashboardPage />}
            {activeModule === 'inventory'  && <InventoryPage />}
            {activeModule === 'masters'    && <CatalogPage />}
            {activeModule === 'inbound'    && <InboundPage />}
            {activeModule === 'outbound'   && <OutboundPage />}
            {activeModule === 'reports'    && <ReportsPage />}
            {!ENABLED_MODULES.has(activeModule) && <ComingSoon />}
          </AppShell>
        )}
      </QueryProvider>
    </ThemeProvider>
  )
}

/** Placeholder for modules not yet delivered — shows a friendly "coming next" message */
function ComingSoon() {
  const activeModule = useUI((s) => s.activeModule)
  const labelMap: Record<string, string> = {
    audit: 'Audit Log',
  }
  const label = labelMap[activeModule] || 'This module'

  return (
    <div className="p-6 max-w-2xl mx-auto text-center py-20">
      <div className="inline-grid place-items-center h-16 w-16 rounded-2xl bg-primary/10 text-primary mb-4">
        <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
          <path d="M 10 30 C 10 18, 18 10, 30 10 C 38 10, 41 14, 41 18 C 41 22, 38 24, 34 24 C 31 24, 30 22, 30 21"
            stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </svg>
      </div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">{label}</h2>
      <p className="text-muted-foreground mb-1">
        This module will be built in the next phase of our phased rollout.
      </p>
      <p className="text-sm text-muted-foreground">
        All core modules are live — Dashboard, Inventory, Catalog, Inbound, Outbound, Reports.
      </p>
    </div>
  )
}
