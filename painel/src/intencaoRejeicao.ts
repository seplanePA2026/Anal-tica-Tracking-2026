import { countBy, formatN, formatPctNum, norm } from './stats'
import type { Row } from './types'

export type KnowRejectionField = {
  /** Base do nome do candidato (sem acento, minúsculo), ex.: "acm neto". */
  match: string
  field: string
  value: string
}

export type IntentionRejectionRace = {
  id: string
  title: string
  intentionKey: string
  rejectionKey: string | null
  /** Rejeição por candidato (ex.: "conhece e não vota"). */
  rejectionKnowFields?: KnowRejectionField[]
}

export const INTENTION_REJECTION_RACES: IntentionRejectionRace[] = [
  {
    id: 'presidente',
    title: 'Intenção de voto presidente',
    intentionKey: 'ESTIMULADA PRESIDENTE',
    rejectionKey: 'ESTIMULADA REJEIÇÃO PRESIDENTE cdd',
  },
  {
    id: 'governador',
    title: 'Intenção de voto governador',
    intentionKey: 'ESTIMULADA GOVERNADOR',
    rejectionKey: null,
    rejectionKnowFields: [
      {
        match: 'jeronimo rodrigues',
        field: 'Conhecimento e voto JERÔNIMO RODRIGUES',
        value: 'Conhece e não vota',
      },
      {
        match: 'acm neto',
        field: 'Conhecimento e voto ACM NETO',
        value: 'Conhece e não vota',
      },
      {
        match: 'ronaldo mansur',
        field: 'Conhecimento e voto RONALDO MANSUR',
        value: 'Conhece e não vota',
      },
    ],
  },
  {
    id: 'senador',
    title: 'Intenção de voto senador',
    intentionKey: 'ESTIMULADA SENADOR 1ª OPÇÃO',
    rejectionKey: 'REJEIÇÃO SENADOR',
  },
]

export type CandidateIR = {
  name: string
  intentionN: number
  intentionPct: number
  rejectionN: number | null
  rejectionPct: number | null
  hasRejection: boolean
}

const META =
  /^(nenhum|ninguém|ninguem|não sabe|nao sabe|branco|nulo|não respondeu|nao respondeu|outros|outros nomes)/i

export function isCandidateLabel(label: string): boolean {
  const t = label.trim()
  if (!t) return false
  if (META.test(t)) return false
  if (/\([^)]+\)/.test(t)) return true
  return false
}

