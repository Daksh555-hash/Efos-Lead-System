import * as XLSX from 'xlsx'

function escapeCSV(val) {
  const str = String(val ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Single-table CSV
export function exportToCSV(headers, rows, filename) {
  const lines = [headers.map(escapeCSV).join(',')]
  rows.forEach((row) => lines.push(row.map(escapeCSV).join(',')))
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

// Multi-section CSV — stacks labeled tables in one file, separated by a blank line
export function exportMultiSectionCSV(sections, filename) {
  const lines = []
  sections.forEach((section, i) => {
    if (i > 0) lines.push('')
    lines.push(section.title)
    lines.push(section.headers.map(escapeCSV).join(','))
    section.rows.forEach((row) => lines.push(row.map(escapeCSV).join(',')))
  })
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

// Excel workbook — one or more sheets: [{ name, headers, rows }]
export function exportToExcel(sheets, filename) {
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ name, headers, rows }) => {
    const data = [headers, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(String(h).length + 4, 14) }))
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  })
  XLSX.writeFile(wb, filename)
}
