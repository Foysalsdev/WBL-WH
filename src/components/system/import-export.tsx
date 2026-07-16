'use client'

import { useState } from 'react'
import { Upload, FileText, CheckCircle2, AlertCircle, Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { parseCSV, downloadCSV, generateCSV, readFile } from '@/lib/csv'
import { toast } from 'sonner'

// ═══════════════════════════════════════════════════════════════
//  ImportExportButtons — reusable component for any tab
//  Provides: Export CSV (download), Import CSV (upload + preview)
// ═══════════════════════════════════════════════════════════════

interface ImportExportProps {
  /** Entity name for labels (e.g. "products", "dealers") */
  entityName: string
  /** Current data to export */
  data: Record<string, any>[]
  /** Column order for export CSV */
  exportColumns: string[]
  /** Template columns for import (what headers to expect) */
  importTemplate: { headers: string[]; sampleRow: Record<string, string> }
  /** Function to create each imported row — returns Promise */
  onImport: (rows: Record<string, string>[]) => Promise<{ success: number; failed: number; errors: string[] }>
}

export function ImportExportButtons({
  entityName, data, exportColumns, importTemplate, onImport,
}: ImportExportProps) {
  const [importOpen, setImportOpen] = useState(false)
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const [dragActive, setDragActive] = useState(false)

  function handleExport() {
    if (!data || data.length === 0) {
      toast.error('No data to export')
      return
    }
    const csv = generateCSV(data, exportColumns)
    const filename = `${entityName}-export-${new Date().toISOString().slice(0, 10)}.csv`
    downloadCSV(filename, csv)
    toast.success(`Exported ${data.length} ${entityName}`, { description: filename })
  }

  function downloadTemplate() {
    const csv = generateCSV([importTemplate.sampleRow], importTemplate.headers)
    downloadCSV(`${entityName}-template.csv`, csv)
  }

  async function handleFileUpload(file: File) {
    try {
      const text = await readFile(file)
      const rows = parseCSV(text)
      if (rows.length === 0) {
        toast.error('CSV is empty or invalid')
        return
      }
      setParsedRows(rows)
      setImportResult(null)
      setImportOpen(true)
    } catch (e: any) {
      toast.error('Failed to read file', { description: e.message })
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      handleFileUpload(file)
    } else {
      toast.error('Please upload a CSV file')
    }
  }

  async function confirmImport() {
    setImporting(true)
    try {
      const result = await onImport(parsedRows)
      setImportResult(result)
      if (result.success > 0) {
        toast.success(`Imported ${result.success} ${entityName}`, {
          description: result.failed > 0 ? `${result.failed} failed` : undefined,
        })
      }
    } catch (e: any) {
      toast.error('Import failed', { description: e.message })
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={handleExport} title={`Export ${entityName} to CSV`}>
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline ml-1">Export</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setParsedRows([]); setImportResult(null); setImportOpen(true) }} title={`Import ${entityName} from CSV`}>
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline ml-1">Import</span>
        </Button>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Import {entityName}</DialogTitle>
            <DialogDescription>Upload a CSV file to bulk import {entityName}.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* File upload area */}
            {parsedRows.length === 0 && !importResult && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                  dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                )}
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Drop CSV file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .csv files</p>
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  id="csv-upload"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
                />
                <Button variant="outline" size="sm" className="mt-3" onClick={() => document.getElementById('csv-upload')?.click()}>
                  <FileText className="h-3.5 w-3.5 mr-1" /> Choose file
                </Button>
              </div>
            )}

            {/* Preview table */}
            {parsedRows.length > 0 && !importResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{parsedRows.length} rows ready to import</p>
                  <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Download template
                  </Button>
                </div>
                <div className="rounded-lg border overflow-auto max-h-60">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr>
                        {Object.keys(parsedRows[0]).map((h) => (
                          <th key={h} className="text-left p-2 font-medium uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-t">
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="p-2 truncate max-w-32">{v || '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center">Showing first 10 of {parsedRows.length} rows</p>
                )}
              </div>
            )}

            {/* Import result */}
            {importResult && (
              <div className="space-y-3">
                <div className={cn(
                  'rounded-lg border p-4 flex items-center gap-3',
                  importResult.failed > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5',
                )}>
                  {importResult.failed > 0 ? (
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {importResult.success} imported successfully
                      {importResult.failed > 0 && `, ${importResult.failed} failed`}
                    </p>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="rounded-lg border p-3 max-h-40 overflow-y-auto">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Errors:</p>
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <p key={i} className="text-xs text-rose-600">{err}</p>
                    ))}
                    {importResult.errors.length > 10 && (
                      <p className="text-xs text-muted-foreground mt-1">...and {importResult.errors.length - 10} more</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {importResult ? (
              <Button onClick={() => setImportOpen(false)}>Close</Button>
            ) : parsedRows.length > 0 ? (
              <>
                <Button variant="outline" onClick={() => { setParsedRows([]) }}>Back</Button>
                <Button onClick={confirmImport} disabled={importing}>
                  {importing ? 'Importing…' : `Import ${parsedRows.length} rows`}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={downloadTemplate}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Download template
                </Button>
                <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
