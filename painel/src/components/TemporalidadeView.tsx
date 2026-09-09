import { useMemo, useState } from 'react'
import { fieldHeading, TEMPORAL_SECTIONS } from '../labels'
import { colorFor, formatN, formatPctNum } from '../stats'
import { RESEARCH_WAVES, questionEvolution, temporalPoints } from '../temporal'
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

  const points = useMemo(() => temporalPoints(scoped), [scoped])

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
        {formatN(scoped.length)} entrevistas · {points.length}{' '}
        {points.length === 1 ? 'dia' : 'dias'}
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

/** Gráfico estilo “ECG” em faixas: evolução dia a dia (6, 7 e 8) por candidato. */
function PulseLineChart({ series }: { series: PulseSeries[] }) {
  const ranked = useMemo(
    () =>
      [...series].sort((a, b) => {
        const na = a.points.reduce((s, p) => s + p.n, 0)
        const nb = b.points.reduce((s, p) => s + p.n, 0)
        return nb - na || a.label.localeCompare(b.label, 'pt-BR')
      }),
    [series],
  )

  const rowH = 84
  const pad = { top: 16, right: 28, bottom: 32, left: 150 }
  const width = 720
  const height = pad.top + pad.bottom + Math.max(1, ranked.length) * rowH
  const xs = ranked[0]?.points.map((p) => p.x) ?? []
  const globalMax = Math.max(
    1,
    ...ranked.flatMap((s) => s.points.map((p) => p.pct)),
  )

  // Ocupa toda a largura útil do card (do nome até a borda direita).
  const xStart = pad.left + 18
  const xEnd = width - pad.right
  const xPos = (i: number) => {
    if (xs.length <= 1) return (xStart + xEnd) / 2
    return xStart + (i / (xs.length - 1)) * (xEnd - xStart)
  }

  const yInRow = (row: number, pct: number) => {
    const top = pad.top + row * rowH + 8
    const band = rowH - 42
    // Escala absoluta: 5% e 6% ficam vizinhos; 50% fica bem acima.
    return top + band - (pct / globalMax) * band
  }

  const nameY = (row: number) => pad.top + row * rowH + rowH / 2 - 8

  return (
    <div className="line-chart-wrap pulse-chart-wrap">
      <svg
        className="line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Gráfico de temporalidade por dia"
      >
        {ranked.map((s, row) => {
          const d = s.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yInRow(row, p.pct)}`)
            .join(' ')
          const baseline = pad.top + row * rowH + rowH - 2

          return (
            <g key={s.label}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={baseline}
                y2={baseline}
                className="pulse-lane"
              />
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinejoin="miter"
                strokeLinecap="butt"
                strokeMiterlimit={10}
              />
              <text
                x={pad.left - 10}
                y={nameY(row)}
                className="pulse-name"
                textAnchor="end"
                fill={s.color}
              >
                <title>{s.label}</title>
                {truncateLabel(s.label, 26)}
              </text>
              {s.points.map((p, i) => {
                const cy = yInRow(row, p.pct)
                const cx = xPos(i)
                return (
                  <g key={`${s.label}-${p.x}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r="5.5"
                      fill={s.color}
                      stroke="#fff"
                      strokeWidth="2"
                    >
                      <title>
                        {s.label} · {dayLabel(p.x)}: {formatN(p.n)} ·{' '}
                        {formatPctNum(p.pct)}
                      </title>
                    </circle>
                    <text
                      x={cx}
                      y={cy + 15}
                      className="line-point-value"
                      textAnchor="middle"
                      fill={s.color}
                    >
                      {formatN(p.n)}
                    </text>
                    <text
                      x={cx}
                      y={cy + 26}
                      className="line-point-pct"
                      textAnchor="middle"
                      fill={s.color}
                    >
                      {formatPctNum(p.pct)}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}

        {xs.map((label, i) => (
          <text
            key={label}
            x={xPos(i)}
            y={height - 10}
            className="line-axis"
            textAnchor="middle"
          >
            {dayLabel(label)}
          </text>
        ))}
      </svg>
    </div>
  )
}

function dayLabel(label: string): string {
  const m = label.match(/^0?(\d{1,2})\.(\d{2})$/)
  if (m) return `${Number(m[1])}/${m[2]}`
  return label
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
