// ═══════════════════════════════════════════════════════════════
//  React Query — Default config for fast, smart refetching
// ═══════════════════════════════════════════════════════════════

import { QueryClient } from '@tanstack/react-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache data for 1 minute (don't refetch on every mount)
        staleTime: 60 * 1000,
        // Keep in cache for 5 minutes (don't garbage collect)
        gcTime: 5 * 60 * 1000,
        // Refetch on window focus (when user returns to tab)
        refetchOnWindowFocus: true,
        // Don't refetch on reconnect (avoid hammering API)
        refetchOnReconnect: false,
        // Retry failed requests 2 times
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      },
      mutations: {
        // Retry mutations once
        retry: 1,
      },
    },
  })
}

// Smart invalidation helpers — call after mutations to refresh UI
export const INVALIDATE = {
  // After any product change
  products: () => ['products', 'inventory', 'dashboard', 'reports'],
  // After any customer change
  customers: () => ['customers', 'dashboard'],
  // After any supplier change
  suppliers: () => ['suppliers', 'dashboard'],
  // After any stock movement (in/out/adjust)
  stock: () => ['inventory', 'movements', 'dashboard', 'reports', 'products'],
  // After any PO change
  purchaseOrders: () => ['purchase-orders', 'dashboard'],
  // After any SO change
  salesOrders: () => ['sales-orders', 'dashboard'],
  // After any dispatch
  dispatches: () => ['sales-orders', 'dispatches', 'dashboard'],
  // After finance changes
  finance: () => ['finance', 'requisitions', 'cash-in', 'expenses', 'reports'],
  // After user/role changes
  users: () => ['users', 'roles', 'dashboard'],
  // After return/exchange
  returns: () => ['returns', 'inventory', 'movements'],
  // Everything (after reseed)
  all: () => ['dashboard', 'inventory', 'products', 'customers', 'suppliers',
              'warehouses', 'movements', 'purchase-orders', 'sales-orders',
              'dispatches', 'finance', 'users', 'roles', 'returns', 'reports', 'audit'],
}
