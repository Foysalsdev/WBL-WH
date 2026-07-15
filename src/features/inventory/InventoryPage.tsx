'use client'

import { Boxes, History } from 'lucide-react'
import { PageHeader } from '@/components/system'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StockTab } from './StockTab'
import { MovementsTab } from './MovementsTab'

// ═══════════════════════════════════════════════════════════════
//  InventoryPage — Stock on Hand + Movement Ledger tabs
// ═══════════════════════════════════════════════════════════════

export function InventoryPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Inventory"
        description="Real-time stock levels, adjustments and movement history."
        icon={Boxes}
      />

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">
            <Boxes className="h-4 w-4 mr-1.5" />
            Stock on Hand
          </TabsTrigger>
          <TabsTrigger value="movements">
            <History className="h-4 w-4 mr-1.5" />
            Movement Ledger
          </TabsTrigger>
        </TabsList>
        <TabsContent value="stock" className="mt-4">
          <StockTab />
        </TabsContent>
        <TabsContent value="movements" className="mt-4">
          <MovementsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
