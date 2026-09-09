import { useMemo, useState } from 'react'
import { fieldHeading, TEMPORAL_SECTIONS, TEMPORAL_SEQUENCE } from '../labels'
import { colorFor, countBy, formatN, formatPctNum } from '../stats'
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
  const allSeries = useMemo(
    () => questionEvolution(points, fieldKey, colorFor),
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

  return (
    <article className="temporal-mini">
      <h4 className="temporal-mini-title">{fieldHeading(fieldKey)}</h4>

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

        {optionLabels.length ? (
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
                    onClick={() => toggleOption(label)}
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
        ) : null}
      </div>

      <p className="temporal-n temporal-n-card">
        {formatN(scoped.length)} entrevistas · {points.length}{' '}
        {points.length === 1 ? 'ponto' : 'pontos'}
      </p>

      {scoped.length && series.length ? (
        <LineChart series={series} height={200} />
      ) : (
        <p className="empty-filter">
          {scoped.length
            ? 'Selecione duas opções de resposta para comparar.'
            : 'Sem entrevistas neste recorte.'}
        </p>
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

  return (
    <section className="temporal-group temporal-acumulado">
      <h3>Acumulado da pesquisa</h3>
      <p className="temporal-acumulado-lede">
        Resultado único dos três dias de campo (06.09, 07.09 e 08.09), sem separar
        por dia.
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
        {formatN(scoped.length)} entrevistas no acumulado
        {municipio === ALL ? '' : ` · ${municipio}`}
      </p>

      {!scoped.length ? (
        <p className="empty-filter">Sem entrevistas neste recorte.</p>
      ) : (
        TEMPORAL_SEQUENCE.map((key) => (
          <AcumuladoBlock key={key} fieldKey={key} rows={scoped} />
        ))
      )}
    </section>
  )
}

function AcumuladoBlock({ fieldKey, rows }: { fieldKey: string; rows: Row[] }) {
  const dist = useMemo(() => countBy(rows, fieldKey), [rows, fieldKey])
  const maxN = dist.rows.reduce((m, r) => Math.max(m, r.n), 0) || 1

  return (
    <article className="temporal-mini temporal-acumulado-card">
      <h4 className="temporal-mini-title">{fieldHeading(fieldKey)}</h4>
      <div className="bars">
        {dist.rows.map((r) => (
          <div className="bar-row" key={r.label}>
            <div className="bar-label" title={r.label}>
              {r.label}
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(r.n / maxN) * 100}%`,
                  background: colorFor(r.label),
                }}
              />
            </div>
            <div className="bar-n">{formatN(r.n)}</div>
            <div className="bar-pct">{formatPctNum(r.pct)}</div>
          </div>
        ))}
      </div>
      <p className="temporal-n temporal-n-card">Total: {formatN(dist.total)}</p>
    </article>
  )
}
