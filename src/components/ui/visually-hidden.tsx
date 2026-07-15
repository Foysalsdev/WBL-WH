'use client'

import { cn } from '@/lib/utils'

/** VisuallyHidden — content hidden from screen but read by screen readers */
export function VisuallyHidden({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'absolute h-px w-px p-0 overflow-hidden whitespace-nowrap border-0',
        '[clip:rect(0,0,0,0)] [clip-path:inset(50%)]',
        className,
      )}
    >
      {children}
    </span>
  )
}
