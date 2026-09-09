import { countBy, formatN, formatPctNum } from './stats'
import type { Row } from './types'

export type IntentionRejectionRace = {
  id: string
  title: string
  intentionKey: string
  rejectionKey: string | null
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
  // Candidatos costumam vir com partido entre parênteses.
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

export function candidateIntentionRejection(
  rows: Row[],
  race: IntentionRejectionRace,
): CandidateIR[] {
  const intention = countBy(rows, race.intentionKey)
  const rejection = race.rejectionKey
    ? countBy(rows, race.rejectionKey)
    : null

  const rejectionByBase = new Map<string, { label: string; n: number; pct: number }>()
  if (rejection) {
    for (const r of rejection.rows) {
      if (!isCandidateLabel(r.label)) continue
      const key = baseCandidateName(r.label)
      const prev = rejectionByBase.get(key)
      if (!prev || r.n > prev.n) rejectionByBase.set(key, r)
    }
  }

  const seen = new Set<string>()
  const out: CandidateIR[] = []

  for (const r of intention.rows) {
    if (!isCandidateLabel(r.label)) continue
    const key = baseCandidateName(r.label)
    if (seen.has(key)) continue
    seen.add(key)
    const rej = rejectionByBase.get(key)
    out.push({
      name: r.label,
      intentionN: r.n,
      intentionPct: r.pct,
      rejectionN: race.rejectionKey ? (rej?.n ?? 0) : null,
      rejectionPct: race.rejectionKey ? (rej?.pct ?? 0) : null,
      hasRejection: Boolean(race.rejectionKey),
    })
  }

  // Candidatos só na rejeição (sem intenção registrada).
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
