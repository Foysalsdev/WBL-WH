// ═══════════════════════════════════════════════════════════════
//  Navigation domain — module registry
// ═══════════════════════════════════════════════════════════════

import {
  LayoutDashboard, Boxes, Database, PackageOpen, Truck,
  BarChart3, ClipboardList, Shield, Settings, Wallet, type LucideIcon,
} from 'lucide-react'

export type ModuleKey =
  | 'dashboard'
  | 'inventory'
  | 'masters'
  | 'inbound'
  | 'outbound'
  | 'reports'
  | 'users'
  | 'audit'
  | 'settings'
  | 'finance'

export interface ModuleDef {
  key: ModuleKey
  label: string
  shortLabel: string
  description: string
  icon: LucideIcon
  phase: number
  enabled: boolean
}

export const MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Dashboard',           shortLabel: 'Home',     description: 'Live KPIs & operations overview',     icon: LayoutDashboard, phase: 0, enabled: true },
  { key: 'inventory', label: 'Inventory',           shortLabel: 'Stock',    description: 'Stock levels, movements & adjustments', icon: Boxes,            phase: 1, enabled: true },
  { key: 'masters',   label: 'Catalog & Parties',   shortLabel: 'Masters',  description: 'Products, dealers, sourcing, warehouses', icon: Database,      phase: 2, enabled: true },
  { key: 'inbound',   label: 'Inbound · GRN',       shortLabel: 'Inbound',  description: 'Purchase orders & goods receipt',     icon: PackageOpen,     phase: 3, enabled: true },
  { key: 'outbound',  label: 'Outbound · Dispatch', shortLabel: 'Outbound', description: 'Pick, scan, invoice, dispatch & POD', icon: Truck,           phase: 4, enabled: true },
  { key: 'reports',   label: 'Reports',             shortLabel: 'Reports',  description: 'Stock valuation, movements & summaries', icon: BarChart3,     phase: 5, enabled: true },
  { key: 'finance',   label: 'Finance',             shortLabel: 'Finance',  description: 'Requisitions, cash in, expenses & HO report', icon: Wallet, phase: 6, enabled: true },
  { key: 'users',     label: 'User Management',     shortLabel: 'Users',    description: 'Manage staff, roles & permissions',   icon: Shield,          phase: 7, enabled: true },
  { key: 'audit',     label: 'Audit Log',           shortLabel: 'Audit',    description: 'Immutable activity trail',            icon: ClipboardList,   phase: 8, enabled: true },
  { key: 'settings',  label: 'Settings',            shortLabel: 'Settings', description: 'Appearance & system settings',        icon: Settings,        phase: 9, enabled: true },
]

export function getModule(key: ModuleKey): ModuleDef | undefined {
  return MODULES.find((m) => m.key === key)
}
