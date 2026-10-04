import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { isCandidateLabel } from '../intencaoRejeicao'
import { colorFor, countBy, formatN, formatPctNum } from '../stats'
import {
  shortWaveDateLabel,
  temporalIrPoints,
  waveNumberForPoint,
  type TimePoint,
} from '../temporal'
import type { Row } from '../types'

const PURPLE: [number, number, number] = [124, 58, 237]
const INK: [number, number, number] = [27, 20, 48]
const MUTED: [number, number, number] = [109, 100, 132]
const LINE: [number, number, number] = [232, 226, 244]
const PAPER: [number, number, number] = [250, 248, 253]

export type TemporalidadePdfInclude = {
  presidente: boolean
  governador: boolean
  senador: boolean
}

export type TemporalidadePdfSpec = {
  municipalities: string[]
  allMunicipalities: boolean
  include: TemporalidadePdfInclude
}

type CargoSpec = {
  id: keyof TemporalidadePdfInclude
  title: string
  field: string
  topN: number
}

const CARGOS: CargoSpec[] = [
  {
    id: 'presidente',
    title: 'Intenção de voto — presidente',
    field: 'ESTIMULADA PRESIDENTE',
    topN: 5,
  },
  {
    id: 'governador',
    title: 'Intenção de voto — governador',
    field: 'ESTIMULADA GOVERNADOR',
    topN: 3,
  },
  {
    id: 'senador',
    title: 'Intenção de voto — senador',
    field: 'ESTIMULADA SENADOR 1ª OPÇÃO',
    topN: 6,
  },
]

type Series = {
  name: string
  color: string
  n: number
  pct: number
  points: { wave: string; axis: string; n: number; acumulado: number }[]
}

function yieldFrame() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0)
  })
}

function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60)
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function filterRows(allRows: Row[], spec: TemporalidadePdfSpec): Row[] {
  if (spec.allMunicipalities) return allRows
  const set = new Set(spec.municipalities)
  return allRows.filter((r) => r['Municípios'] != null && set.has(r['Municípios']))
}

function scopeLabel(spec: TemporalidadePdfSpec): string {
  if (spec.allMunicipalities) return 'Bahia — todos os municípios'
  if (spec.municipalities.length === 1) return spec.municipalities[0]
  if (spec.municipalities.length <= 4) return spec.municipalities.join(', ')
  return `${spec.municipalities.length} municípios selecionados`
}

function waveAxis(point: TimePoint): string {
  const n = waveNumberForPoint(point)
  return n != null ? `Onda ${n}` : shortWaveDateLabel(point.label)
}

function waveHead(point: TimePoint): string {
  const dates = shortWaveDateLabel(point.label)
  const n = waveNumberForPoint(point)
  return n != null ? `Onda ${n}\n${dates}` : dates
}

function topSeries(rows: Row[], waves: TimePoint[], cargo: CargoSpec): Series[] {
  const total = rows.length
  const names = countBy(rows, cargo.field)
    .rows.filter((r) => isCandidateLabel(r.label))
    .slice(0, cargo.topN)
    .map((r) => r.label)

  return names.map((name) => {
    let running = 0
    const points = waves.map((w) => {
      const n = w.rows.filter((r) => r[cargo.field] === name).length
      running += n
      return {
        wave: waveHead(w),
        axis: waveAxis(w),
        n,
        acumulado: running,
      }
    })
    return {
      name,
      color: colorFor(name),
      n: running,
      pct: total ? (running / total) * 100 : 0,
      points,
    }
  })
}

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch('/analitica-logo.png')
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function drawLetterhead(
  doc: jsPDF,
  logo: string | null,
  kicker: string,
  title: string,
) {
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFillColor(...PAPER)
  doc.rect(0, 0, pageW, 32, 'F')
  if (logo) {
    doc.addImage(logo, 'PNG', 12, 7, 58, 16)
  } else {
    doc.setFillColor(...PURPLE)
    doc.circle(22, 16, 6, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('A', 22, 17.5, { align: 'center' })
  }
  const textX = logo ? 76 : 34
  doc.setTextColor(...PURPLE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(kicker.toUpperCase(), textX, 13)
  doc.setTextColor(...INK)
  doc.setFontSize(15)
  doc.text(title, textX, 21)
  doc.setDrawColor(...PURPLE)
  doc.setLineWidth(0.9)
  doc.line(12, 30, pageW - 12, 30)
}

function drawFooters(doc: jsPDF, logo: string | null, scope: string) {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const y = pageH - 11
    doc.setDrawColor(...PURPLE)
    doc.setLineWidth(0.45)
    doc.line(12, y - 3, pageW - 12, y - 3)
    if (logo) doc.addImage(logo, 'PNG', 12, y - 1.5, 28, 7.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(
      `Analítica · Pesquisas de opinião pública e de mercado · ${scope}`,
      logo ? 43 : 12,
      y + 3.2,
    )
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...PURPLE)
    doc.text(`${i} / ${total}`, pageW - 12, y + 3.2, { align: 'right' })
  }
}

function strokePath(
  doc: jsPDF,
  pts: readonly (readonly [number, number])[],
  color: [number, number, number],
) {
  if (!pts.length) return
  doc.setDrawColor(...color)
  doc.setFillColor(...color)
  doc.setLineWidth(0.8)
  for (let i = 1; i < pts.length; i++) {
    doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])
  }
  for (const [x, y] of pts) doc.circle(x, y, 0.9, 'F')
}

