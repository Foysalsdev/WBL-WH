// ═══════════════════════════════════════════════════════════════
//  Input styling — Tailwind class string that matches shadcn Input.
//  We use this on plain <input> elements so they're easier to test
//  with browser automation (no React.forwardRef indirection).
// ═══════════════════════════════════════════════════════════════

export const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

export const textareaClass =
  'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
