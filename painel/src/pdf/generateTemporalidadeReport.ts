import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  candidateDaySeries,
  candidateIntentionRejection,
  INTENTION_REJECTION_RACES,
  type IntentionRejectionRace,
} from '../intencaoRejeicao'
import { colorFor, formatN, formatPctNum } from '../stats'
import { temporalIrPoints, formatWavePointLabel } from '../temporal'
import type { Row } from '../types'

const PURPLE: [number, number, number] = [124, 58, 237]
const INK: [number, number, number] = [27, 20, 48]
const MUTED: [number, number, number] = [109, 100, 132]
const LINE: [number, number, number] = [232, 226, 244]
const GREEN: [number, number, number] = [46, 125, 50]
const RED: [number, number, number] = [229, 57, 53]

export type TemporalidadePdfInclude = {
  acumulado: boolean
  intencaoRejeicao: boolean
  presidente: boolean
  governador: boolean
  senador: boolean
}

export type TemporalidadePdfSpec = {
  municipalities: string[]
  allMunicipalities: boolean
  candidatesByRace: Record<string, string[]>
  include: TemporalidadePdfInclude
}

type DocWithTable = jsPDF & { lastAutoTable?: { finalY: number } }

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

function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60)
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

function lastY(doc: jsPDF, fallback: number): number {
  return (doc as DocWithTable).lastAutoTable?.finalY ?? fallback
}

