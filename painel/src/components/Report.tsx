import { QUESTION_SECTIONS } from '../labels'
import type { Row } from '../types'
import { KpiCards } from './KpiCards'
import { QuestionBlock } from './QuestionBlock'

type Props = {
  rows: Row[]
  scopeLabel: string
}

export function Report({ rows, scopeLabel }: Props) {
  if (!rows.length) {
    return (
      <p className="empty-filter">
        Nenhum entrevistado permanece com os filtros atuais. Os totais da planilha
        não foram alterados — apenas o recorte está vazio.
      </p>
    )
  }

  return (
    <div className="report">
      <header className="report-hero">
        <p className="kicker">Relatório do recorte</p>
        <h2>{scopeLabel}</h2>
      </header>

      <KpiCards rows={rows} />

      <nav className="toc">
        {QUESTION_SECTIONS.map((g) => (
          <a key={g.id} href={`#grp-${g.id}`}>
            {g.title}
          </a>
        ))}
      </nav>

      {QUESTION_SECTIONS.map((g) => (
        <section key={g.id} id={`grp-${g.id}`} className="group">
          <h2>{g.title}</h2>
          {g.keys.map((key) => (
            <QuestionBlock key={key} fieldKey={key} rows={rows} />
          ))}
        </section>
      ))}
    </div>
  )
}