export function baseCandidateName(label: string): string {
  return label
    .replace(/\s*\([^)]*\)\s*$/u, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function raceHasRejection(race: IntentionRejectionRace): boolean {
  return Boolean(race.rejectionKey || race.rejectionKnowFields?.length)
}

function countAnswer(rows: Row[], field: string, value: string): { n: number; pct: number } {
  const total = rows.length
  let n = 0
  for (const r of rows) {
    if (norm(r[field]) === value) n += 1
  }
  return { n, pct: total ? (n / total) * 100 : 0 }
}

function findKnowField(
  race: IntentionRejectionRace,
  candidateName: string,
): KnowRejectionField | undefined {
  const key = baseCandidateName(candidateName)
  return race.rejectionKnowFields?.find((f) => key.includes(f.match) || f.match.includes(key))
}

function rejectionForCandidate(
  rows: Row[],
  race: IntentionRejectionRace,
  candidateName: string,
  rejectionByBase: Map<string, { n: number; pct: number }>,
): { n: number; pct: number } | null {
  if (race.rejectionKnowFields?.length) {
    const field = findKnowField(race, candidateName)
    if (!field) return null
    return countAnswer(rows, field.field, field.value)
  }
  if (!race.rejectionKey) return null
  const key = baseCandidateName(candidateName)
  return rejectionByBase.get(key) ?? { n: 0, pct: 0 }
}

export function candidateIntentionRejection(
  rows: Row[],
  race: IntentionRejectionRace,
): CandidateIR[] {
  const intention = countBy(rows, race.intentionKey)
  const rejection = race.rejectionKey
    ? countBy(rows, race.rejectionKey)
    : null

  const rejectionByBase = new Map<string, { n: number; pct: number }>()
  if (rejection) {
    for (const r of rejection.rows) {
      if (!isCandidateLabel(r.label)) continue
      const key = baseCandidateName(r.label)
      const prev = rejectionByBase.get(key)
      if (!prev || r.n > prev.n) rejectionByBase.set(key, { n: r.n, pct: r.pct })
    }
  }

  const seen = new Set<string>()
  const out: CandidateIR[] = []
  const hasRej = raceHasRejection(race)

  for (const r of intention.rows) {
    if (!isCandidateLabel(r.label)) continue
    const key = baseCandidateName(r.label)
    if (seen.has(key)) continue
    seen.add(key)
    const rej = rejectionForCandidate(rows, race, r.label, rejectionByBase)
    out.push({
      name: r.label,
      intentionN: r.n,
      intentionPct: r.pct,
      rejectionN: rej ? rej.n : hasRej ? 0 : null,
      rejectionPct: rej ? rej.pct : hasRej ? 0 : null,
      hasRejection: rej != null || (hasRej && Boolean(race.rejectionKey)),
    })
  }

  // Para governador: inclui quem só tem "conhece e não vota", se não estiver na estimulada.
  if (race.rejectionKnowFields?.length) {
    for (const f of race.rejectionKnowFields) {
      if (seen.has(f.match)) continue
      const already = [...seen].some((k) => k.includes(f.match) || f.match.includes(k))
      if (already) continue
      const rej = countAnswer(rows, f.field, f.value)
      if (!rej.n) continue
      seen.add(f.match)
      out.push({
        name: f.field.replace(/^Conhecimento e voto\s+/i, ''),
        intentionN: 0,
        intentionPct: 0,
        rejectionN: rej.n,
        rejectionPct: rej.pct,
        hasRejection: true,
      })
    }
  }

  if (rejection) {
    for (const r of rejection.rows) {
      if (!isCandidateLabel(r.label)) continue
      const key = baseCandidateName(r.label)
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        name: r.label,
        intentionN: 0,
        intentionPct: 0,
        rejectionN: r.n,
        rejectionPct: r.pct,
        hasRejection: true,
      })
    }
  }

  // Só mostra rejeição nos cards de governador que têm o campo "conhece e não vota".
  if (race.rejectionKnowFields?.length) {
    for (const c of out) {
      c.hasRejection = findKnowField(race, c.name) != null
      if (!c.hasRejection) {
        c.rejectionN = null
        c.rejectionPct = null
      }
    }
  }

  out.sort(
    (a, b) =>
      b.intentionPct - a.intentionPct ||
      (b.rejectionPct ?? 0) - (a.rejectionPct ?? 0) ||
      a.name.localeCompare(b.name, 'pt-BR'),
  )

  return out
}

export function formatIRValue(n: number, pct: number): string {
  return `${formatPctNum(pct)} · ${formatN(n)}`
}

export type DayIRPoint = {
  x: string
  intentionN: number
  intentionPct: number
  rejectionN: number | null
  rejectionPct: number | null
}

function matchCount(
  dist: { rows: { label: string; n: number; pct: number }[] },
  candidateName: string,
): { n: number; pct: number } {
  const key = baseCandidateName(candidateName)
  const hit = dist.rows.find(
    (r) => isCandidateLabel(r.label) && baseCandidateName(r.label) === key,
  )
  return { n: hit?.n ?? 0, pct: hit?.pct ?? 0 }
}

/** Evolução diária de intenção e rejeição para um candidato. */
export function candidateDaySeries(
  dayPoints: { label: string; rows: Row[] }[],
  race: IntentionRejectionRace,
  candidateName: string,
): DayIRPoint[] {
  return dayPoints.map((day) => {
    const intention = countBy(day.rows, race.intentionKey)
    const intHit = matchCount(intention, candidateName)

    if (race.rejectionKnowFields?.length) {
      const field = findKnowField(race, candidateName)
      if (!field) {
        return {
          x: day.label,
          intentionN: intHit.n,
          intentionPct: intHit.pct,
          rejectionN: null,
          rejectionPct: null,
        }
      }
      const rej = countAnswer(day.rows, field.field, field.value)
      return {
        x: day.label,
        intentionN: intHit.n,
        intentionPct: intHit.pct,
        rejectionN: rej.n,
        rejectionPct: rej.pct,
      }
    }

    if (!race.rejectionKey) {
      return {
        x: day.label,
        intentionN: intHit.n,
        intentionPct: intHit.pct,
        rejectionN: null,
        rejectionPct: null,
      }
    }
    const rejection = countBy(day.rows, race.rejectionKey)
    const rejHit = matchCount(rejection, candidateName)
    return {
      x: day.label,
      intentionN: intHit.n,
      intentionPct: intHit.pct,
      rejectionN: rejHit.n,
      rejectionPct: rejHit.pct,
    }
  })
}
