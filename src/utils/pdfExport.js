import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const INDIGO = [79, 70, 229]
const GRAY = [107, 114, 128]
const DARK = [31, 41, 55]
const LIGHT = [244, 244, 250]

export function createBrandedDoc(title, subtitle, orientation = 'portrait') {
  const doc = new jsPDF({ orientation })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(...INDIGO)
  doc.rect(0, 0, pageWidth, 26, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont(undefined, 'bold')
  doc.text('EFOS AI — Lead Management Platform', 14, 11)

  doc.setFontSize(10)
  doc.setFont(undefined, 'normal')
  doc.text(title, 14, 19)

  doc.setTextColor(...GRAY)
  doc.setFontSize(8.5)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 33)
  if (subtitle) doc.text(subtitle, 14, 38)

  return doc
}

export function addSectionTitle(doc, text, y) {
  doc.setTextColor(...DARK)
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text(text, 14, y)
  doc.setFont(undefined, 'normal')
  return y + 6
}

export function addTable(doc, head, body, startY) {
  autoTable(doc, {
    head: [head],
    body,
    startY,
    theme: 'striped',
    headStyles: { fillColor: INDIGO, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 7.5, cellPadding: 2.5, textColor: DARK, overflow: 'linebreak' },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: 14, right: 14 },
  })
  return doc.lastAutoTable.finalY + 10
}

export function saveDoc(doc, filename) {
  doc.save(filename)
}