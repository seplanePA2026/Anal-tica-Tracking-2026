import type { Row } from './types'
import { countBy } from './stats'

/** Ondas de pesquisa. Tracking Bahia: evolução por dia de campo. */
export type ResearchWave = {
  id: string
  label: string
  period: string
  /** Se vazio, a onda usa todas as linhas (pesquisa atual unificada). */
  folhas?: string[]
}

export const RESEARCH_WAVES: ResearchWave[] = [
  {
    id: 'tracking-bahia-1',
    label: 'Pesquisa Tracking Estadual Bahia',
    period: '',
  },
]

export type TimePoint = {
  id: string
  label: string
  rows: Row[]
}

/**
 * Pontos no eixo X da temporalidade.
 * Com uma onda só, usamos os dias de campo (folhas) para mostrar evolução interna.
 * Quando houver mais ondas, o eixo passa a ser cada pesquisa.
 */
export function temporalPoints(allRows: Row[], waves = RESEARCH_WAVES): TimePoint[] {
  if (waves.length > 1) {
    return waves.map((w) => ({
      id: w.id,
      label: w.label,
      rows: w.folhas?.length
        ? allRows.filter((r) => r.folha != null && w.folhas!.includes(r.folha))
        : allRows,
    }))
  }

  const folhas = [...new Set(allRows.map((r) => r.folha).filter(Boolean) as string[])]
  folhas.sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
  if (!folhas.length) {
    return [
      {
        id: waves[0]?.id ?? 'unica',
        label: waves[0]?.label ?? 'Pesquisa',
        rows: allRows,
      },
    ]
  }
  return folhas.map((folha) => ({
    id: folha,
    label: folha,
    rows: allRows.filter((r) => r.folha === folha),
  }))
}

/**
 * Pontos do eixo em Intenção × rejeição:
 * unifica cada onda num único ponto (06–08, 09–11, 12–…).
 */
export const IR_WAVE_FOLHAS: readonly (readonly string[])[] = [
  ['06.09', '07.09', '08.09'],
  ['09.09', '10.09', '11.09'],
  ['12.09', '13.09', '14.09'],
  ['15.09', '16.09', '17.09'],
  ['18.09', '19.09', '20.09'],
  ['21.09', '22.09'],
] as const

/** @deprecated use IR_WAVE_FOLHAS[0] */
export const IR_BASE_FOLHAS = IR_WAVE_FOLHAS[0]

function irPointLabel(folhas: string[]): string {
  if (folhas.length === 1) return folhas[0].replace(/\./g, '/')
  return `${folhas[0].replace(/\./g, '/')}–${folhas[folhas.length - 1].replace(/\./g, '/')}`
}

export function temporalIrPoints(allRows: Row[]): TimePoint[] {
  const folhas = [...new Set(allRows.map((r) => r.folha).filter(Boolean) as string[])]
  folhas.sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
  if (!folhas.length) {
    return [{ id: 'unica', label: 'Pesquisa', rows: allRows }]
  }

  const assigned = new Set<string>()
  const points: TimePoint[] = []

  for (const wave of IR_WAVE_FOLHAS) {
    const present = wave.filter((f) => folhas.includes(f))
    if (!present.length) continue
    for (const f of present) assigned.add(f)
    const set = new Set(present)
    points.push({
      id: `wave-${present.join('-')}`,
      label: irPointLabel(present),
      rows: allRows.filter((r) => r.folha != null && set.has(r.folha)),
    })
  }

  for (const folha of folhas) {
    if (assigned.has(folha)) continue
    points.push({
      id: folha,
      label: folha.replace(/\./g, '/'),
      rows: allRows.filter((r) => r.folha === folha),
    })
  }

  return points
}

export type LineSeries = {
  label: string
  color: string
  points: { x: string; pct: number; n: number; total: number }[]
}

export function questionEvolution(
  points: TimePoint[],
  fieldKey: string,
  colorFor: (label: string) => string,
): LineSeries[] {
  const labelSet = new Set<string>()
  const byPoint = points.map((p) => {
    const dist = countBy(p.rows, fieldKey)
    for (const row of dist.rows) labelSet.add(row.label)
    return { point: p, dist }
  })

  const labels = [...labelSet]
  labels.sort((a, b) => {
    const na = byPoint.reduce(
      (s, bp) => s + (bp.dist.rows.find((r) => r.label === a)?.n ?? 0),
      0,
    )
    const nb = byPoint.reduce(
      (s, bp) => s + (bp.dist.rows.find((r) => r.label === b)?.n ?? 0),
      0,
    )
    return nb - na || a.localeCompare(b, 'pt-BR')
  })

  return labels.map((label) => ({
    label,
    color: colorFor(label),
    points: byPoint.map(({ point, dist }) => {
      const hit = dist.rows.find((r) => r.label === label)
      return {
        x: point.label,
        pct: hit?.pct ?? 0,
        n: hit?.n ?? 0,
        total: dist.total,
      }
    }),
  }))
}
