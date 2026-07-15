'use client'

import { Database, Boxes, Users, Truck, Building2, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/system'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUI } from '@/lib/store/ui'
import { ProductsTab } from './ProductsTab'
import { DealersTab, SourcingTab } from './PartyTab'
import { WarehousesTab } from './WarehousesTab'

// ═══════════════════════════════════════════════════════════════
//  CatalogPage — Whirlpool BD master data
// ═══════════════════════════════════════════════════════════════

const TAB_META: Record<string, { label: string; description: string }> = {
  products:   { label: 'Products',         description: 'Whirlpool appliance catalog — SKUs, pricing, stock levels' },
  customers:  { label: 'Dealers',          description: 'Whirlpool dealer & showroom network across Bangladesh' },
  suppliers:  { label: 'Sourcing partners',description: 'Whirlpool sourcing entities (Corp USA, India, Thailand)' },
  warehouses: { label: 'Warehouses',       description: 'Storage facilities with location grids' },
}

export function CatalogPage() {
  const { mastersTab, setMastersTab } = useUI()
  const meta = TAB_META[mastersTab] || TAB_META.products

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Catalog & Parties"
        description="Whirlpool product catalog, dealer network, sourcing partners and warehouse locations."
        icon={Database}
        breadcrumb={
          <>
            <span>Whirlpool BD</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Catalog & Parties</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{meta.label}</span>
          </>
        }
      />

      <Tabs value={mastersTab} onValueChange={setMastersTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="products"><Boxes className="h-4 w-4 mr-1.5" />Products</TabsTrigger>
          <TabsTrigger value="customers"><Users className="h-4 w-4 mr-1.5" />Dealers</TabsTrigger>
          <TabsTrigger value="suppliers"><Truck className="h-4 w-4 mr-1.5" />Sourcing</TabsTrigger>
          <TabsTrigger value="warehouses"><Building2 className="h-4 w-4 mr-1.5" />Warehouses</TabsTrigger>
        </TabsList>
        <div className="mt-3 mb-1 text-sm text-muted-foreground">{meta.description}</div>
        <TabsContent value="products" className="mt-4 animate-fade-in"><ProductsTab /></TabsContent>
        <TabsContent value="customers" className="mt-4 animate-fade-in"><DealersTab /></TabsContent>
        <TabsContent value="suppliers" className="mt-4 animate-fade-in"><SourcingTab /></TabsContent>
        <TabsContent value="warehouses" className="mt-4 animate-fade-in"><WarehousesTab /></TabsContent>
      </Tabs>
    </div>
  )
}
