// ═══════════════════════════════════════════════════════════════
//  Navigation domain — module registry
// ═══════════════════════════════════════════════════════════════

import {
  LayoutDashboard, Boxes, Database, PackageOpen, Truck,
  BarChart3, ClipboardList, type LucideIcon,
} from 'lucide-react'

export type ModuleKey =
  | 'dashboard'
  | 'inventory'
  | 'masters'
  | 'inbound'
  | 'outbound'
  | 'reports'
  | 'audit'

export interface ModuleDef {
  key: ModuleKey
  label: string
  shortLabel: string
  description: string
  icon: LucideIcon
  /** Phase when this module will be delivered (1 = foundation deliverable) */
  phase: number
  /** Coming in next phases */
  enabled: boolean
}

export const MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Dashboard',           shortLabel: 'Home',     description: 'Live KPIs & operations overview',     icon: LayoutDashboard, phase: 0, enabled: true },
  { key: 'inventory', label: 'Inventory',           shortLabel: 'Stock',    description: 'Stock levels, movements & adjustments', icon: Boxes,            phase: 1, enabled: true },
  { key: 'masters',   label: 'Catalog & Parties',   shortLabel: 'Masters',  description: 'Products, dealers, sourcing, warehouses', icon: Database,      phase: 2, enabled: true },
  { key: 'inbound',   label: 'Inbound · GRN',       shortLabel: 'Inbound',  description: 'Purchase orders & goods receipt',     icon: PackageOpen,     phase: 3, enabled: true },
  { key: 'outbound',  label: 'Outbound · Dispatch', shortLabel: 'Outbound', description: 'Pick, pack, dispatch & POD',          icon: Truck,           phase: 4, enabled: false },
  { key: 'reports',   label: 'Reports',             shortLabel: 'Reports',  description: 'Stock valuation & movement reports',  icon: BarChart3,       phase: 5, enabled: false },
  { key: 'audit',     label: 'Audit Log',           shortLabel: 'Audit',    description: 'Immutable activity trail',            icon: ClipboardList,   phase: 6, enabled: false },
]

export function getModule(key: ModuleKey): ModuleDef | undefined {
  return MODULES.find((m) => m.key === key)
}
