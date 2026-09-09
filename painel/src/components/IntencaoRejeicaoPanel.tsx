import { useMemo, useState } from 'react'
import {
  candidateIntentionRejection,
  formatIRValue,
  INTENTION_REJECTION_RACES,
  type IntentionRejectionRace,
} from '../intencaoRejeicao'
import { formatN } from '../stats'
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

  return (
    <section className="temporal-group ir-panel">
      <h3>Intenção × rejeição por candidato</h3>
      <p className="temporal-acumulado-lede">
        Resultado unificado dos três dias de campo. Intenção em verde e rejeição em
        vermelho.
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
        {formatN(scoped.length)} entrevistas
        {municipio === ALL ? '' : ` · ${municipio}`}
      </p>

      {!scoped.length ? (
        <p className="empty-filter">Sem entrevistas neste recorte.</p>
      ) : (
        INTENTION_REJECTION_RACES.map((race) => (
          <RaceBlock key={race.id} race={race} rows={scoped} />
        ))
      )}
    </section>
  )
}

function RaceBlock({ race, rows }: { race: IntentionRejectionRace; rows: Row[] }) {
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
      {!race.rejectionKey ? (
        <p className="ir-race-note">
          Nesta pesquisa não há pergunta de rejeição para governador — só intenção
          estimulada.
        </p>
      ) : null}
      <div className="ir-grid">
        {cards.map((c) => (
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
          </article>
        ))}
      </div>
    </div>
  )
}
