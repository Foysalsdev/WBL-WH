// ═══════════════════════════════════════════════════════════════
//  Whirlpool brand assets — official logo (dark + white variants)
// ═══════════════════════════════════════════════════════════════

interface BrandMarkProps {
  size?: number
  /** "dark" = dark logo on light bg, "light" = white logo on dark bg */
  variant?: 'dark' | 'light'
}

/**
 * Official Whirlpool logo.
 * - variant="dark"  → original logo (black text + gold swirl) for light backgrounds
 * - variant="light" → white logo (white text + gold swirl) for dark backgrounds (sidebar)
 */
export function BrandMark({ size = 28, variant = 'dark' }: BrandMarkProps) {
  const src = variant === 'light' ? '/whirlpool-logo-white.svg' : '/whirlpool-logo.svg'
  return (
    <img
      src={src}
      alt="Whirlpool"
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
        src="/whirlpool-logo-white.svg"
        alt="Whirlpool"
        height={collapsed ? 22 : 26}
        style={{ objectFit: 'contain' }}
        className="shrink-0"
      />
      {!collapsed && (
        <div className="leading-tight min-w-0 ml-1 pl-2 border-l border-sidebar-foreground/20">
          <p className="font-semibold tracking-tight text-sidebar-foreground text-[13px]">Bangladesh</p>
          <p className="text-[10px] text-sidebar-foreground/50 truncate">Warehouse Management</p>
        </div>
      )}
    </div>
  )
}
