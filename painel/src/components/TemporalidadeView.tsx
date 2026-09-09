import { useMemo, useState } from 'react'
import { formatN } from '../stats'
import { RESEARCH_WAVES } from '../temporal'
import { ALL, type Row } from '../types'
import { IntencaoRejeicaoPanel } from './IntencaoRejeicaoPanel'

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

      <IntencaoRejeicaoPanel rows={rows} municipalities={municipalities} />

      <TemporalAcumulado rows={rows} municipalities={municipalities} />
    </div>
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
