// ═══════════════════════════════════════════════════════════════
//  CSV utilities — parse and generate CSV for bulk import/export
// ═══════════════════════════════════════════════════════════════

/** Parse CSV text into array of objects (using first row as headers) */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, j) => { row[h.trim()] = (values[j] || '').trim() })
    rows.push(row)
  }
  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (char === ',' && !inQuotes) {
      result.push(current); current = ''
    } else { current += char }
  }
  result.push(current)
  return result
}

/** Generate CSV text from array of objects */
export function generateCSV(rows: Record<string, any>[], headers?: string[]): string {
  if (rows.length === 0) return ''
  const cols = headers || Object.keys(rows[0])
  const headerLine = cols.map(c => escapeCSVField(c)).join(',')
  const dataLines = rows.map(row => cols.map(col => escapeCSVField(row[col] ?? '')).join(','))
  return [headerLine, ...dataLines].join('\n')
}

function escapeCSVField(value: any): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Trigger a CSV file download in the browser */
export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = (e) => reject(e)
    reader.readAsText(file)
  })
}
