'use client'

import { useEffect, useState } from 'react'

/**
 * Debounce a value — useful for search inputs that should wait for typing to
 * pause before triggering a server-side query.
 *
 * @example
 * const [search, setSearch] = useState('')
 * const debouncedSearch = useDebounce(search, 250)
 * const { data } = useQuery({ queryKey: ['x', debouncedSearch], ... })
 */
export function useDebounce<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}
