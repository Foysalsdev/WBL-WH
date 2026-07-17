'use client'

import { useEffect } from 'react'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/lib/api/query-provider'
import { AppShell } from '@/components/layout/AppShell'
import { useUI } from '@/lib/store/ui'
import { useAuth } from '@/lib/auth/session'
import { setLogoutHandler } from '@/lib/api/client'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { CatalogPage } from '@/features/catalog/CatalogPage'
import { InboundPage } from '@/features/inbound/InboundPage'
import { OutboundPage } from '@/features/outbound/OutboundPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { FinancePage } from '@/features/finance/FinancePage'
import { UsersPage } from '@/features/users/UsersPage'
import { AuditPage } from '@/features/audit/AuditPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

const ENABLED_MODULES = new Set([
  'dashboard', 'inventory', 'masters', 'inbound', 'outbound',
  'reports', 'finance', 'users', 'audit', 'settings',
])

export default function Home() {
  const activeModule = useUI((s) => s.activeModule)
  const setActiveModule = useUI((s) => s.setActiveModule)
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const logout = useAuth((s) => s.logout)

  // Register 401 handler with API client — auto-logout on token expiry
  useEffect(() => {
    setLogoutHandler(() => {
      logout()
      window.location.reload()
    })
  }, [logout])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mod = params.get('module')
    if (mod) {
      setActiveModule(mod as any)
      window.history.replaceState({}, '', '/')
    }
  }, [setActiveModule])

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
            {activeModule === 'finance'    && <FinancePage />}
            {activeModule === 'users'      && <UsersPage />}
            {activeModule === 'audit'      && <AuditPage />}
            {activeModule === 'settings'   && <SettingsPage />}
            {!ENABLED_MODULES.has(activeModule) && <ComingSoon />}
          </AppShell>
        )}
      </QueryProvider>
    </ThemeProvider>
  )
}

function ComingSoon() {
  return (
    <div className="p-6 max-w-2xl mx-auto text-center py-20">
      <h2 className="text-2xl font-semibold tracking-tight mb-2">Coming Soon</h2>
      <p className="text-muted-foreground">This module is not yet enabled.</p>
    </div>
  )
}
