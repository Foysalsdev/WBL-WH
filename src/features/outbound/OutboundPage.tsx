'use client'

import { useState } from 'react'
import { Truck, Plus, ChevronRight, PackageCheck, ScanLine, FileText, ClipboardList, ShieldCheck } from 'lucide-react'
import { PageHeader, StatCard } from '@/components/system'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSalesOrders } from './hooks'
import { SOListTab } from './SOListTab'
import { WorkflowTab } from './WorkflowTab'
import { SoDialog } from './SoDialog'
import { num } from '@/lib/format'

// ═══════════════════════════════════════════════════════════════
//  OutboundPage — 5-step dispatch workflow
//  Pick → Scan → Invoice → Dispatch → POD
// ═══════════════════════════════════════════════════════════════

export function OutboundPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const { data: sos } = useSalesOrders()

  const stats = (sos || []).reduce(
    (acc, so) => {
      acc.total += 1
      if (so.status === 'confirmed') acc.pickQueue += 1
      if (so.status === 'picked') acc.scanQueue += 1
      if (so.status === 'scanned') acc.invoiceQueue += 1
      if (so.status === 'invoiced') acc.dispatchQueue += 1
      if (so.status === 'dispatched') acc.inTransit += 1
      if (so.status === 'delivered') acc.delivered += 1
      return acc
    },
    { total: 0, pickQueue: 0, scanQueue: 0, invoiceQueue: 0, dispatchQueue: 0, inTransit: 0, delivered: 0 },
  )

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Outbound · Order Dispatch"
        description="5-step workflow: Pick → Scan → Invoice → Dispatch → POD"
        icon={Truck}
        breadcrumb={
          <>
            <span>Whirlpool BD</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Outbound</span>
          </>
        }
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New SO
          </button>
        }
      />

      {/* Workflow step cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 stagger">
        <StatCard label="Awaiting Pick" value={num(stats.pickQueue)} icon={ClipboardList} tone="info" />
        <StatCard label="Awaiting Scan" value={num(stats.scanQueue)} icon={ScanLine} tone="info" />
        <StatCard label="Awaiting Invoice" value={num(stats.invoiceQueue)} icon={FileText} tone="info" />
        <StatCard label="Awaiting Dispatch" value={num(stats.dispatchQueue)} icon={PackageCheck} tone="warning" />
        <StatCard label="In Transit (POD pending)" value={num(stats.inTransit)} icon={Truck} tone="warning" />
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all"><Truck className="h-4 w-4 mr-1.5" />All Orders</TabsTrigger>
          <TabsTrigger value="pick"><ClipboardList className="h-4 w-4 mr-1.5" />Pick</TabsTrigger>
          <TabsTrigger value="scan"><ScanLine className="h-4 w-4 mr-1.5" />Scan</TabsTrigger>
          <TabsTrigger value="invoice"><FileText className="h-4 w-4 mr-1.5" />Invoice</TabsTrigger>
          <TabsTrigger value="dispatch"><PackageCheck className="h-4 w-4 mr-1.5" />Dispatch</TabsTrigger>
          <TabsTrigger value="pod"><ShieldCheck className="h-4 w-4 mr-1.5" />POD</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4 animate-fade-in"><SOListTab /></TabsContent>
        <TabsContent value="pick" className="mt-4 animate-fade-in"><WorkflowTab step="pick" /></TabsContent>
        <TabsContent value="scan" className="mt-4 animate-fade-in"><WorkflowTab step="scan" /></TabsContent>
        <TabsContent value="invoice" className="mt-4 animate-fade-in"><WorkflowTab step="invoice" /></TabsContent>
        <TabsContent value="dispatch" className="mt-4 animate-fade-in"><WorkflowTab step="dispatch" /></TabsContent>
        <TabsContent value="pod" className="mt-4 animate-fade-in"><WorkflowTab step="pod" /></TabsContent>
      </Tabs>

      <SoDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
