import { useMemo, useState } from 'react'
import { isCandidateLabel } from '../intencaoRejeicao'
import { countBy, formatN, formatPctNum } from '../stats'
import { IR_WAVE_FOLHAS, temporalIrPoints, type TimePoint } from '../temporal'
import type { Row } from '../types'

type Props = {
  rows: Row[]
}

const ACUMULADOR_CITIES = [
  'Salvador',
  'Feira de Santana',
  'Vitória da Conquista',
  'Camaçari',
  'Lauro de Freitas',
] as const

const CITY_COLORS: Record<(typeof ACUMULADOR_CITIES)[number], string> = {
  Salvador: '#6D28D9',
  'Feira de Santana': '#0D9488',
  'Vitória da Conquista': '#D97706',
  Camaçari: '#2563EB',
  'Lauro de Freitas': '#DB2777',
}

const PRESIDENT_FIELD = 'ESTIMULADA PRESIDENTE'
const GOVERNOR_FIELD = 'ESTIMULADA GOVERNADOR'
const JERO_APOIOS_FIELD = 'JEROXACM com apoios'
const JERO_APOIOS_CANDS = ['Jerônimo Rodrigues', 'ACM Neto'] as const

type CitySeries = {
  city: string
  color: string
  points: { x: string; pct: number; n: number; total: number; acumuladoN: number; acumuladoTotal: number }[]
}

function shortWaveLabel(label: string): string {
  const range = label.match(
    /^0?(\d{1,2})\/(\d{2})\s*[–-]\s*0?(\d{1,2})\/(\d{2})$/,
  )
  if (range) {
    const [, d1, m1, d2, m2] = range
    if (m1 === m2) return `${Number(d1)}–${Number(d2)}/${m1}`
    return `${Number(d1)}/${m1}–${Number(d2)}/${m2}`
  }
  return label.replace(/\./g, '/')
}

function candidateOptions(rows: Row[], fieldKey: string, fixed?: readonly string[]): string[] {
  if (fixed?.length) {
    return fixed.filter((c) => rows.some((r) => r[fieldKey] === c))
  }
  return countBy(rows, fieldKey)
    .rows.filter((r) => isCandidateLabel(r.label))
    .map((r) => r.label)
}

function buildCitySeries(
  fieldKey: string,
  candidate: string,
  waves: TimePoint[],
): CitySeries[] {
  return ACUMULADOR_CITIES.map((city) => {
    let acumuladoN = 0
    let acumuladoTotal = 0
    const points = waves.map((w) => {
      const dayRows = w.rows.filter((r) => r['Municípios'] === city)
      const n = dayRows.filter((r) => r[fieldKey] === candidate).length
      const total = dayRows.length
      acumuladoN += n
      acumuladoTotal += total
      return {
        x: shortWaveLabel(w.label),
        pct: acumuladoTotal ? (acumuladoN / acumuladoTotal) * 100 : 0,
        n,
        total,
        acumuladoN,
        acumuladoTotal,
      }
    })
    return {
      city,
      color: CITY_COLORS[city],
      points,
    }
  })
}

export function AcumuladorView({ rows }: Props) {
  const cityRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          r['Municípios'] != null &&
          (ACUMULADOR_CITIES as readonly string[]).includes(r['Municípios']),
      ),
    [rows],
  )

  const waves = useMemo(() => temporalIrPoints(cityRows), [cityRows])

  const nCities = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of ACUMULADOR_CITIES) {
      map[c] = cityRows.filter((r) => r['Municípios'] === c).length
    }
    return map
  }, [cityRows])

  return (
    <div className="acumulador-page">
      <header className="report-hero temporal-hero">
        <div className="temporal-hero-text">
          <p className="kicker">Acumulador</p>
          <h2>Intenção acumulada × 5 municípios</h2>
          <p className="lede">
            {formatN(cityRows.length)} entrevistas em Salvador, Feira de Santana,
            Vitória da Conquista, Camaçari e Lauro de Freitas ·{' '}
            {IR_WAVE_FOLHAS.length} ondas. Escolha o candidato e compare o
            acumulado por cidade.
          </p>
        </div>
      </header>

      <ul className="acum-city-legend" aria-label="Municípios">
        {ACUMULADOR_CITIES.map((city) => (
          <li key={city}>
            <span className="line-swatch" style={{ background: CITY_COLORS[city] }} />
            {city}
            <em>{formatN(nCities[city] ?? 0)}</em>
          </li>
        ))}
      </ul>

      <AcumuladorRace
        title="Presidente — estimulada"
        fieldKey={PRESIDENT_FIELD}
        rows={cityRows}
        waves={waves}
      />
      <AcumuladorRace
        title="Governador — estimulada"
        fieldKey={GOVERNOR_FIELD}
        rows={cityRows}
        waves={waves}
      />
      <AcumuladorRace
        title="Governador com apoio do presidente Lula"
        fieldKey={JERO_APOIOS_FIELD}
        rows={cityRows}
        waves={waves}
        fixedCandidates={JERO_APOIOS_CANDS}
      />
    </div>
  )
}

