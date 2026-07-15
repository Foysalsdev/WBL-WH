// ═══════════════════════════════════════════════════════════════
//  Whirlpool brand mark — simplified SVG inspired by the brand swirl
// ═══════════════════════════════════════════════════════════════

interface BrandMarkProps {
  size?: number
  /** Variant for dark vs light backgrounds */
  variant?: 'default' | 'compact'
}

export function BrandMark({ size = 36, variant = 'default' }: BrandMarkProps) {
  if (variant === 'compact') {
    // Just the swirl mark — for mobile/favicons
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect x="0" y="0" width="48" height="48" rx="10" fill="var(--whp-blue)" />
        <path
          d="M 10 30 C 10 18, 18 10, 30 10 C 38 10, 41 14, 41 18 C 41 22, 38 24, 34 24 C 31 24, 30 22, 30 21"
          stroke="var(--whp-gold)" strokeWidth="3.5" strokeLinecap="round" fill="none"
        />
        <text x="24" y="34" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900" fill="white">W</text>
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="0" y="0" width="48" height="48" rx="10" fill="var(--whp-blue)" />
      <path
        d="M 10 30 C 10 18, 18 10, 30 10 C 38 10, 41 14, 41 18 C 41 22, 38 24, 34 24 C 31 24, 30 22, 30 21"
        stroke="var(--whp-gold)" strokeWidth="3.5" strokeLinecap="round" fill="none"
      />
      <text x="24" y="34" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900" fill="white">W</text>
    </svg>
  )
}

/** Wordmark — used in the sidebar header */
export function BrandWordmark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <BrandMark size={36} />
      {!collapsed && (
        <div className="leading-tight min-w-0">
          <p className="font-semibold tracking-tight truncate text-sidebar-foreground">Whirlpool BD</p>
          <p className="text-[11px] text-sidebar-foreground/60 truncate">Warehouse Management</p>
        </div>
      )}
    </div>
  )
}
