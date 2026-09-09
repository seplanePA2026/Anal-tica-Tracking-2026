import { useMemo, useState } from 'react'
import { fieldHeading, RESEARCH_SECTIONS, RESEARCH_SEQUENCE } from '../labels'
import { colorFor, formatN } from '../stats'
import { RESEARCH_WAVES, questionEvolution, temporalPoints } from '../temporal'
import { ALL, type Row } from '../types'
import { LineChart } from './LineChart'

type Props = {
  rows: Row[]
  municipalities: string[]
  municipio: string
  onMunicipio: (v: string) => void
}

export function TemporalidadeView({
  rows,
  municipalities,
  municipio,
  onMunicipio,
}: Props) {
  const [question, setQuestion] = useState(RESEARCH_SEQUENCE[0] ?? '')
  const wave = RESEARCH_WAVES[0]
  const scoped = useMemo(() => {
    if (municipio === ALL) return rows
    return rows.filter((r) => r['Municípios'] === municipio)
  }, [rows, municipio])

  const points = useMemo(() => temporalPoints(scoped), [scoped])
  const series = useMemo(
    () => (question ? questionEvolution(points, question, colorFor) : []),
    [points, question],
  )

  const topSeries = series.slice(0, 8)

  return (
    <div className="temporal-page">
      <header className="report-hero">
        <p className="kicker">Temporalidade</p>
        <h2>{wave?.label ?? 'Evolução'}</h2>
      </header>

      <div className="temporal-filters">
        <label className="flt">
          Município
          <select value={municipio} onChange={(e) => onMunicipio(e.target.value)}>
            <option value={ALL}>Bahia (todos)</option>
            {municipalities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flt temporal-q">
          Pergunta
          <select value={question} onChange={(e) => setQuestion(e.target.value)}>
            {RESEARCH_SECTIONS.map((g) => (
              <optgroup key={g.id} label={g.title}>
                {g.keys.map((key) => (
                  <option key={key} value={key}>
                    {fieldHeading(key)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      <p className="temporal-n">
        {formatN(scoped.length)} entrevistas no recorte · {points.length}{' '}
        {points.length === 1 ? 'ponto' : 'pontos'} no tempo
      </p>

      <section className="temporal-card">
        <h3>{fieldHeading(question)}</h3>
        {scoped.length && topSeries.length ? (
          <LineChart series={topSeries} />
        ) : (
          <p className="empty-filter">Sem entrevistas neste recorte.</p>
        )}
      </section>

      <div className="temporal-grid">
        {RESEARCH_SECTIONS.map((g) => (
          <section key={g.id} className="temporal-group">
            <h3>{g.title}</h3>
            {g.keys.map((key) => {
              const s = questionEvolution(points, key, colorFor).slice(0, 6)
              return (
                <article key={key} className="temporal-mini">
                  <button
                    type="button"
                    className={`temporal-mini-title${question === key ? ' on' : ''}`}
                    onClick={() => setQuestion(key)}
                  >
                    {fieldHeading(key)}
                  </button>
                  {scoped.length ? (
                    <LineChart series={s} height={200} />
                  ) : null}
                </article>
              )
            })}
          </section>
        ))}
      </div>
    </div>
  )
}
