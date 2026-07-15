'use client'
import { ThemeProvider } from 'next-themes'
import { AppShell } from '@/components/erp/AppShell'
import { useApp } from '@/store/app'
import { DashboardPage } from '@/components/erp/DashboardPage'
import { InventoryPage } from '@/components/erp/InventoryPage'
import { MastersPage } from '@/components/erp/MastersPage'
import { InboundPage } from '@/components/erp/InboundPage'
import { OutboundPage } from '@/components/erp/OutboundPage'
import { ReportsPage, AuditPage } from '@/components/erp/ReportsPage'

export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AppShell>
        <CurrentModule />
      </AppShell>
    </ThemeProvider>
  )
}

function CurrentModule() {
  const active = useApp((s) => s.active)
  switch (active) {
    case 'dashboard':  return <DashboardPage />
    case 'inventory':  return <InventoryPage />
    case 'masters':    return <MastersPage />
    case 'inbound':    return <InboundPage />
    case 'outbound':   return <OutboundPage />
    case 'reports':    return <ReportsPage />
    case 'audit':      return <AuditPage />
    default:           return <DashboardPage />
  }
}
