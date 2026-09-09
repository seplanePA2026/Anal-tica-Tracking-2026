import type { Row } from './types'
import { countBy } from './stats'

/** Ondas de pesquisa. Hoje há só o Tracking Bahia 1 (dias 6–8 unificados). */
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
    label: 'Pesquisa Tracking Bahia Estadual',
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
