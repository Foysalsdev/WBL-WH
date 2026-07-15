// ═══════════════════════════════════════════════════════════════
//  Whirlpool brand assets — official logo + banner
// ═══════════════════════════════════════════════════════════════

interface BrandMarkProps {
  size?: number
  /** Variant for dark vs light backgrounds */
  variant?: 'default' | 'compact'
}

/**
 * Official Whirlpool logo — loaded from public/whirlpool-logo.svg
 * (extracted from whirlpool-bangladesh.com)
 */
export function BrandMark({ size = 36, variant = 'default' }: BrandMarkProps) {
  return (
    <img
      src="/whirlpool-logo.svg"
      alt="Whirlpool"
      width={variant === 'compact' ? size : size * 2}
      height={size}
      style={{ objectFit: 'contain' }}
    />
  )
}

/** Wordmark — logo + text label, used in the sidebar header */
export function BrandWordmark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <img
        src="/whirlpool-logo.svg"
        alt="Whirlpool"
        height={collapsed ? 24 : 28}
        style={{ objectFit: 'contain' }}
        className="shrink-0"
      />
      {!collapsed && (
        <div className="leading-tight min-w-0">
          <p className="font-semibold tracking-tight truncate text-sidebar-foreground text-sm">Bangladesh</p>
          <p className="text-[10px] text-sidebar-foreground/60 truncate">Warehouse Management</p>
        </div>
      )}
    </div>
  )
}
