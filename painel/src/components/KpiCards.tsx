import { formatN, formatPctNum, leading, share } from '../stats'
import type { Row } from '../types'

type Props = {
  rows: Row[]
}

export function KpiCards({ rows }: Props) {
  const n = rows.length
  const fem = share(rows, 'sexo', 'Feminino')
  const masc = share(rows, 'sexo', 'Masculino')
  const pres = leading(rows, 'ESTIMULADA PRESIDENTE')
  const gov = leading(rows, 'ESTIMULADA GOVERNADOR')
  const apLula = share(rows, 'aprovação do gov Lula', 'Aprova')
  const apJero = share(rows, 'aprovação do gov Jerônimo', 'Aprova')

  return (
    <div className="kpi-grid">
      <article className="kpi">
        <p className="kpi-label">Entrevistas</p>
        <p className="kpi-value">{formatN(n)}</p>
        <p className="kpi-hint">neste recorte</p>
      </article>
      <article className="kpi">
        <p className="kpi-label">Sexo masculino</p>
        <p className="kpi-value">{formatPctNum(masc.pct)}</p>
        <p className="kpi-hint">{formatN(masc.n)} entrevistas</p>
      </article>
      <article className="kpi">
        <p className="kpi-label">Sexo feminino</p>
        <p className="kpi-value">{formatPctNum(fem.pct)}</p>
        <p className="kpi-hint">{formatN(fem.n)} entrevistas</p>
      </article>
      <article className="kpi">
        <p className="kpi-label">Maior índice presidente</p>
        <p className="kpi-value">{pres ? formatPctNum(pres.pct) : '—'}</p>
        <p className="kpi-hint">
          {pres ? `${pres.label} · ${formatN(pres.n)}` : 'sem respostas'}
        </p>
      </article>
      <article className="kpi">
        <p className="kpi-label">Maior índice governador</p>
        <p className="kpi-value">{gov ? formatPctNum(gov.pct) : '—'}</p>
        <p className="kpi-hint">
          {gov ? `${gov.label} · ${formatN(gov.n)}` : 'sem respostas'}
        </p>
      </article>
      <article className="kpi">
        <p className="kpi-label">Aprova governo Lula</p>
        <p className="kpi-value">{formatPctNum(apLula.pct)}</p>
        <p className="kpi-hint">{formatN(apLula.n)} entrevistas</p>
      </article>
      <article className="kpi">
        <p className="kpi-label">Aprova governo Jerônimo</p>
        <p className="kpi-value">{formatPctNum(apJero.pct)}</p>
        <p className="kpi-hint">{formatN(apJero.n)} entrevistas</p>
      </article>
    </div>
  )
}
