// ═══════════════════════════════════════════════════════════════
//  Cache utilities — for performance-critical queries
//  In-memory TTL cache for read-heavy, rarely-changing data.
// ═══════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<any>>()

/**
 * Get from cache, or call fetcher and store
 * @param key Unique cache key
 * @param ttlMs Time-to-live in milliseconds (default: 60s)
 * @param fetcher Function to fetch fresh data
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const existing = cache.get(key)
  if (existing && existing.expiresAt > Date.now()) {
    return existing.data
  }

  const data = await fetcher()
  cache.set(key, { data, expiresAt: Date.now() + ttlMs })
  return data
}

/** Invalidate a cache entry (e.g., after mutation) */
export function invalidateCache(key: string): void {
  cache.delete(key)
}

/** Invalidate all cache entries matching pattern */
export function invalidatePattern(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key)
  }
}

/** Clear entire cache */
export function clearCache(): void {
  cache.clear()
}

// Common TTLs
export const TTL = {
  SHORT: 10_000,      // 10 seconds — for frequently changing data
  MEDIUM: 60_000,     // 1 minute  — for moderately changing data
  LONG: 5 * 60_000,   // 5 minutes — for rarely changing data (roles, warehouses)
  VERY_LONG: 30 * 60_000, // 30 minutes — for nearly static data
}

// Cache keys (centralized to avoid typos)
export const CACHE_KEYS = {
  dashboard: 'dashboard:kpis',
  productList: (search: string) => `products:list:${search || 'all'}`,
  customerList: 'customers:list',
  supplierList: 'suppliers:list',
  warehouseList: 'warehouses:list',
  transportVendors: 'transport-vendors:list',
  courierVendors: 'courier-vendors:list',
  roles: 'roles:all',
  lowStock: 'inventory:low-stock',
  stockValuation: (month: string) => `reports:valuation:${month}`,
}
