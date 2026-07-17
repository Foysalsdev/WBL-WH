'use client'

import { useState } from 'react'
import { Printer, Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateCSV, downloadCSV } from '@/lib/csv'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════════════
//  ExportButtons — Print (PDF) + CSV + Excel export for reports
// ═══════════════════════════════════════════════════════════════

interface ExportButtonsProps {
  /** Function to open print window (PDF via browser print) */
  onPrint: () => void
  /** Data rows for CSV/Excel export */
  exportData: Record<string, any>[]
  /** Column order for export */
  columns: string[]
  /** Report name for filename (e.g. "stock-valuation") */
  reportName: string
}

export function ExportButtons({ onPrint, exportData, columns, reportName }: ExportButtonsProps) {
  const [open, setOpen] = useState(false)

  function handleCSV() {
    if (!exportData || exportData.length === 0) {
      toast.error('No data to export')
      return
    }
    const csv = generateCSV(exportData, columns)
    const filename = `${reportName}-${new Date().toISOString().slice(0, 10)}.csv`
    downloadCSV(filename, csv)
    toast.success(`Exported ${exportData.length} rows to CSV`)
    setOpen(false)
  }

  function handleExcel() {
    if (!exportData || exportData.length === 0) {
      toast.error('No data to export')
      return
    }
    // Excel can open CSV directly — use .xls extension with HTML table wrapper
    const headers = columns.join('</th><th>')
    const rows = exportData.map(row =>
      '<tr>' + columns.map(col => `<td>${row[col] ?? ''}</td>`).join('') + '</tr>'
    ).join('')
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1"><thead><tr><th>${headers}</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${reportName}-${new Date().toISOString().slice(0, 10)}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Exported ${exportData.length} rows to Excel`)
    setOpen(false)
  }

  function handlePrint() {
    onPrint()
    setOpen(false)
  }

  return (
    <div className="relative flex items-center gap-1.5">
      {/* Print button */}
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
      >
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">PDF</span>
      </button>

      {/* Export dropdown */}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border bg-popover shadow-lg z-50 overflow-hidden animate-scale-in">
          <button
            onClick={handleExcel}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-accent transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Excel (.xls)</span>
          </button>
          <button
            onClick={handleCSV}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-accent transition-colors cursor-pointer"
          >
            <FileText className="h-4 w-4 text-sky-600" />
            <span>CSV (.csv)</span>
          </button>
        </div>
      )}
    </div>
  )
}
