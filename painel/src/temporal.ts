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
 * unifica 06+07+08 num único ponto e cada dia seguinte (09, …) como ponto próprio.
 */
export const IR_BASE_FOLHAS = ['06.09', '07.09', '08.09'] as const

export function temporalIrPoints(allRows: Row[]): TimePoint[] {
  const folhas = [...new Set(allRows.map((r) => r.folha).filter(Boolean) as string[])]
  folhas.sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
  if (!folhas.length) {
    return [{ id: 'unica', label: 'Pesquisa', rows: allRows }]
  }

  const baseSet = new Set<string>(IR_BASE_FOLHAS)
  const baseFolhas = folhas.filter((f) => baseSet.has(f))
  const laterFolhas = folhas.filter((f) => !baseSet.has(f))
  const points: TimePoint[] = []

  if (baseFolhas.length) {
    const label =
      baseFolhas.length === 1
        ? baseFolhas[0].replace(/\./g, '/')
        : `${baseFolhas[0].replace(/\./g, '/')}–${baseFolhas[baseFolhas.length - 1].replace(/\./g, '/')}`
    points.push({
      id: `base-${baseFolhas.join('-')}`,
      label,
      rows: allRows.filter((r) => r.folha != null && baseSet.has(r.folha)),
    })
  }

  for (const folha of laterFolhas) {
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
