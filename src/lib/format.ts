// ═══════════════════════════════════════════════════════════════
//  Formatting helpers — BDT currency, dates, numbers, relative time
// ═══════════════════════════════════════════════════════════════

const BDT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const NUM = new Intl.NumberFormat('en-IN')

/** TK-prefixed currency string (Bangladeshi Taka) */
export function bdt(n: number): string {
  if (!isFinite(n)) return 'TK 0'
  return 'TK ' + BDT.format(n)
}

/** Plain number with thousand separators */
export function num(n: number): string {
  return NUM.format(n)
}

/** Compact number (1.2k, 3.4M) */
export function compact(n: number): string {
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

/** 15 Jul 2026 */
export function date(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** 15 Jul 2026, 14:32 */
export function dateTime(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

/** Relative time: "5m ago", "2h ago", "3d ago" */
export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return ''
  const dt = typeof d === 'string' ? new Date(d) : d
  const sec = Math.floor((Date.now() - dt.getTime()) / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`
  return date(dt)
}

/** Initials from a name: "Foysal Ahmed" → "FA" */
export function initials(name: string): string {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}
