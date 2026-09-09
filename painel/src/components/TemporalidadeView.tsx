import { useMemo, useState } from 'react'
import { fieldHeading, TEMPORAL_SECTIONS } from '../labels'
import { colorFor, formatN, formatPctNum } from '../stats'
import { RESEARCH_WAVES, questionEvolution } from '../temporal'
import { ALL, type Row } from '../types'

type Props = {
  rows: Row[]
  municipalities: string[]
}

export function TemporalidadeView({ rows, municipalities }: Props) {
  const wave = RESEARCH_WAVES[0]

  return (
    <div className="temporal-page">
      <header className="report-hero">
        <p className="kicker">Temporalidade</p>
        <h2>{wave?.label ?? 'Evolução'}</h2>
      </header>

      <div className="temporal-grid">
        {TEMPORAL_SECTIONS.map((g) => (
          <section key={g.id} className="temporal-group">
            <h3>{g.title}</h3>
            {g.keys.map((key) => (
              <TemporalQuestionCard
                key={key}
                fieldKey={key}
                rows={rows}
                municipalities={municipalities}
              />
            ))}
          </section>
        ))}
      </div>

      <TemporalAcumulado rows={rows} municipalities={municipalities} />
    </div>
  )
}

type CardProps = {
  fieldKey: string
  rows: Row[]
  municipalities: string[]
}

function TemporalQuestionCard({ fieldKey, rows, municipalities }: CardProps) {
  const [municipio, setMunicipio] = useState(ALL)

  const scoped = useMemo(() => {
    if (municipio === ALL) return rows
    return rows.filter((r) => r['Municípios'] === municipio)
  }, [rows, municipio])

  const points = useMemo(
    () => [
      {
        id: 'acumulado',
        label: 'Acumulado',
        rows: scoped,
      },
    ],
    [scoped],
  )

  const series = useMemo(
    () =>
      questionEvolution(points, fieldKey, colorFor).filter((s) =>
        s.points.some((p) => p.pct > 0),
      ),
    [points, fieldKey],
  )

  return (
    <article className="temporal-mini">
      <h4 className="temporal-mini-title">{fieldHeading(fieldKey)}</h4>

      <div className="temporal-card-filters">
        <MunicipioFilter
          value={municipio}
          onChange={setMunicipio}
          municipalities={municipalities}
        />
      </div>

      <p className="temporal-n temporal-n-card">
        {formatN(scoped.length)} entrevistas · 1 ponto consolidado
        {municipio === ALL ? '' : ` · ${municipio}`}
      </p>

      {scoped.length && series.length ? (
        <PulseLineChart series={series} />
      ) : (
        <p className="empty-filter">Sem entrevistas neste recorte.</p>
      )}
    </article>
  )
}

function TemporalAcumulado({
  rows,
  municipalities,
}: {
  rows: Row[]
  municipalities: string[]
}) {
  const [municipio, setMunicipio] = useState(ALL)

  const scoped = useMemo(() => {
    if (municipio === ALL) return rows
    return rows.filter((r) => r['Municípios'] === municipio)
  }, [rows, municipio])

  const totalSeries = useMemo(
    () => [
      {
        label: municipio === ALL ? 'Total da pesquisa' : `Total em ${municipio}`,
        color: '#7C4DFF',
        points: [{ x: 'Acumulado', value: scoped.length }],
      },
    ],
    [municipio, scoped.length],
  )

  return (
    <section className="temporal-group temporal-acumulado">
      <h3>Acumulado da pesquisa</h3>
      <p className="temporal-acumulado-lede">
        Total consolidado dos três dias de campo (06.09, 07.09 e 08.09).
      </p>

      <article className="temporal-mini">
        <div className="temporal-card-filters">
          <MunicipioFilter
            value={municipio}
            onChange={setMunicipio}
            municipalities={municipalities}
          />
        </div>

        <div className="temporal-total-card">
          <p className="temporal-total-label">{totalSeries[0].label}</p>
          <p className="temporal-n temporal-n-card">
            entrevistas consolidadas dos 3 dias
          </p>
          <CountLineChart series={totalSeries} />
        </div>
      </article>
    </section>
  )
}

