'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { purchaseOrdersApi, suppliersApi, productsApi } from '@/lib/api/endpoints'

// ═══════════════════════════════════════════════════════════════
//  Inbound hooks — PO list, create, status changes, GRN posting
// ═══════════════════════════════════════════════════════════════

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchase-orders'],
    queryFn: purchaseOrdersApi.list,
  })
}

export function useSuppliersForSelect() {
  return useQuery({
    queryKey: ['suppliers', 'select'],
    queryFn: suppliersApi.list,
  })
}

export function useProductsForSelect() {
  return useQuery({
    queryKey: ['products', 'select'],
    queryFn: () => productsApi.list(),
  })
}

export function useCreatePO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: purchaseOrdersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function usePatchPO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => purchaseOrdersApi.patch(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
    },
  })
}
