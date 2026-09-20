import { useMemo, useState } from 'react'
import { fieldColumn, fieldHeading, isTableColumnKey, QUESTION_SEQUENCE } from '../labels'
import { exportTablesExcel, exportTablesPdf } from '../export/exportTables'
import { formatN } from '../stats'
import { ALL } from '../types'
import type { Row } from '../types'

type Props = {
  /** Entrevistas já filtradas por município (todas as folhas). */
  rows: Row[]
  scopeLabel: string
  /** ALL = janela tracking; senão folha isolada (ex.: 06.09). */
  folha: string
  trackingFolhas: string[]
}

const LEAD_COLS = ['Municípios', 'folha', 'dia'] as const

function dayLabel(folha: string): string {
  return folha.replace(/\./g, '/')
}

export function TablesView({
  rows,
  scopeLabel,
  folha,
  trackingFolhas,
}: Props) {
  const questionKeys = QUESTION_SEQUENCE.filter(isTableColumnKey)
  const columns = [...LEAD_COLS, ...questionKeys].filter(isTableColumnKey)
  const [busy, setBusy] = useState<'excel' | 'pdf' | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const trackingSet = useMemo(() => new Set(trackingFolhas), [trackingFolhas])

  const filteredRows = useMemo(() => {
    if (folha === ALL) {
      if (!trackingSet.size) return rows
      return rows.filter((r) => r.folha != null && trackingSet.has(r.folha))
    }
    return rows.filter((r) => r.folha === folha)
  }, [rows, folha, trackingSet])

  const tableScopeLabel = useMemo(() => {
    if (folha === ALL) {
      const days = trackingFolhas.map(dayLabel).join(' · ')
      return days ? `${scopeLabel} · tracking ${days}` : scopeLabel
    }
    return `${scopeLabel} · folha ${dayLabel(folha)}`
  }, [scopeLabel, folha, trackingFolhas])

  async function onExportExcel() {
    setError(null)
    setProgress(null)
    setBusy('excel')
    try {
      await exportTablesExcel(filteredRows, questionKeys, tableScopeLabel)
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
      await new Promise((r) => window.setTimeout(r, 30))
      await exportTablesPdf(filteredRows, questionKeys, tableScopeLabel, setProgress)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao exportar PDF.')
    } finally {
      setBusy(null)
      setProgress(null)
    }
  }

  return (
    <div className="tables-view">
      <header className="report-hero tables-hero">
        <div className="tables-hero-text">
          <p className="kicker">Tabelas</p>
          <h2>{tableScopeLabel}</h2>
          <p className="lede">
            {formatN(filteredRows.length)} entrevistas. Use o filtro Dia de pesquisa
            ao lado de Município para ver e baixar a tabela de um dia específico.
          </p>
          {progress ? <p className="tables-export-progress">{progress}</p> : null}
          {error ? <p className="tables-export-error">{error}</p> : null}
        </div>
        <div className="tables-export">
          <button
            type="button"
            className="tables-export-btn"
            onClick={onExportExcel}
            disabled={busy != null || !filteredRows.length}
          >
            {busy === 'excel' ? 'Gerando Excel…' : 'Exportar Excel'}
          </button>
          <button
            type="button"
            className="tables-export-btn tables-export-btn-pdf"
            onClick={onExportPdf}
            disabled={busy != null || !filteredRows.length}
          >
            {busy === 'pdf' ? 'Gerando PDF…' : 'Exportar PDF'}
          </button>
        </div>
      </header>

      {!filteredRows.length ? (
        <p className="empty-filter">
          Nenhum entrevistado permanece com o município e o dia selecionados.
        </p>
      ) : (
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
              {filteredRows.map((row, i) => (
                <tr key={`${row.folha ?? ''}-${row['Municípios'] ?? ''}-${i}`}>
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
      )}
    </div>
  )
}

function cellText(value: string | null | undefined): string {
  return value ?? ''
}