function AcumuladorRace({
  title,
  fieldKey,
  rows,
  waves,
  fixedCandidates,
}: {
  title: string
  fieldKey: string
  rows: Row[]
  waves: TimePoint[]
  fixedCandidates?: readonly string[]
}) {
  const options = useMemo(
    () => candidateOptions(rows, fieldKey, fixedCandidates),
    [rows, fieldKey, fixedCandidates],
  )
  const [candidate, setCandidate] = useState(options[0] ?? '')

  const active = options.includes(candidate) ? candidate : (options[0] ?? '')
  const series = useMemo(
    () => (active ? buildCitySeries(fieldKey, active, waves) : []),
    [fieldKey, active, waves],
  )

  if (!options.length) {
    return (
      <section className="temporal-intencao-card temporal-intencao-card-full acumulador-card">
        <h3>{title}</h3>
        <p className="empty-filter">Sem candidatos neste recorte.</p>
      </section>
    )
  }

  return (
    <section className="temporal-intencao-card temporal-intencao-card-full acumulador-card">
      <div className="acumulador-card-head">
        <div>
          <h3>{title}</h3>
          <p className="temporal-acumulado-lede">
            Acumulado por onda · % do candidato no município (entrevistas
            acumuladas até a onda).
          </p>
        </div>
        <label className="acumulador-cand-filter">
          Candidato
          <select value={active} onChange={(e) => setCandidate(e.target.value)}>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      </div>
      <CityCrossChart series={series} candidate={active} />
    </section>
  )
}

function CityCrossChart({
  series,
  candidate,
}: {
  series: CitySeries[]
  candidate: string
}) {
  if (!series.length || !series[0]?.points.length) {
    return <p className="empty-filter">Sem dados para {candidate}.</p>
  }

  const labels = series[0].points.map((p) => p.x)
  const pad = { top: 28, right: 16, bottom: 44, left: 44 }
  const width = 960
  const height = 340
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const maxPct = Math.max(
    10,
    ...series.flatMap((s) => s.points.map((p) => p.pct)),
  )
  const yMax = Math.min(100, Math.ceil(maxPct / 5) * 5 || 10)
  const nCities = series.length
  const nWaves = labels.length
  const groupW = innerW / Math.max(1, nWaves)
  const barGap = 2
  const barW = Math.max(4, (groupW - 16) / nCities - barGap)

  const yPos = (pct: number) => pad.top + innerH - (pct / yMax) * innerH

  return (
    <div className="acumulador-chart-wrap">
      <svg
        className="line-chart acumulador-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Acumulado de ${candidate} por município e onda`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const g = t * yMax
          return (
            <g key={g}>
              <line
                x1={pad.left}
                x2={pad.left + innerW}
                y1={yPos(g)}
                y2={yPos(g)}
                className="line-grid"
              />
              <text
                x={pad.left - 8}
                y={yPos(g) + 4}
                className="line-axis"
                textAnchor="end"
              >
                {formatPctNum(g)}
              </text>
            </g>
          )
        })}

        {labels.map((label, wi) => {
          const groupX = pad.left + wi * groupW + 8
          return (
            <g key={label}>
              {series.map((s, ci) => {
                const p = s.points[wi]
                const h = Math.max(0, ((p?.pct ?? 0) / yMax) * innerH)
                const x = groupX + ci * (barW + barGap)
                const y = pad.top + innerH - h
                return (
                  <g key={s.city}>
                    <rect
                      x={x}
                      y={y}
                      width={barW}
                      height={h}
                      fill={s.color}
                      rx={2}
                    >
                      <title>
                        {s.city} · {label}: {formatPctNum(p?.pct ?? 0)} (
                        {formatN(p?.acumuladoN ?? 0)} /{' '}
                        {formatN(p?.acumuladoTotal ?? 0)})
                      </title>
                    </rect>
                  </g>
                )
              })}
              <text
                x={groupX + ((nCities * (barW + barGap) - barGap) / 2)}
                y={height - 14}
                className="line-axis"
                textAnchor="middle"
              >
                {label}
              </text>
            </g>
          )
        })}
      </svg>
      <ul className="acum-city-legend acumulador-chart-legend">
        {series.map((s) => {
          const last = s.points[s.points.length - 1]
          return (
            <li key={s.city}>
              <span className="line-swatch" style={{ background: s.color }} />
              {s.city}
              <em>
                {formatPctNum(last?.pct ?? 0)} · {formatN(last?.acumuladoN ?? 0)}
              </em>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
