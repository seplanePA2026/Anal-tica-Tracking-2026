import { useMemo, useState } from 'react'
import { fieldHeading, RESEARCH_SECTIONS } from '../labels'
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
        {RESEARCH_SECTIONS.map((g) => (
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
  const active = selected ?? optionLabels.slice(0, 6)

  const series = useMemo(() => {
    const pick = selected ?? allSeries.slice(0, 6).map((s) => s.label)
    return allSeries.filter((s) => pick.includes(s.label))
  }, [allSeries, selected])

  function toggleOption(label: string) {
    const base = selected ?? optionLabels.slice(0, 6)
    if (base.includes(label)) {
      setSelected(base.filter((x) => x !== label))
    } else {
      setSelected([...base, label])
    }
  }

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
      </div>

      {optionLabels.length ? (
        <div className="temporal-opt-filters" role="group" aria-label="Opções de resposta">
          {optionLabels.map((label) => {
            const on = active.includes(label)
            return (
              <button
                key={label}
                type="button"
                className={`temporal-opt-chip${on ? ' on' : ''}`}
                style={on ? { borderColor: colorFor(label), color: colorFor(label) } : undefined}
                onClick={() => toggleOption(label)}
              >
                <span
                  className="temporal-opt-dot"
                  style={{ background: on ? colorFor(label) : '#c5bfd4' }}
                />
                {label}
              </button>
            )
          })}
        </div>
      ) : null}

      <p className="temporal-n temporal-n-card">
        {formatN(scoped.length)} entrevistas · {points.length}{' '}
        {points.length === 1 ? 'ponto' : 'pontos'}
      </p>

      {scoped.length && series.length ? (
        <LineChart series={series} height={200} />
      ) : (
        <p className="empty-filter">
          {scoped.length
            ? 'Selecione ao menos uma opção de resposta.'
            : 'Sem entrevistas neste recorte.'}
        </p>
      )}
    </article>
  )
}
