import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fieldHeading, QUESTION_SECTIONS } from '../labels'
import {
  colorFor,
  countBy,
  formatN,
  formatPctNum,
  leading,
  meanScore,
  share,
} from '../stats'
import type { Row } from '../types'

const PURPLE: [number, number, number] = [124, 58, 237]
const INK: [number, number, number] = [27, 20, 48]
const MUTED: [number, number, number] = [109, 100, 132]
const LINE: [number, number, number] = [232, 226, 244]

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function yieldFrame() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0)
  })
}

export async function generateReportPdf(rows: Row[], scopeLabel: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const left = 14
  const right = pageW - 14
  const width = right - left
  const generated = new Date().toLocaleString('pt-BR')

  const footer = () => {
    const page = doc.getNumberOfPages()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(
      `Analítica · Pesquisa Tracking Bahia Estadual · ${scopeLabel}`,
      left,
      pageH - 8,
    )
    doc.text(String(page), right, pageH - 8, { align: 'right' })
  }

  doc.setFillColor(...PURPLE)
  doc.rect(0, 0, pageW, 58, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('ANALÍTICA', left, 18)
  doc.setFontSize(22)
  doc.text('Relatório completo', left, 32)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Pesquisa Tracking Bahia Estadual', left, 42)

  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(scopeLabel, left, 74)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...MUTED)
  doc.text(`${formatN(rows.length)} entrevistas neste recorte.`, left, 82)
  doc.text(`Gerado em ${generated}. Contagens observadas, sem ponderação.`, left, 88)

  const fem = share(rows, 'sexo', 'Feminino')
  const masc = share(rows, 'sexo', 'Masculino')
  const pres = leading(rows, 'ESTIMULADA PRESIDENTE')
  const gov = leading(rows, 'ESTIMULADA GOVERNADOR')
  const apLula = share(rows, 'aprovação do gov Lula', 'Aprova')
  const apJero = share(rows, 'aprovação do gov Jerônimo', 'Aprova')
  const nota = meanScore(rows, 'nota Jerônimo')

  autoTable(doc, {
    startY: 98,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 3 },
    headStyles: {
      fillColor: PURPLE,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: { 1: { halign: 'right' } },
    head: [['Indicador', 'Resultado']],
    body: [
      ['Entrevistas', formatN(rows.length)],
      ['Sexo masculino', `${formatPctNum(masc.pct)} (${formatN(masc.n)})`],
      ['Sexo feminino', `${formatPctNum(fem.pct)} (${formatN(fem.n)})`],
      [
        'Maior índice presidente',
        pres ? `${pres.label} · ${formatPctNum(pres.pct)}` : '—',
      ],
      [
        'Maior índice de intenção de voto para governador',
        gov ? `${gov.label} · ${formatPctNum(gov.pct)}` : '—',
      ],
      ['Aprova governo Lula', `${formatPctNum(apLula.pct)} (${formatN(apLula.n)})`],
      [
        'Aprova governo Jerônimo',
        `${formatPctNum(apJero.pct)} (${formatN(apJero.n)})`,
      ],
      [
        'Nota média Jerônimo (0–10)',
        nota.mean == null
          ? '—'
          : `${nota.mean.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} (${formatN(nota.n)} notas)`,
      ],
    ],
    didDrawPage: footer,
  })

  for (const group of QUESTION_SECTIONS) {
    await yieldFrame()
    doc.addPage()
    footer()
    let y = 18
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...PURPLE)
    doc.text(group.title, left, y)
    y += 8

    for (const key of group.keys) {
      await yieldFrame()
      const dist = countBy(rows, key)
      const heading = fieldHeading(key)
      const titleLines = doc.splitTextToSize(heading, width) as string[]
      const score = key === 'nota Jerônimo' ? meanScore(rows, key) : null
      const barH = 5.2
      const barsBlock = dist.rows.length * (barH + 1.6) + 8
      const need = titleLines.length * 5 + 12 + barsBlock + 18
      if (y + Math.min(need, 40) > pageH - 20) {
        doc.addPage()
        footer()
        y = 18
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...INK)
      doc.text(titleLines, left, y)
      y += titleLines.length * 4.6 + 2
      if (score && score.n > 0 && score.mean != null) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...MUTED)
        doc.text(
          `Média das notas 0–10: ${score.mean.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} (${formatN(score.n)} notas)`,
          left,
          y,
        )
        y += 5
      }

      const maxN = dist.rows.reduce((m, r) => Math.max(m, r.n), 0) || 1
      const labelW = 62
      const pctW = 18
      const trackX = left + labelW
      const trackW = width - labelW - pctW - 16

      for (const row of dist.rows) {
        if (y + barH + 2 > pageH - 18) {
          doc.addPage()
          footer()
          y = 18
        }
        const label = doc.splitTextToSize(row.label, labelW - 2) as string[]
        doc.setFontSize(7)
        doc.setTextColor(...INK)
        doc.text(label[0] ?? row.label, left, y + 3.6)
        doc.setFillColor(...LINE)
        doc.roundedRect(trackX, y, trackW, barH, 0.8, 0.8, 'F')
        const fillW = (row.n / maxN) * trackW
        if (fillW > 0.4) {
          doc.setFillColor(...rgb(colorFor(row.label)))
          doc.roundedRect(trackX, y, fillW, barH, 0.8, 0.8, 'F')
        }
        doc.setFontSize(7)
        doc.setTextColor(...MUTED)
        doc.text(
          `${formatN(row.n)}   ${formatPctNum(row.pct)}`,
          right,
          y + 3.6,
          { align: 'right' },
        )
        y += barH + 1.6
      }

      y += 3
      autoTable(doc, {
        startY: y,
        margin: { left, right: 14, bottom: 14 },
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 8, textColor: INK, cellPadding: 2 },
        headStyles: {
          fillColor: PURPLE,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          1: { halign: 'right', cellWidth: 22 },
          2: { halign: 'right', cellWidth: 22 },
        },
        head: [['Resposta', 'N', '%']],
        body: [
          ...dist.rows.map((r) => [
            r.label,
            formatN(r.n),
            formatPctNum(r.pct),
          ]),
          ['Total', formatN(dist.total), dist.total ? '100,0%' : '—'],
        ],
        didDrawPage: footer,
      })
      y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? y) + 10
    }
  }

  const slug = scopeLabel
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60)
  doc.save(`Relatorio_Tracking_Bahia_2026_${slug || 'Bahia'}.pdf`)
}
