import { useState } from 'react'
import { fieldColumn, fieldHeading, QUESTION_SEQUENCE } from '../labels'
import { exportTablesExcel, exportTablesPdf } from '../export/exportTables'
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
  const [busy, setBusy] = useState<'excel' | 'pdf' | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onExportExcel() {
    setError(null)
    setProgress(null)
    setBusy('excel')
    try {
      await exportTablesExcel(rows, QUESTION_SEQUENCE, scopeLabel)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao exportar Excel.')
    } finally {
      setBusy(null)
      setProgress(null)
    }
  }

  async function onExportPdf() {
    setError(null)
    setBusy('pdf')
    setProgress('Preparando PDF…')
    try {
      // Libera o clique atual antes do trabalho pesado.
      await new Promise((r) => window.setTimeout(r, 30))
      await exportTablesPdf(rows, QUESTION_SEQUENCE, scopeLabel, setProgress)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao exportar PDF.')
    } finally {
      setBusy(null)
      setProgress(null)
    }
  }

  if (!rows.length) {
    return (
      <p className="empty-filter">
        Nenhum entrevistado permanece com o município selecionado.
      </p>
    )
  }

  return (
    <div className="tables-view">
      <header className="report-hero tables-hero">
        <div className="tables-hero-text">
          <p className="kicker">Tabelas</p>
          <h2>{scopeLabel}</h2>
          <p className="lede">
            {formatN(rows.length)} entrevistas. Cada linha é uma entrevista; cada
            coluna é uma pergunta do questionário. Use o filtro de município para
            ver a tabela completa de Salvador, Simões Filho e demais praças.
          </p>
          {progress ? <p className="tables-export-progress">{progress}</p> : null}
          {error ? <p className="tables-export-error">{error}</p> : null}
        </div>
        <div className="tables-export">
          <button
            type="button"
            className="tables-export-btn"
            onClick={onExportExcel}
            disabled={busy != null}
          >
            {busy === 'excel' ? 'Gerando Excel…' : 'Exportar Excel'}
          </button>
          <button
            type="button"
            className="tables-export-btn tables-export-btn-pdf"
            onClick={onExportPdf}
            disabled={busy != null}
          >
            {busy === 'pdf' ? 'Gerando PDF…' : 'Exportar PDF'}
          </button>
        </div>
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
