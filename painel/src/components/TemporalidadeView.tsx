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
          <p className="temporal-total-label">
            {municipio === ALL ? 'Total da pesquisa' : `Total em ${municipio}`}
          </p>
          <p className="temporal-total-value">{formatN(scoped.length)}</p>
          <p className="temporal-n temporal-n-card">
            entrevistas consolidadas dos 3 dias
          </p>
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
