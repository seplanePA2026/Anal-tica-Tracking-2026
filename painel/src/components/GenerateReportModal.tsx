import { useState } from 'react'
import { createPortal } from 'react-dom'
import { generateReportPdf } from '../pdf/generateReport'
import { formatN } from '../stats'
import { ALL, type Row } from '../types'

type Props = {
  municipalities: string[]
  defaultMunicipio: string
  allRows: Row[]
  /** Ex.: "Onda 1 · 06/09 · 07/09 · 08/09" ou "Folha 10/09" */
  scopeHint: string
  onClose: () => void
}

export function GenerateReportModal({
  municipalities,
  defaultMunicipio,
  allRows,
  scopeHint,
  onClose,
}: Props) {
  const [municipio, setMunicipio] = useState(
    defaultMunicipio === ALL ? ALL : defaultMunicipio,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const rows =
    municipio === ALL
      ? allRows
      : allRows.filter((r) => r['Municípios'] === municipio)
  const scope =
    municipio === ALL
      ? `Pesquisa completa — Bahia · ${scopeHint}`
      : `${municipio} · ${scopeHint}`

  const generate = async () => {
    if (!rows.length) {
      setError('Não há entrevistas neste município.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await generateReportPdf(rows, scope)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gerar o PDF.')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="pdf-overlay" role="presentation" onClick={onClose}>
      <div
        className="pdf-card"
        role="dialog"
        aria-labelledby="pdf-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="pdf-title">Gerar relatório</h2>
        <p className="login-lead">
          O PDF inclui todos os campos da pesquisa deste recorte, com gráficos e
          tabelas.
        </p>
        <div className="pdf-window-chip">
          <span className="pdf-window-chip-label">Recorte</span>
          <strong>{scopeHint}</strong>
          <em>{formatN(allRows.length)} entrevistas na base deste relatório</em>
        </div>
        <label className="flt pdf-field">
          Município
          <select
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
            disabled={busy}
          >
            <option value={ALL}>Pesquisa completa — Bahia</option>
            {municipalities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <p className="pdf-n">{formatN(rows.length)} entrevistas neste recorte</p>
        {error ? <p className="pdf-error">{error}</p> : null}
        <div className="pdf-actions">
          <button type="button" className="pdf-cancel" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="login-submit pdf-go"
            onClick={() => void generate()}
            disabled={busy || !rows.length}
          >
            {busy ? 'Gerando…' : 'Gerar PDF'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
