import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { fieldColumn } from '../labels'
import type { Row } from '../types'

const LEAD_COLS = ['Municípios', 'folha', 'dia'] as const

function tableColumns(questionKeys: string[]): string[] {
  return [...LEAD_COLS, ...questionKeys]
}

function slugScope(scopeLabel: string): string {
  return scopeLabel
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60)
}

function cellText(value: string | null | undefined): string {
  return value ?? ''
}

function buildMatrix(rows: Row[], questionKeys: string[]) {
  const columns = tableColumns(questionKeys)
  const head = ['#', ...columns.map((k) => fieldColumn(k))]
  const body = rows.map((row, i) => [
    String(i + 1),
    ...columns.map((k) => cellText(row[k])),
  ])
  return { columns, head, body }
}

export function exportTablesExcel(
  rows: Row[],
  questionKeys: string[],
  scopeLabel: string,
) {
  const { head, body } = buildMatrix(rows, questionKeys)
  const sheet = XLSX.utils.aoa_to_sheet([head, ...body])
  sheet['!cols'] = head.map((h) => ({
    wch: Math.min(42, Math.max(10, h.length + 2)),
  }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Tabelas')
  const slug = slugScope(scopeLabel)
  XLSX.writeFile(book, `Tabelas_Tracking_Bahia_2026_${slug || 'Bahia'}.xlsx`)
}

export async function exportTablesPdf(
  rows: Row[],
  questionKeys: string[],
  scopeLabel: string,
) {
  const { head, body } = buildMatrix(rows, questionKeys)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const left = 8
  const right = pageW - 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(124, 58, 237)
  doc.text('Analítica · Tabelas', left, 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 90)
  doc.text(`${scopeLabel} · ${rows.length} entrevistas`, left, 15)

  autoTable(doc, {
    startY: 18,
    head: [head],
    body,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 5.5,
      cellPadding: 0.8,
      overflow: 'linebreak',
      valign: 'top',
      textColor: [40, 40, 48],
    },
    headStyles: {
      fillColor: [124, 58, 237],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 5.5,
    },
    margin: { left, right: 8, top: 18, bottom: 12 },
    didDrawPage: () => {
      const page = doc.getNumberOfPages()
      doc.setFontSize(7)
      doc.setTextColor(120, 120, 130)
      doc.text(`Página ${page}`, right, pageH - 5, { align: 'right' })
    },
  })

  const slug = slugScope(scopeLabel)
  doc.save(`Tabelas_Tracking_Bahia_2026_${slug || 'Bahia'}.pdf`)
}
