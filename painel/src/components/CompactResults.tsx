import { QUESTION_SECTIONS } from '../labels'
import type { Row } from '../types'
import { KpiCards } from './KpiCards'
import { QuestionBlock } from './QuestionBlock'

type Props = {
  rows: Row[]
  scopeLabel: string
  onOpenFull: () => void
}

export function CompactResults({ rows, scopeLabel, onOpenFull }: Props) {
  if (!rows.length) {
    return (
      <p className="empty-filter">
        Nenhum entrevistado permanece com os filtros atuais.
      </p>
    )
  }

  return (
    <div className="report compact">
      <header className="report-hero">
        <p className="kicker">Resultado do recorte</p>
        <h2>{scopeLabel}</h2>
        <button type="button" className="open-full" onClick={onOpenFull}>
          Ver relatório completo deste recorte
        </button>
      </header>
      <KpiCards rows={rows} />
      <nav className="toc">
        {QUESTION_SECTIONS.map((g) => (
          <a key={g.id} href={`#lista-${g.id}`}>
            {g.title}
          </a>
        ))}
      </nav>
      {QUESTION_SECTIONS.map((g) => (
        <section key={g.id} id={`lista-${g.id}`} className="group">
          <h2>{g.title}</h2>
          {g.keys.map((key) => (
            <QuestionBlock key={key} fieldKey={key} rows={rows} />
          ))}
        </section>
      ))}
    </div>
  )
}