function drawChart(
  doc: jsPDF,
  series: Series[],
  left: number,
  top: number,
  width: number,
  height: number,
) {
  if (!series.length || !series[0]?.points.length) return
  const xs = series[0].points.map((p) => p.axis)
  const plotL = left + 8
  const plotR = left + width - 4
  const plotT = top + 4
  const plotB = top + height - 10
  const maxY = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.acumulado)))
  const yMax = Math.ceil(maxY / 50) * 50 || 50
  const xPos = (i: number) =>
    xs.length <= 1
      ? (plotL + plotR) / 2
      : plotL + (i / (xs.length - 1)) * (plotR - plotL)
  const yPos = (v: number) => plotB - (v / yMax) * (plotB - plotT)

  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.2)
  doc.line(plotL, plotB, plotR, plotB)
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text(formatN(yMax), plotL - 1, plotT + 1, { align: 'right' })
  doc.text('0', plotL - 1, plotB, { align: 'right' })

  for (const s of series) {
    strokePath(
      doc,
      s.points.map((p, i) => [xPos(i), yPos(p.acumulado)] as const),
      rgb(s.color),
    )
  }
  xs.forEach((label, i) => {
    doc.text(label, xPos(i), plotB + 4.5, { align: 'center' })
  })

  let legendX = left
  const legendY = top + height - 1
  doc.setFontSize(7.5)
  for (const s of series) {
    doc.setFillColor(...rgb(s.color))
    doc.circle(legendX + 1.4, legendY - 1.1, 1.2, 'F')
    doc.setTextColor(...INK)
    doc.text(s.name, legendX + 4, legendY)
    legendX += doc.getTextWidth(s.name) + 12
    if (legendX > left + width - 30) break
  }
}

export async function generateTemporalidadePdf(
  allRows: Row[],
  spec: TemporalidadePdfSpec,
) {
  const rows = filterRows(allRows, spec)
  if (!rows.length) throw new Error('Não há entrevistas neste recorte.')

  const cargos = CARGOS.filter((c) => spec.include[c.id])
  if (!cargos.length) {
    throw new Error('Selecione ao menos um cargo para o relatório.')
  }

  const logo = await loadLogo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const left = 12
  const width = pageW - 24
  const scope = scopeLabel(spec)
  const waves = temporalIrPoints(rows)
  const generated = new Date().toLocaleString('pt-BR')
  const built = cargos.map((cargo) => ({
    cargo,
    series: topSeries(rows, waves, cargo),
  }))

  drawLetterhead(doc, logo, 'Analítica · Temporalidade', 'Intenção de voto acumulada')
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(scope, left, 40)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(
    `${formatN(rows.length)} entrevistas · ${waves.length} ${
      waves.length === 1 ? 'onda' : 'ondas'
    } · gerado em ${generated}.`,
    left,
    46,
  )
  doc.text(
    'Mesmos cards da Temporalidade: principais candidatos, acumulado por onda. Contagens observadas, sem ponderação.',
    left,
    51,
  )

  autoTable(doc, {
    startY: 56,
    margin: { left, right: 12, bottom: 18 },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, textColor: INK, cellPadding: 2.2 },
    headStyles: {
      fillColor: PURPLE,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
    head: [['Cargo', 'Principais no card', 'Votos acumulados', '% da base']],
    body: built.map(({ cargo, series }) => [
      cargo.title.replace('Intenção de voto — ', ''),
      series.map((s) => s.name).join(' · ') || '—',
      formatN(series.reduce((s, row) => s + row.n, 0)),
      formatPctNum(
        rows.length
          ? (series.reduce((s, row) => s + row.n, 0) / rows.length) * 100
          : 0,
      ),
    ]),
  })

  for (const { cargo, series } of built) {
    await yieldFrame()
    doc.addPage()
    drawLetterhead(doc, logo, 'Analítica · Temporalidade', cargo.title)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(
      `${cargo.topN} principais · base ${formatN(rows.length)} · ${scope}`,
      left,
      36,
    )

    const head = [
      'Candidato',
      ...waves.map((w) => waveHead(w)),
      'Total',
      '%',
    ]
    autoTable(doc, {
      startY: 40,
      margin: { left, right: 12, bottom: 18 },
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7,
        textColor: INK,
        cellPadding: 1.5,
        valign: 'middle',
      },
      headStyles: {
        fillColor: PURPLE,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.5,
      },
      columnStyles: Object.fromEntries(
        head.slice(1).map((_, i) => [i + 1, { halign: 'right' as const }]),
      ),
      head: [head],
      body: series.map((s) => [
        s.name,
        ...s.points.map((p) => formatN(p.acumulado)),
        formatN(s.n),
        formatPctNum(s.pct),
      ]),
    })

    const tableBottom = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY ?? 80
    const chartTop = tableBottom + 8
    const chartH = Math.min(72, pageH - chartTop - 20)
    if (chartH > 36) {
      drawChart(doc, series, left, chartTop, width, chartH)
    }
  }

  drawFooters(doc, logo, scope)
  doc.save(`Relatorio_Temporalidade_${slug(scope) || 'Bahia'}.pdf`)
}
