// ═══════════════════════════════════════════════════════════════
//  Whirlpool brand assets — official logo from whirlpool-bangladesh.com
//  Logo: black text + gold swirl (#eeb111)
//  Tagline: "Every day, care."
// ═══════════════════════════════════════════════════════════════

interface BrandMarkProps {
  size?: number
  variant?: 'dark' | 'light'
}

export function BrandMark({ size = 28, variant = 'dark' }: BrandMarkProps) {
  // Both variants use the official dark logo (works on both light & dark bg)
  // For pure white version, would need a separate asset
  const src = '/whirlpool-logo.svg'
  return (
    <img
      src={src}
      alt="Whirlpool"
      style={{ objectFit: 'contain', height: `${size}px`, width: 'auto', maxWidth: '100%' }}
    />
  )
}

/** Wordmark — official Whirlpool logo + tagline for sidebar header */
export function BrandWordmark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <img
        src="/whirlpool-logo.svg"
        alt="Whirlpool"
        style={{
          objectFit: 'contain',
          height: collapsed ? '22px' : '26px',
          width: 'auto',
          maxWidth: collapsed ? '44px' : '110px',
        }}
        className="shrink-0"
      />
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] font-semibold tracking-tight text-sidebar-foreground">
            WMS
          </span>
          <span className="text-[9px] text-sidebar-foreground/60 italic">
            Every day, care.
          </span>
        </div>
      )}
    </div>
  )
}