export async function generateTemporalidadePdf(
  allRows: Row[],
  spec: TemporalidadePdfSpec,
) {
  const rows = filterRows(allRows, spec)
  if (!rows.length) {
    throw new Error('Não há entrevistas neste recorte.')
  }

  const hasContent =
    spec.include.acumulado ||
    spec.include.intencaoRejeicao ||
    spec.include.presidente ||
    spec.include.governador ||
    spec.include.senador
  if (!hasContent) {
    throw new Error('Selecione ao menos uma seção para o relatório.')
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const left = 14
  const right = pageW - 14
  const width = right - left
  const generated = new Date().toLocaleString('pt-BR')
  const scope = scopeLabel(spec)
  const days = temporalIrPoints(rows)
  const irDays = days

  const footer = () => {
    const page = doc.getNumberOfPages()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(
      `Analítica · Temporalidade · Pesquisa Tracking Estadual Bahia · ${scope}`,
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
  doc.setFontSize(20)
  doc.text('Relatório de Temporalidade', left, 32)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Pesquisa Tracking Estadual Bahia', left, 42)

  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(scope, left, 72)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...MUTED)
  doc.text(
    `${formatN(rows.length)} entrevistas · ${days.length} ${
      days.length === 1 ? 'onda' : 'ondas'
    } de campo · gerado em ${generated}.`,
    left,
    80,
  )
  doc.text('Contagens observadas, sem ponderação. Base de todos os dias da Temporalidade.', left, 86)

  const nCand = INTENTION_REJECTION_RACES.reduce(
    (s, race) => s + (spec.candidatesByRace[race.id]?.length ?? 0),
    0,
  )
  autoTable(doc, {
    startY: 94,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 3 },
    headStyles: {
      fillColor: PURPLE,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: { 1: { halign: 'right' } },
    head: [['Recorte do relatório', 'Valor']],
    body: [
      ['Municípios', spec.allMunicipalities ? 'Todos (Bahia)' : formatN(spec.municipalities.length)],
      ['Candidatos selecionados', formatN(nCand)],
      ['Entrevistas', formatN(rows.length)],
      [
        'Ondas de campo',
        days.map((d) => formatWavePointLabel(d)).join(' · ') || '—',
      ],
      [
        'Seções',
        [
          spec.include.acumulado ? 'Acumulado' : null,
          spec.include.intencaoRejeicao ? 'Intenção × rejeição' : null,
          spec.include.presidente ? 'Presidente' : null,
          spec.include.governador ? 'Governador' : null,
          spec.include.senador ? 'Senador' : null,
        ]
          .filter(Boolean)
          .join(' · '),
      ],
    ],
    didDrawPage: footer,
  })

  if (!spec.allMunicipalities && spec.municipalities.length) {
    autoTable(doc, {
      startY: lastY(doc, 140) + 8,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8, textColor: INK, cellPadding: 2 },
      headStyles: {
        fillColor: PURPLE,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: { 1: { halign: 'right', cellWidth: 28 } },
      head: [['Município no recorte', 'N']],
      body: spec.municipalities.map((name) => [
        name,
        formatN(rows.filter((r) => r['Municípios'] === name).length),
      ]),
      didDrawPage: footer,
    })
  }

  if (spec.include.acumulado) {
    await yieldFrame()
    doc.addPage()
    footer()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...PURPLE)
    doc.text('Acumulado da pesquisa', left, 18)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text('Volume de entrevistas por onda de campo e total acumulado.', left, 25)

    let running = 0
    const body = days.map((d) => {
      running += d.rows.length
      return [
        formatWavePointLabel(d),
        formatN(d.rows.length),
        formatPctNum(rows.length ? (d.rows.length / rows.length) * 100 : 0),
        formatN(running),
      ]
    })
    autoTable(doc, {
      startY: 32,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8, textColor: INK, cellPadding: 2.2 },
      headStyles: {
        fillColor: PURPLE,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        1: { halign: 'right', cellWidth: 28 },
        2: { halign: 'right', cellWidth: 28 },
        3: { halign: 'right', cellWidth: 32 },
      },
      head: [['Onda', 'N da onda', '% do total', 'Acumulado']],
      body: [
        ...body,
        ['Total (base)', formatN(rows.length), rows.length ? '100,0%' : '—', formatN(running)],
      ],
      didDrawPage: footer,
    })
  }

  if (spec.include.intencaoRejeicao) {
    for (const race of INTENTION_REJECTION_RACES) {
      const names = spec.candidatesByRace[race.id] ?? []
      if (!names.length) continue
      await yieldFrame()
      doc.addPage()
      footer()
      let y = 18
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(...PURPLE)
      doc.text(`Intenção × rejeição — ${race.title.replace(/^Intenção de voto /i, '')}`, left, y)
      y += 8
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...MUTED)
      const irAxis = irDays.map((d) => formatWavePointLabel(d)).join(' → ')
      doc.text(`Pontos no tempo: ${irAxis || '—'}. Barras do recorte unificado.`, left, y)
      y += 6

      const cards = candidateIntentionRejection(rows, race).filter((c) =>
        names.includes(c.name),
      )
      autoTable(doc, {
        startY: y,
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 8, textColor: INK, cellPadding: 2 },
        headStyles: {
          fillColor: PURPLE,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          1: { halign: 'right', cellWidth: 28 },
          2: { halign: 'right', cellWidth: 24 },
          3: { halign: 'right', cellWidth: 28 },
          4: { halign: 'right', cellWidth: 24 },
        },
        head: [['Candidato', 'Intenção N', 'Intenção %', 'Rejeição N', 'Rejeição %']],
        body: cards.map((c) => [
          c.name,
          formatN(c.intentionN),
          formatPctNum(c.intentionPct),
          c.hasRejection ? formatN(c.rejectionN ?? 0) : '—',
          c.hasRejection ? formatPctNum(c.rejectionPct ?? 0) : '—',
        ]),
        didDrawPage: footer,
      })
      y = lastY(doc, y) + 10

      for (const name of names) {
        await yieldFrame()
        const series = candidateDaySeries(irDays, race, name)
        if (y + 42 > pageH - 18) {
          doc.addPage()
          footer()
          y = 18
        }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(...INK)
        doc.text(name, left, y)
        y += 3
        y = drawDualLine(
          doc,
          series.map((p) => ({
            x: p.x,
            intention: p.intentionPct,
            rejection: p.rejectionPct,
          })),
          left,
          y,
          width,
          36,
        )
        y += 8
      }
    }
  }

  const cargoFlags: { id: string; on: boolean }[] = [
    { id: 'presidente', on: spec.include.presidente },
    { id: 'governador', on: spec.include.governador },
    { id: 'senador', on: spec.include.senador },
  ]

  for (const flag of cargoFlags) {
    if (!flag.on) continue
    const race = INTENTION_REJECTION_RACES.find((r) => r.id === flag.id)
    if (!race) continue
    const names = spec.candidatesByRace[race.id] ?? []
    if (!names.length) continue
    await yieldFrame()
    await drawCargoAcumulado(doc, footer, rows, days, race, names, left, width, pageH)
  }

  const file = `Relatorio_Temporalidade_Bahia_2026_${slug(scope) || 'Bahia'}.pdf`
  doc.save(file)
}

