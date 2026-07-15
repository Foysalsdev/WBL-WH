'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api/endpoints'

// ═══════════════════════════════════════════════════════════════
//  Dashboard query hook
// ═══════════════════════════════════════════════════════════════

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
  })
}
