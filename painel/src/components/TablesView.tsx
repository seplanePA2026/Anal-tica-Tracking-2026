import { fieldColumn, fieldHeading, QUESTION_SEQUENCE } from '../labels'
import { formatN } from '../stats'
import type { Dataset, Row } from '../types'

type Props = {
  data: Dataset
  rows: Row[]
  scopeLabel: string
}

const LEAD_COLS = ['Municípios', 'folha', 'dia'] as const

export function TablesView({ rows, scopeLabel }: Props) {
  const columns = [...LEAD_COLS, ...QUESTION_SEQUENCE]

  if (!rows.length) {
    return (
      <p className="empty-filter">
        Nenhum entrevistado permanece com o município selecionado.
      </p>
    )
  }

  return (
    <div className="tables-view">
      <header className="report-hero">
        <p className="kicker">Tabelas</p>
        <h2>{scopeLabel}</h2>
        <p className="lede">
          {formatN(rows.length)} entrevistas. Cada linha é uma entrevista; cada
          coluna é uma pergunta do questionário. Use o filtro de município para
          ver a tabela completa de Salvador, Simões Filho e demais praças.
        </p>
      </header>
      <div className="excel-wrap">
        <table className="excel">
          <thead>
            <tr>
              <th className="excel-idx">#</th>
              {columns.map((key) => (
                <th key={key} title={fieldHeading(key)}>
                  {fieldColumn(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row['Municípios'] ?? ''}-${i}`}>
                <td className="excel-idx num">{i + 1}</td>
                {columns.map((key) => (
                  <td key={key} title={cellText(row[key])}>
                    {cellText(row[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function cellText(value: string | null | undefined): string {
  return value ?? ''
}
