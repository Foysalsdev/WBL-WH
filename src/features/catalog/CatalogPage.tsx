'use client'

import { Database, Boxes, Users, Truck, Building2 } from 'lucide-react'
import { PageHeader } from '@/components/system'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUI } from '@/lib/store/ui'
import { ProductsTab } from './ProductsTab'
import { DealersTab, SourcingTab } from './PartyTab'
import { WarehousesTab } from './WarehousesTab'

// ═══════════════════════════════════════════════════════════════
//  CatalogPage — Whirlpool BD master data
//  Tabs: Products · Dealers · Sourcing · Warehouses
// ═══════════════════════════════════════════════════════════════

export function CatalogPage() {
  const { mastersTab, setMastersTab } = useUI()

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Catalog & Parties"
        description="Whirlpool product catalog, dealer network, sourcing partners and warehouse locations."
        icon={Database}
      />

      <Tabs value={mastersTab} onValueChange={setMastersTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="products"><Boxes className="h-4 w-4 mr-1.5" />Products</TabsTrigger>
          <TabsTrigger value="customers"><Users className="h-4 w-4 mr-1.5" />Dealers</TabsTrigger>
          <TabsTrigger value="suppliers"><Truck className="h-4 w-4 mr-1.5" />Sourcing</TabsTrigger>
          <TabsTrigger value="warehouses"><Building2 className="h-4 w-4 mr-1.5" />Warehouses</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4"><ProductsTab /></TabsContent>
        <TabsContent value="customers" className="mt-4"><DealersTab /></TabsContent>
        <TabsContent value="suppliers" className="mt-4"><SourcingTab /></TabsContent>
        <TabsContent value="warehouses" className="mt-4"><WarehousesTab /></TabsContent>
      </Tabs>
    </div>
  )
}
