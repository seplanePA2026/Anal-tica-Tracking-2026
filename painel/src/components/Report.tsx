import { QUESTION_SECTIONS } from '../labels'
import { formatN } from '../stats'
import type { ResearchOnda } from '../ondas'
import type { Row } from '../types'
import { ALL } from '../types'
import { KpiCards } from './KpiCards'
import { QuestionBlock } from './QuestionBlock'

type Props = {
  rows: Row[]
  scopeLabel: string
  sheets: string[]
  nPorFolha: Record<string, number>
  ondas: ResearchOnda[]
  folha: string
  onda: string
  onSelectFolha: (folha: string) => void
  onSelectOnda: (onda: string) => void
  onGeneratePdf: () => void
}

function dayLabel(folha: string): string {
  return folha.replace(/\./g, '/')
}

export function Report({
  rows,
  scopeLabel,
  sheets,
  nPorFolha,
  ondas,
  folha,
  onda,
  onSelectFolha,
  onSelectOnda,
  onGeneratePdf,
}: Props) {
  return (
    <div className="report">
      <header className="report-hero report-hero-actions">
        <div className="report-hero-text">
          <p className="kicker">Relatório do recorte</p>
          <h2>{scopeLabel}</h2>
          <p className="lede report-scope-lede">
            {formatN(rows.length)} entrevistas neste recorte. Escolha o dia ou a
            onda e gere o PDF.
          </p>
        </div>
        <button
          type="button"
          className="tables-export-btn tables-export-btn-pdf report-pdf-btn"
          onClick={onGeneratePdf}
          disabled={!rows.length}
        >
          Gerar relatório
        </button>
      </header>

      <section className="report-scope-filters" aria-label="Recorte do relatório">
        <div className="report-scope-block">
          <div className="report-scope-block-head">
            <h3>Dias de campo</h3>
            <p>Folha da pesquisa (igual à lista do desktop).</p>
          </div>
          <div className="report-scope-chips report-scope-chips-days" role="listbox" aria-label="Dias de campo">
            <button
              type="button"
              role="option"
              aria-selected={folha === ALL}
              className={`report-scope-chip${folha === ALL ? ' on' : ''}`}
              onClick={() => onSelectFolha(ALL)}
            >
              <strong>Todas</strong>
              <span>Onda ou tracking</span>
            </button>
            {sheets.map((sheet) => {
              const on = folha === sheet
              const n = nPorFolha[sheet] ?? 0
              return (
                <button
                  key={sheet}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`report-scope-chip${on ? ' on' : ''}`}
                  onClick={() => onSelectFolha(on ? ALL : sheet)}
                >
                  <strong>Folha {dayLabel(sheet)}</strong>
                  <span>{formatN(n)}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="report-scope-block">
          <div className="report-scope-block-head">
            <h3>Ondas</h3>
            <p>Acumulado de dias: Onda 1 (6–8), Onda 2 (9–11), Onda 3 (12–14), Onda 4 (15–17), Onda 5 (18–20) e Onda 6 (21–22).</p>
          </div>
          <div className="report-scope-chips report-scope-chips-ondas" role="listbox" aria-label="Ondas">
            <button
              type="button"
              role="option"
              aria-selected={onda === ALL && folha === ALL}
              className={`report-scope-chip${
                onda === ALL && folha === ALL ? ' on' : ''
              }`}
              onClick={() => onSelectOnda(ALL)}
            >
              <strong>Janela tracking</strong>
              <span>Últimos 3 dias</span>
            </button>
            {ondas.map((o) => {
              const on = folha === ALL && onda === o.id
              const n = o.folhas.reduce((s, f) => s + (nPorFolha[f] ?? 0), 0)
              return (
                <button
                  key={o.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`report-scope-chip${on ? ' on' : ''}`}
                  onClick={() => onSelectOnda(on ? ALL : o.id)}
                >
                  <strong>{o.label}</strong>
                  <span>
                    {o.daysLabel} · {formatN(n)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {!rows.length ? (
        <p className="empty-filter">
          Nenhum entrevistado permanece com os filtros atuais. Os totais da
          planilha não foram alterados — apenas o recorte está vazio.
        </p>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
