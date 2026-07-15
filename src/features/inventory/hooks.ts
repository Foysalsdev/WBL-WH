'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi, movementsApi } from '@/lib/api/endpoints'
import type { StockAdjustmentInput } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  Inventory query hooks
// ═══════════════════════════════════════════════════════════════

export function useInventory(opts?: { search?: string; low?: boolean }) {
  return useQuery({
    queryKey: ['inventory', opts?.search || '', opts?.low || false],
    queryFn: () => inventoryApi.list(opts),
  })
}

export function useMovements(opts?: { limit?: number; productId?: string; type?: string }) {
  return useQuery({
    queryKey: ['movements', opts?.limit || 200, opts?.productId || '', opts?.type || ''],
    queryFn: () => movementsApi.list(opts),
  })
}

// ─── Mutations ───────────────────────────────────────────────────

export function useAdjustStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: StockAdjustmentInput) => inventoryApi.adjust(input),
    onSuccess: () => {
      // Invalidate everything that could be affected
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['movements'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
