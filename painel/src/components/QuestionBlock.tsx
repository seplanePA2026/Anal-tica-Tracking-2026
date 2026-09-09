import { useMemo } from 'react'
import { fieldHeading } from '../labels'
import {
  answeredRows,
  colorFor,
  countBy,
  formatN,
  formatPctNum,
  hasEmptyAnswers,
  meanScore,
} from '../stats'
import type { Row } from '../types'
import { CrossTabPanel } from './CrossTabPanel'

type Props = {
  fieldKey: string
  rows: Row[]
}

const SKIP_NOTE = '(SOMENTE PARA QUEM DECLAROU INTENÇÃO DE VOTO)'

export function QuestionBlock({ fieldKey, rows }: Props) {
  const skipPattern = useMemo(
    () => hasEmptyAnswers(rows, fieldKey),
    [rows, fieldKey],
  )
  const dist = useMemo(
    () => countBy(rows, fieldKey, { excludeEmpty: skipPattern }),
    [rows, fieldKey, skipPattern],
  )
  const crossRows = useMemo(
    () => (skipPattern ? answeredRows(rows, fieldKey) : rows),
    [rows, fieldKey, skipPattern],
  )
  const maxN = dist.rows.reduce((m, r) => Math.max(m, r.n), 0) || 1
  const score = fieldKey === 'nota Jerônimo' ? meanScore(rows, fieldKey) : null

  return (
    <section className="q-block" id={`q-${slug(fieldKey)}`}>
      <header className="q-head">
        <h3>
          {fieldHeading(fieldKey)}
          {skipPattern ? <span className="q-skip-note"> {SKIP_NOTE}</span> : null}
        </h3>
      </header>

      {score && score.n > 0 ? (
        <p className="score-line">
          Média das notas numéricas 0–10:{' '}
          <strong>
            {score.mean?.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </strong>{' '}
          ({formatN(score.n)} notas; {formatN(score.skipped)} sem nota numérica)
        </p>
      ) : null}

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

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Resposta</th>
              <th className="num">N</th>
              <th className="num">%</th>
            </tr>
          </thead>
          <tbody>
            {dist.rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td className="num">{formatN(r.n)}</td>
                <td className="num">{formatPctNum(r.pct)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>Total</th>
              <th className="num">{formatN(dist.total)}</th>
              <th className="num">{dist.total ? '100,0%' : '—'}</th>
            </tr>
          </tfoot>
        </table>
      </div>

      <CrossTabPanel fieldKey={fieldKey} rows={crossRows} />
    </section>
  )
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
}