async function drawCargoAcumulado(
  doc: jsPDF,
  footer: () => void,
  rows: Row[],
  days: { id: string; label: string; rows: Row[] }[],
  race: IntentionRejectionRace,
  names: string[],
  left: number,
  width: number,
  pageH: number,
) {
  doc.addPage()
  footer()
  const field = race.intentionKey
  const total = rows.length
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...PURPLE)
  doc.text(`Acumulado — ${race.title.replace(/^Intenção de voto /i, '')}`, left, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(
    `Intenção estimulada. Linha de acumulado por candidato nas ondas de campo. Base ${formatN(total)}.`,
    left,
    25,
  )

  const series = names.map((name) => {
    let running = 0
    const points = days.map((d) => {
      const n = d.rows.filter((r) => r[field] === name).length
      running += n
      return { x: formatWavePointLabel(d), n, acumulado: running }
    })
    const n = running
    return {
      name,
      color: colorFor(name),
      n,
      pct: total ? (n / total) * 100 : 0,
      points,
    }
  })

  const head = ['Candidato', ...days.map((d) => formatWavePointLabel(d)), 'Total', '%']
  const body = series.map((s) => [
    s.name,
    ...s.points.map((p) => formatN(p.acumulado)),
    formatN(s.n),
    formatPctNum(s.pct),
  ])

  autoTable(doc, {
    startY: 32,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7.5, textColor: INK, cellPadding: 1.8 },
    headStyles: {
      fillColor: PURPLE,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: Object.fromEntries(
      head.slice(1).map((_, i) => [i + 1, { halign: 'right' as const }]),
    ),
    head: [head],
    body,
    didDrawPage: footer,
  })

  let y = lastY(doc, 40) + 10
  if (y + 52 > pageH - 16) {
    doc.addPage()
    footer()
    y = 18
  }
  y = drawMultiLine(
    doc,
    series.map((s) => ({
      label: s.name,
      color: s.color,
      points: s.points.map((p) => ({ x: p.x, y: p.acumulado })),
    })),
    left,
    y,
    width,
    52,
  )
  await yieldFrame()
}

function drawDualLine(
  doc: jsPDF,
  points: { x: string; intention: number; rejection: number | null }[],
  left: number,
  top: number,
  width: number,
  height: number,
): number {
  if (!points.length) return top
  const h = height
  const plotL = left + 8
  const plotR = left + width - 8
  const plotT = top + 4
  const plotB = top + h - 10
  const maxY = Math.max(
    8,
    ...points.flatMap((p) => [p.intention, p.rejection ?? 0]),
  )
  const yMax = Math.min(100, Math.ceil(maxY / 5) * 5 || 10)
  const xPos = (i: number) =>
    points.length <= 1
      ? (plotL + plotR) / 2
      : plotL + (i / (points.length - 1)) * (plotR - plotL)
  const yPos = (pct: number) => plotB - (pct / yMax) * (plotB - plotT)

  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.2)
  doc.line(plotL, plotB, plotR, plotB)

  const intPath = points.map((p, i) => [xPos(i), yPos(p.intention)] as const)
  strokePath(doc, intPath, GREEN)
  const hasRej = points.some((p) => p.rejection != null)
  if (hasRej) {
    strokePath(
      doc,
      points.map((p, i) => [xPos(i), yPos(p.rejection ?? 0)] as const),
      RED,
    )
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  for (let i = 0; i < points.length; i++) {
    doc.setTextColor(...MUTED)
    doc.text(points[i].x, xPos(i), plotB + 4, { align: 'center' })
    doc.setTextColor(...GREEN)
    doc.text(formatPctNum(points[i].intention), xPos(i), yPos(points[i].intention) - 1.6, {
      align: 'center',
    })
  }
  return top + h
}

function drawMultiLine(
  doc: jsPDF,
  series: { label: string; color: string; points: { x: string; y: number }[] }[],
  left: number,
  top: number,
  width: number,
  height: number,
): number {
  if (!series.length || !series[0]?.points.length) return top
  const xs = series[0].points.map((p) => p.x)
  const plotL = left + 6
  const plotR = left + width - 6
  const plotT = top + 4
  const plotB = top + height - 12
  const maxY = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.y)))
  const yMax = Math.ceil(maxY / 50) * 50 || 50
  const xPos = (i: number) =>
    xs.length <= 1
      ? (plotL + plotR) / 2
      : plotL + (i / (xs.length - 1)) * (plotR - plotL)
  const yPos = (v: number) => plotB - (v / yMax) * (plotB - plotT)

  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.2)
  doc.line(plotL, plotB, plotR, plotB)

  for (const s of series) {
    strokePath(
      doc,
      s.points.map((p, i) => [xPos(i), yPos(p.y)] as const),
      rgb(s.color),
    )
  }

  doc.setFontSize(6.5)
  doc.setTextColor(...MUTED)
  xs.forEach((label, i) => {
    doc.text(label, xPos(i), plotB + 4, { align: 'center' })
  })
  return top + height
}

function strokePath(
  doc: jsPDF,
  pts: readonly (readonly [number, number])[],
  color: [number, number, number],
) {
  if (pts.length < 1) return
  doc.setDrawColor(...color)
  doc.setFillColor(...color)
  doc.setLineWidth(0.7)
  if (pts.length === 1) {
    doc.circle(pts[0][0], pts[0][1], 0.9, 'F')
    return
  }
  const [first, ...rest] = pts
  doc.line(first[0], first[1], rest[0][0], rest[0][1])
  for (let i = 1; i < rest.length; i++) {
    doc.line(rest[i - 1][0], rest[i - 1][1], rest[i][0], rest[i][1])
  }
  for (const [x, y] of pts) doc.circle(x, y, 0.85, 'F')
}
