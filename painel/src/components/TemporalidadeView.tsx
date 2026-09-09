import { useMemo, useState } from 'react'
import { fieldHeading, TEMPORAL_SECTIONS } from '../labels'
import { colorFor, formatN } from '../stats'
import { RESEARCH_WAVES, questionEvolution, temporalPoints } from '../temporal'
import { ALL, type Row } from '../types'
import { LineChart } from './LineChart'

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
  const [selected, setSelected] = useState<string[] | null>(null)

  const scoped = useMemo(() => {
    if (municipio === ALL) return rows
    return rows.filter((r) => r['Municípios'] === municipio)
  }, [rows, municipio])

  const points = useMemo(() => temporalPoints(scoped), [scoped])
  const chart = useCompareChart(points, fieldKey, selected, setSelected)

  return (
    <article className="temporal-mini">
      <h4 className="temporal-mini-title">{fieldHeading(fieldKey)}</h4>

      <div className="temporal-card-filters">
        <MunicipioFilter
          value={municipio}
          onChange={setMunicipio}
          municipalities={municipalities}
        />
        <CompareFilter
          optionLabels={chart.optionLabels}
          pick={chart.pick}
          summaryLabel={chart.summaryLabel}
          onToggle={chart.toggleOption}
        />
      </div>

      <p className="temporal-n temporal-n-card">
        {formatN(scoped.length)} entrevistas · {points.length}{' '}
        {points.length === 1 ? 'ponto' : 'pontos'}
      </p>

      <ChartBody scopedLen={scoped.length} series={chart.series} />
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

function useCompareChart(
  points: { id: string; label: string; rows: Row[] }[],
  fieldKey: string,
  selected: string[] | null,
  setSelected: (v: string[] | null | ((prev: string[] | null) => string[] | null)) => void,
) {
  const allSeries = useMemo(
    () => (fieldKey ? questionEvolution(points, fieldKey, colorFor) : []),
    [points, fieldKey],
  )
  const optionLabels = useMemo(() => allSeries.map((s) => s.label), [allSeries])

  const pick = useMemo(() => {
    const defaults = optionLabels.slice(0, 2)
    if (!selected) return defaults
    const valid = selected.filter((l) => optionLabels.includes(l))
    if (valid.length >= 2) return valid.slice(0, 2)
    if (valid.length === 1) {
      const fill = defaults.find((l) => l !== valid[0])
      return fill ? [valid[0], fill] : valid
    }
    return defaults
  }, [selected, optionLabels])

  const series = useMemo(
    () =>
      pick
        .map((label) => allSeries.find((s) => s.label === label))
        .filter((s): s is NonNullable<typeof s> => Boolean(s)),
    [allSeries, pick],
  )

  function toggleOption(label: string) {
    setSelected((prev) => {
      const base = prev?.length
        ? prev.filter((l) => optionLabels.includes(l)).slice(0, 2)
        : optionLabels.slice(0, 2)
      if (base.includes(label)) {
        return base.filter((x) => x !== label)
      }
      if (base.length < 2) return [...base, label]
      return [base[1], label]
    })
  }

  const summaryLabel =
    pick.length === 2
      ? `${pick[0]} × ${pick[1]}`
      : pick[0] ?? 'Selecione 2 opções'

  return { optionLabels, pick, series, summaryLabel, toggleOption }
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

function CompareFilter({
  optionLabels,
  pick,
  summaryLabel,
  onToggle,
}: {
  optionLabels: string[]
  pick: string[]
  summaryLabel: string
  onToggle: (label: string) => void
}) {
  if (!optionLabels.length) return null
  return (
    <details className="flt temporal-opt-panel">
      <summary>
        Comparar
        <span className="temporal-opt-summary">{summaryLabel}</span>
      </summary>
      <div className="temporal-opt-list" role="group" aria-label="Opções de resposta">
        <p className="temporal-opt-hint">Selecione 2 opções para o gráfico</p>
        {optionLabels.map((label) => {
          const on = pick.includes(label)
          return (
            <button
              key={label}
              type="button"
              className={`temporal-opt-row${on ? ' on' : ''}`}
              onClick={() => onToggle(label)}
            >
              <span
                className="temporal-opt-dot"
                style={{ background: on ? colorFor(label) : '#c5bfd4' }}
              />
              <span className="temporal-opt-label">{label}</span>
              {on ? <span className="temporal-opt-check">✓</span> : null}
            </button>
          )
        })}
      </div>
    </details>
  )
}

function ChartBody({
  scopedLen,
  series,
  height = 200,
}: {
  scopedLen: number
  series: { label: string; color: string; points: { x: string; pct: number }[] }[]
  height?: number
}) {
  if (scopedLen && series.length) {
    return <LineChart series={series} height={height} />
  }
  return (
    <p className="empty-filter">
      {scopedLen
        ? 'Selecione duas opções de resposta para comparar.'
        : 'Sem entrevistas neste recorte.'}
    </p>
  )
}

type CountSeries = {
  label: string
  color: string
  points: { x: string; value: number }[]
}

function CountLineChart({ series, height = 240 }: { series: CountSeries[]; height?: number }) {
  const pad = { top: 20, right: 16, bottom: 36, left: 52 }
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
                <circle
                  key={`${s.label}-${p.x}`}
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