function MunicipioFilter({
  value,
  onChange,
  municipalities,
}: {
  value: string
  onChange: (v: string) => void
  municipalities: string[]
}) {
  return (
    <label className="flt">
      Município
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={ALL}>Bahia (todos)</option>
        {municipalities.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  )
}

type PulseSeries = {
  label: string
  color: string
  points: { x: string; pct: number; n: number; total: number }[]
}

/** Gráfico estilo “ECG”: nomes à esquerda, ponto e valor abaixo — pronto para mais pontos no tempo. */
function PulseLineChart({ series, height = 300 }: { series: PulseSeries[]; height?: number }) {
  const pad = { top: 22, right: 44, bottom: 44, left: 158 }
  const width = 720
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const xs = series[0]?.points.map((p) => p.x) ?? ['Acumulado']
  const maxY = Math.max(10, ...series.flatMap((s) => s.points.map((p) => p.pct)))
  const yMax = Math.min(100, Math.ceil(maxY / 10) * 10 || 10)

  const xPos = (i: number) => {
    if (xs.length <= 1) return pad.left + innerW * 0.62
    return pad.left + (i / (xs.length - 1)) * innerW
  }
  const yPos = (pct: number) => pad.top + innerH - (pct / yMax) * innerH
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax)

  // Empurra levemente labels muito próximos para não sobrepor.
  const labelY = useMemo(() => {
    const ranked = [...series]
      .map((s) => ({
        label: s.label,
        y: yPos(s.points[s.points.length - 1]?.pct ?? 0),
      }))
      .sort((a, b) => a.y - b.y)
    const minGap = 16
    for (let i = 1; i < ranked.length; i++) {
      if (ranked[i].y - ranked[i - 1].y < minGap) {
        ranked[i].y = ranked[i - 1].y + minGap
      }
    }
    return new Map(ranked.map((r) => [r.label, r.y]))
  }, [series, yMax, height])

  return (
    <div className="line-chart-wrap pulse-chart-wrap">
      <svg
        className="line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Gráfico de temporalidade"
      >
        {gridYs.map((g) => (
          <g key={g}>
            <line
              x1={pad.left}
              x2={pad.left + innerW}
              y1={yPos(g)}
              y2={yPos(g)}
              className="line-grid"
            />
            <text
              x={pad.left + innerW + 8}
              y={yPos(g) + 3}
              className="line-axis"
              textAnchor="start"
            >
              {g}%
            </text>
          </g>
        ))}

        {xs.map((label, i) => (
          <text key={label} x={xPos(i)} y={height - 12} className="line-axis" textAnchor="middle">
            {label}
          </text>
        ))}

        {series.map((s) => {
          const d = s.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(p.pct)}`)
            .join(' ')
          const last = s.points[s.points.length - 1]
          const cy = yPos(last?.pct ?? 0)
          const lx = xPos(s.points.length - 1)
          const nameY = labelY.get(s.label) ?? cy

          return (
            <g key={s.label}>
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth="2.75"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.9"
              />
              <line
                x1={pad.left}
                x2={lx}
                y1={cy}
                y2={cy}
                stroke={s.color}
                strokeWidth="1.25"
                strokeDasharray="3 4"
                opacity="0.35"
              />
              <text
                x={pad.left - 10}
                y={nameY + 4}
                className="pulse-name"
                textAnchor="end"
                fill={s.color}
              >
                <title>{s.label}</title>
                {truncateLabel(s.label, 24)}
              </text>
              {s.points.map((p, i) => (
                <g key={`${s.label}-${p.x}`}>
                  <circle
                    cx={xPos(i)}
                    cy={yPos(p.pct)}
                    r="6.5"
                    fill={s.color}
                    stroke="#fff"
                    strokeWidth="2.25"
                  >
                    <title>
                      {s.label}: {formatPctNum(p.pct)} ({formatN(p.n)})
                    </title>
                  </circle>
                  <text
                    x={xPos(i)}
                    y={yPos(p.pct) + 22}
                    className="line-point-value"
                    textAnchor="middle"
                    fill={s.color}
                  >
                    {formatPctNum(p.pct)}
                  </text>
                </g>
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function truncateLabel(label: string, max: number): string {
  if (label.length <= max) return label
  return `${label.slice(0, max - 1)}…`
}

type CountSeries = {
  label: string
  color: string
  points: { x: string; value: number }[]
}

function CountLineChart({ series, height = 240 }: { series: CountSeries[]; height?: number }) {
  const pad = { top: 20, right: 16, bottom: 44, left: 52 }
  const width = 720
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const xs = series[0]?.points.map((p) => p.x) ?? []
  const maxY = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.value)))
  const yMax = maxY <= 10 ? 10 : Math.ceil(maxY / 100) * 100

  const xPos = (i: number) => {
    if (xs.length <= 1) return pad.left + innerW / 2
    return pad.left + (i / (xs.length - 1)) * innerW
  }
  const yPos = (value: number) => pad.top + innerH - (value / yMax) * innerH
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax)

  return (
    <div className="line-chart-wrap">
      <svg
        className="line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Gráfico do total acumulado"
      >
        {gridYs.map((g) => (
          <g key={g}>
            <line
              x1={pad.left}
              x2={pad.left + innerW}
              y1={yPos(g)}
              y2={yPos(g)}
              className="line-grid"
            />
            <text x={pad.left - 8} y={yPos(g) + 3} className="line-axis" textAnchor="end">
              {formatN(Math.round(g))}
            </text>
          </g>
        ))}

        {xs.map((label, i) => (
          <text key={label} x={xPos(i)} y={height - 10} className="line-axis" textAnchor="middle">
            {label}
          </text>
        ))}

        {series.map((s) => {
          const d = s.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(p.value)}`)
            .join(' ')
          return (
            <g key={s.label}>
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth="3.25"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.points.map((p, i) => (
                <g key={`${s.label}-${p.x}`}>
                  <circle
                    cx={xPos(i)}
                    cy={yPos(p.value)}
                    r="6"
                    fill={s.color}
                    stroke="#fff"
                    strokeWidth="2"
                  >
                    <title>
                      {s.label}: {formatN(p.value)} entrevistas
                    </title>
                  </circle>
                  <text
                    x={xPos(i)}
                    y={yPos(p.value) + 22}
                    className="line-point-value"
                    textAnchor="middle"
                  >
                    {formatN(p.value)}
                  </text>
                </g>
              ))}
            </g>
          )
        })}
      </svg>
      <ul className="line-legend">
        {series.map((s) => (
          <li key={s.label}>
            <span className="line-swatch" style={{ background: s.color }} />
            {s.label}: {formatN(s.points[0]?.value ?? 0)}
          </li>
        ))}
      </ul>
    </div>
  )
}
