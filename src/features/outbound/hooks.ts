'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesOrdersApi, customersApi, productsApi } from '@/lib/api/endpoints'

// ═══════════════════════════════════════════════════════════════
//  Outbound hooks — SO list, create, 5-step workflow actions
// ═══════════════════════════════════════════════════════════════

export function useSalesOrders() {
  return useQuery({
    queryKey: ['sales-orders'],
    queryFn: salesOrdersApi.list,
  })
}

export function useCustomersForSelect() {
  return useQuery({
    queryKey: ['customers', 'select'],
    queryFn: customersApi.list,
  })
}

export function useProductsForSelect() {
  return useQuery({
    queryKey: ['products', 'select'],
    queryFn: () => productsApi.list(),
  })
}

export function useCreateSO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: salesOrdersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function usePatchSO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => salesOrdersApi.patch(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
    },
  })
}
