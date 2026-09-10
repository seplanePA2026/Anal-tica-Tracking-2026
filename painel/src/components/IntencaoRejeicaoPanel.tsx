import { useMemo, useState } from 'react'
import {
  candidateDaySeries,
  candidateIntentionRejection,
  formatIRValue,
  INTENTION_REJECTION_RACES,
  type DayIRPoint,
  type IntentionRejectionRace,
} from '../intencaoRejeicao'
import { formatN, formatPctNum } from '../stats'
import { temporalIrPoints } from '../temporal'
import { ALL, type Row } from '../types'

type Props = {
  rows: Row[]
  municipalities: string[]
}

export function IntencaoRejeicaoPanel({ rows, municipalities }: Props) {
  const [municipio, setMunicipio] = useState(ALL)

  const scoped = useMemo(() => {
    if (municipio === ALL) return rows
    return rows.filter((r) => r['Municípios'] === municipio)
  }, [rows, municipio])

  const days = useMemo(() => temporalIrPoints(scoped), [scoped])

  return (
    <section className="temporal-group ir-panel">
      <h3>Intenção × rejeição por candidato</h3>
      <p className="temporal-acumulado-lede">
        Barras: resultado unificado de todos os dias. Linha: bloco 06–08/09 como
        um ponto e o dia 09/09 como o seguinte, ligados pela evolução.
      </p>

      <div className="temporal-card-filters">
        <label className="flt">
          Município
          <select value={municipio} onChange={(e) => setMunicipio(e.target.value)}>
            <option value={ALL}>Bahia (todos)</option>
            {municipalities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="temporal-n temporal-n-card">
        {formatN(scoped.length)} entrevistas · {days.length}{' '}
        {days.length === 1 ? 'ponto' : 'pontos'} no tempo
        {municipio === ALL ? '' : ` · ${municipio}`}
      </p>

      {!scoped.length ? (
        <p className="empty-filter">Sem entrevistas neste recorte.</p>
      ) : (
        INTENTION_REJECTION_RACES.map((race) => (
          <RaceBlock key={race.id} race={race} rows={scoped} days={days} />
        ))
      )}
    </section>
  )
}

function RaceBlock({
  race,
  rows,
  days,
}: {
  race: IntentionRejectionRace
  rows: Row[]
  days: { label: string; rows: Row[] }[]
}) {
  const cards = useMemo(() => candidateIntentionRejection(rows, race), [rows, race])
  const maxPct = Math.max(
    1,
    ...cards.flatMap((c) => [
      c.intentionPct,
      c.hasRejection ? (c.rejectionPct ?? 0) : 0,
    ]),
  )

  return (
    <div className="ir-race">
      <h4 className="ir-race-title">{race.title}</h4>
      {race.id === 'governador' ? (
        <p className="ir-race-note">
          Rejeição = respostas “Conhece e não vota” nas perguntas de conhecimento e
          voto (Jerônimo, ACM Neto e Mansur).
        </p>
      ) : null}
      <div className="ir-grid">
        {cards.map((c) => {
          const daySeries = candidateDaySeries(days, race, c.name)
          return (
            <article key={c.name} className="ir-card">
              <h5 className="ir-card-name">{c.name}</h5>

              <div className="ir-row ir-intention">
                <div className="ir-row-head">
                  <span>Intenção</span>
                  <strong>{formatIRValue(c.intentionN, c.intentionPct)}</strong>
                </div>
                <div className="ir-track">
                  <div
                    className="ir-fill ir-fill-intention"
                    style={{ width: `${(c.intentionPct / maxPct) * 100}%` }}
                  />
                </div>
              </div>

              <div className="ir-row ir-rejection">
                <div className="ir-row-head">
                  <span>Rejeição</span>
                  <strong>
                    {c.hasRejection
                      ? formatIRValue(c.rejectionN ?? 0, c.rejectionPct ?? 0)
                      : '—'}
                  </strong>
                </div>
                {c.hasRejection ? (
                  <div className="ir-track">
                    <div
                      className="ir-fill ir-fill-rejection"
                      style={{
                        width: `${((c.rejectionPct ?? 0) / maxPct) * 100}%`,
                      }}
                    />
                  </div>
                ) : (
                  <p className="ir-missing">Sem dado de rejeição</p>
                )}
              </div>

              <IRDayChart points={daySeries} hasRejection={c.hasRejection} />
            </article>
          )
        })}
      </div>
    </div>
  )
}

function dayLabel(label: string): string {
  const m = label.match(/^0?(\d{1,2})\.(\d{2})$/)
  if (m) return `${Number(m[1])}/${m[2]}`
  return label
}

function IRDayChart({
  points,
  hasRejection,
}: {
  points: DayIRPoint[]
  hasRejection: boolean
}) {
  if (!points.length) return null

  const pad = { top: 22, right: 52, bottom: 36, left: 40 }
  const width = 340
  const height = 168
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const maxY = Math.max(
    8,
    ...points.flatMap((p) => [
      p.intentionPct,
      hasRejection ? (p.rejectionPct ?? 0) : 0,
    ]),
  )
  const yMax = Math.min(100, Math.ceil(maxY / 5) * 5 || 10)
  /** Distância mínima entre os pontos das duas séries. */
  const minGap = 28

  const xPos = (i: number) => {
    if (points.length <= 1) return pad.left + innerW / 2
    return pad.left + (i / (points.length - 1)) * innerW
  }
  const yPos = (pct: number) => pad.top + innerH - (pct / yMax) * innerH

  const separated = points.map((p) => {
    let yi = yPos(p.intentionPct)
    let yr = hasRejection ? yPos(p.rejectionPct ?? 0) : yi
    if (hasRejection) {
      if (Math.abs(yi - yr) < minGap) {
        const mid = (yi + yr) / 2
        const half = minGap / 2
        if (p.intentionPct >= (p.rejectionPct ?? 0)) {
          yi = mid - half
          yr = mid + half
        } else {
          yi = mid + half
          yr = mid - half
        }
      }
      const lo = pad.top + 8
      const hi = pad.top + innerH - 8
      yi = Math.min(hi, Math.max(lo, yi))
      yr = Math.min(hi, Math.max(lo, yr))
      if (Math.abs(yi - yr) < minGap) {
        if (yi <= yr) yr = Math.min(hi, yi + minGap)
        else yi = Math.min(hi, yr + minGap)
      }
    }
    return { ...p, yi, yr }
  })

  const intentionPath = separated
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${p.yi}`)
    .join(' ')
  const rejectionPath = separated
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${p.yr}`)
    .join(' ')

  return (
    <div className="ir-day-chart">
      <svg
        className="line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Evolução diária de intenção e rejeição"
      >
        {[0, 0.5, 1].map((t) => {
          const g = t * yMax
          return (
            <line
              key={g}
              x1={pad.left}
              x2={pad.left + innerW}
              y1={yPos(g)}
              y2={yPos(g)}
              className="line-grid"
            />
          )
        })}

        <path
          d={intentionPath}
          fill="none"
          stroke="#2e7d32"
          strokeWidth="2.5"
          strokeLinejoin="miter"
          strokeLinecap="butt"
        />
        {hasRejection ? (
          <path
            d={rejectionPath}
            fill="none"
            stroke="#e53935"
            strokeWidth="2.5"
            strokeLinejoin="miter"
            strokeLinecap="butt"
          />
        ) : null}

        {separated.map((p, i) => {
          const cx = xPos(i)
          return (
            <g key={p.x}>
              <circle
                cx={cx}
                cy={p.yi}
                r="4.5"
                fill="#2e7d32"
                stroke="#fff"
                strokeWidth="1.5"
              >
                <title>
                  Intenção {dayLabel(p.x)}: {formatN(p.intentionN)} ·{' '}
                  {formatPctNum(p.intentionPct)}
                </title>
              </circle>
              {/* Intenção sempre à esquerda do ponto */}
              <text
                x={cx - 10}
                y={p.yi - 4}
                className="ir-day-n ir-day-halo"
                textAnchor="end"
                fill="#2e7d32"
              >
                {formatN(p.intentionN)}
              </text>
              <text
                x={cx - 10}
                y={p.yi + 8}
                className="ir-day-pct ir-day-halo"
                textAnchor="end"
                fill="#2e7d32"
              >
                {formatPctNum(p.intentionPct)}
              </text>

              {hasRejection ? (
                <>
                  <circle
                    cx={cx}
                    cy={p.yr}
                    r="4.5"
                    fill="#e53935"
                    stroke="#fff"
                    strokeWidth="1.5"
                  >
                    <title>
                      Rejeição {dayLabel(p.x)}: {formatN(p.rejectionN ?? 0)} ·{' '}
                      {formatPctNum(p.rejectionPct ?? 0)}
                    </title>
                  </circle>
                  {/* Rejeição sempre à direita do ponto */}
                  <text
                    x={cx + 10}
                    y={p.yr - 4}
                    className="ir-day-n ir-day-halo"
                    textAnchor="start"
                    fill="#e53935"
                  >
                    {formatN(p.rejectionN ?? 0)}
                  </text>
                  <text
                    x={cx + 10}
                    y={p.yr + 8}
                    className="ir-day-pct ir-day-halo"
                    textAnchor="start"
                    fill="#e53935"
                  >
                    {formatPctNum(p.rejectionPct ?? 0)}
                  </text>
                </>
              ) : null}

              <text
                x={cx}
                y={height - 8}
                className="line-axis"
                textAnchor="middle"
              >
                {dayLabel(p.x)}
              </text>
            </g>
          )
        })}
      </svg>
      <ul className="ir-day-legend">
        <li>
          <span className="line-swatch" style={{ background: '#2e7d32' }} />
          Intenção
        </li>
        {hasRejection ? (
          <li>
            <span className="line-swatch" style={{ background: '#e53935' }} />
            Rejeição
          </li>
        ) : null}
      </ul>
    </div>
  )
}
