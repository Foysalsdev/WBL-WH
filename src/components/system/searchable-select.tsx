'use client'

import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
//  SearchableSelect — searchable combobox for unlimited items.
//  Replaces <select> dropdowns that break with 100+ items.
//
//  Usage:
//  <SearchableSelect
//    items={products}
//    value={productId}
//    onChange={setProductId}
//    placeholder="Select product…"
//    searchPlaceholder="Search by SKU or name…"
//    renderItem={(p) => ({ label: p.name, sub: p.sku })}
//  />
// ═══════════════════════════════════════════════════════════════

interface SearchableSelectProps<T> {
  items: T[]
  value: string
  onChange: (value: string) => void
  /** Get unique value from item */
  getItemValue?: (item: T) => string
  /** What to show for each item — returns { label, sub? } */
  renderItem: (item: T) => { label: string; sub?: string }
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect<T extends { id?: string }>({
  items, value, onChange,
  getItemValue = (item) => item.id || '',
  renderItem,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No items found.',
  disabled,
  className,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = useMemo(() => {
    return items.find((item) => getItemValue(item) === value) || null
  }, [items, value, getItemValue])

  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter((item) => {
      const r = renderItem(item)
      return r.label.toLowerCase().includes(q) || (r.sub || '').toLowerCase().includes(q)
    })
  }, [items, search, renderItem])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-controls="searchable-select-list"
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'hover:bg-accent/50',
            className,
          )}
        >
          {selected ? (
            <span className="flex flex-col items-start min-w-0">
              <span className="truncate">{renderItem(selected).label}</span>
              {renderItem(selected).sub && (
                <span className="text-xs text-muted-foreground truncate font-mono">{renderItem(selected).sub}</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
              className="h-9 flex-1"
            />
          </div>
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filtered.map((item) => {
                const r = renderItem(item)
                const v = getItemValue(item)
                return (
                  <CommandItem
                    key={v}
                    value={v}
                    onSelect={() => {
                      onChange(v === value ? '' : v)
                      setOpen(false)
                      setSearch('')
                    }}
                    className="cursor-pointer"
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === v ? 'opacity-100' : 'opacity-0')} />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{r.label}</span>
                      {r.sub && <span className="text-xs text-muted-foreground font-mono truncate">{r.sub}</span>}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
