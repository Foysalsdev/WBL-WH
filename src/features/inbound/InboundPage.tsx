'use client'

import { useState } from 'react'
import { PackageOpen, Plus, ChevronRight, ClipboardCheck, History } from 'lucide-react'
import { PageHeader, StatCard, StatusBadge } from '@/components/system'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePurchaseOrders } from './hooks'
import { POListTab } from './POListTab'
import { GrnQueueTab } from './GrnQueueTab'
import { ReceiptHistoryTab } from './ReceiptHistoryTab'
import { PoDialog } from './PoDialog'
import { num, bdt, date } from '@/lib/format'

// ═══════════════════════════════════════════════════════════════
//  InboundPage — Purchase Orders + GRN workflow + Receipt History
// ═══════════════════════════════════════════════════════════════

export function InboundPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const { data: pos } = usePurchaseOrders()

  const stats = (pos || []).reduce(
    (acc, po) => {
      acc.total += 1
      if (['draft', 'ordered', 'partial'].includes(po.status)) acc.open += 1
      if (po.status === 'received') acc.received += 1
      acc.value += po.totalAmount
      acc.damaged += (po.items || []).reduce((s, it) => s + (it.failedQty || 0), 0)
      return acc
    },
    { total: 0, open: 0, received: 0, value: 0, damaged: 0 },
  )

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Inbound · Goods Receipt"
        description="Receive Whirlpool appliance consignments from sourcing partners with quality-check & putaway."
        icon={PackageOpen}
        breadcrumb={
          <>
            <span>Whirlpool BD</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Inbound</span>
          </>
        }
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New PO
          </button>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 stagger">
        <StatCard label="Total POs" value={num(stats.total)} icon={PackageOpen} tone="primary" />
        <StatCard label="Open POs" value={num(stats.open)} icon={ClipboardCheck} tone="info" />
        <StatCard label="Received POs" value={num(stats.received)} icon={History} tone="success" />
        <StatCard label="QC Failed Units" value={num(stats.damaged)} tone={stats.damaged > 0 ? 'destructive' : 'default'} />
      </div>

      <Tabs defaultValue="po">
        <TabsList>
          <TabsTrigger value="po"><PackageOpen className="h-4 w-4 mr-1.5" />Purchase Orders</TabsTrigger>
          <TabsTrigger value="grn"><ClipboardCheck className="h-4 w-4 mr-1.5" />GRN Queue</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-1.5" />Receipt History</TabsTrigger>
        </TabsList>
        <TabsContent value="po" className="mt-4 animate-fade-in"><POListTab /></TabsContent>
        <TabsContent value="grn" className="mt-4 animate-fade-in"><GrnQueueTab /></TabsContent>
        <TabsContent value="history" className="mt-4 animate-fade-in"><ReceiptHistoryTab /></TabsContent>
      </Tabs>

      <PoDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
