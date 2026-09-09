import * as XLSX from 'xlsx'
import { fieldColumn } from '../labels'
import type { Row } from '../types'

const LEAD_COLS = ['Municípios', 'folha', 'dia'] as const
const PDF_ROW_CHUNK = 60
const PDF_QUESTION_COLS = 6

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

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0)
  })
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export async function exportTablesExcel(
  rows: Row[],
  questionKeys: string[],
  scopeLabel: string,
) {
  await yieldToMain()
  const columns = tableColumns(questionKeys)
  const head = ['#', ...columns.map((k) => fieldColumn(k))]
  const body: string[][] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    body.push([String(i + 1), ...columns.map((k) => cellText(row[k]))])
    if (i > 0 && i % 200 === 0) await yieldToMain()
  }
  await yieldToMain()
  const sheet = XLSX.utils.aoa_to_sheet([head, ...body])
  sheet['!cols'] = head.map((h) => ({
    wch: Math.min(42, Math.max(10, h.length + 2)),
  }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Tabelas')
  const slug = slugScope(scopeLabel)
  XLSX.writeFile(book, `Tabelas_Tracking_Bahia_2026_${slug || 'Bahia'}.xlsx`)
}

type PdfProgress = (message: string) => void

/**
 * PDF em fatias (colunas + linhas) com yield ao main thread para não travar a UI.
 */
export async function exportTablesPdf(
  rows: Row[],
  questionKeys: string[],
  scopeLabel: string,
  onProgress?: PdfProgress,
) {
  onProgress?.('Carregando gerador de PDF…')
  await yieldToMain()
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const autoTable = autoTableMod.default
  await yieldToMain()

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const left = 8
  const right = pageW - 8
  const questionChunks = chunkArray(questionKeys, PDF_QUESTION_COLS)
  const rowChunks = chunkArray(
    rows.map((row, i) => ({ row, i })),
    PDF_ROW_CHUNK,
  )

  let firstBlock = true
  let block = 0
  const totalBlocks = Math.max(1, questionChunks.length * rowChunks.length)

  for (let q = 0; q < questionChunks.length; q++) {
    const qKeys = questionChunks[q]
    const colKeys = [...LEAD_COLS, ...qKeys]
    const head = ['#', ...colKeys.map((k) => fieldColumn(k))]

    for (let r = 0; r < rowChunks.length; r++) {
      block += 1
      onProgress?.(
        `Gerando PDF… bloco ${block}/${totalBlocks} (${Math.round((block / totalBlocks) * 100)}%)`,
      )
      await yieldToMain()

      const body = rowChunks[r].map(({ row, i }) => [
        String(i + 1),
        ...colKeys.map((k) => cellText(row[k])),
      ])

      if (!firstBlock) doc.addPage()
      firstBlock = false

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(124, 58, 237)
      doc.text('Analítica · Tabelas', left, 10)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(80, 80, 90)
      doc.text(
        `${scopeLabel} · ${rows.length} entrevistas · colunas ${q + 1}/${questionChunks.length} · linhas ${r * PDF_ROW_CHUNK + 1}–${Math.min((r + 1) * PDF_ROW_CHUNK, rows.length)}`,
        left,
        15,
      )

      autoTable(doc, {
        startY: 18,
        head: [head],
        body,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 6,
          cellPadding: 0.9,
          overflow: 'ellipsize',
          valign: 'middle',
          textColor: [40, 40, 48],
          minCellHeight: 4,
        },
        headStyles: {
          fillColor: [124, 58, 237],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 6,
        },
        margin: { left, right: 8, top: 18, bottom: 12 },
        rowPageBreak: 'auto',
        didDrawPage: () => {
          const page = doc.getNumberOfPages()
          doc.setFontSize(7)
          doc.setTextColor(120, 120, 130)
          doc.text(`Página ${page}`, right, pageH - 5, { align: 'right' })
        },
      })

      await yieldToMain()
    }
  }

  onProgress?.('Salvando arquivo…')
  await yieldToMain()
  const slug = slugScope(scopeLabel)
  doc.save(`Tabelas_Tracking_Bahia_2026_${slug || 'Bahia'}.pdf`)
}
