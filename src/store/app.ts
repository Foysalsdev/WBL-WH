'use client'
import { create } from 'zustand'

export type ModuleKey =
  | 'dashboard'
  | 'inventory'
  | 'masters'
  | 'inbound'
  | 'outbound'
  | 'reports'
  | 'audit'

interface AppState {
  active: ModuleKey
  mastersTab: string // products | customers | suppliers | warehouses
  sidebarCollapsed: boolean
  set: (s: Partial<AppState>) => void
  setActive: (a: ModuleKey) => void
  toggleSidebar: () => void
}

export const useApp = create<AppState>((set) => ({
  active: 'dashboard',
  mastersTab: 'products',
  sidebarCollapsed: false,
  set: (s) => set(s),
  setActive: (active) => set({ active }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))

export const MODULES: { key: ModuleKey; label: string; icon: string; description: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', description: 'KPIs & overview' },
  { key: 'inventory', label: 'Inventory', icon: 'Boxes', description: 'Stock & movements' },
  { key: 'masters', label: 'Catalog & Parties', icon: 'Database', description: 'Products, dealers, suppliers, warehouses' },
  { key: 'inbound', label: 'Inbound · GRN', icon: 'PackageOpen', description: 'Purchase orders & goods receipt' },
  { key: 'outbound', label: 'Outbound · Dispatch', icon: 'Truck', description: 'Sales orders, pick, dispatch, POD' },
  { key: 'reports', label: 'Reports', icon: 'BarChart3', description: 'Stock, valuation, movement' },
  { key: 'audit', label: 'Audit Log', icon: 'ClipboardList', description: 'Activity trail' },
]
