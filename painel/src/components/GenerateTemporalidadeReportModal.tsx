import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { isCandidateLabel } from '../intencaoRejeicao'
import {
  generateTemporalidadePdf,
  type TemporalidadePdfInclude,
} from '../pdf/generateTemporalidadeReport'
import { countBy, formatN } from '../stats'
import type { Row } from '../types'

type Props = {
  rows: Row[]
  municipalities: string[]
  onClose: () => void
}

const CARGOS: {
  id: keyof TemporalidadePdfInclude
  title: string
  field: string
  topN: number
}[] = [
  {
    id: 'presidente',
    title: 'Presidente',
    field: 'ESTIMULADA PRESIDENTE',
    topN: 5,
  },
  {
    id: 'governador',
    title: 'Governador',
    field: 'ESTIMULADA GOVERNADOR',
    topN: 3,
  },
  {
    id: 'senador',
    title: 'Senador',
    field: 'ESTIMULADA SENADOR 1ª OPÇÃO',
    topN: 6,
  },
]

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function topNames(rows: Row[], field: string, topN: number): string[] {
  return countBy(rows, field)
    .rows.filter((r) => isCandidateLabel(r.label))
    .slice(0, topN)
    .map((r) => r.label)
}

export function GenerateTemporalidadeReportModal({
  rows,
  municipalities,
  onClose,
}: Props) {
  const [munSel, setMunSel] = useState<Set<string>>(() => new Set(municipalities))
  const [include, setInclude] = useState<TemporalidadePdfInclude>({
    presidente: true,
    governador: true,
    senador: true,
  })
  const [munQuery, setMunQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const allMuns = munSel.size === municipalities.length && municipalities.length > 0
  const scoped = useMemo(() => {
    if (allMuns) return rows
    return rows.filter((r) => r['Municípios'] != null && munSel.has(r['Municípios']))
  }, [rows, allMuns, munSel])

  const preview = useMemo(
    () =>
      CARGOS.map((cargo) => ({
        ...cargo,
        names: topNames(scoped, cargo.field, cargo.topN),
      })),
    [scoped],
  )

  const munHits = useMemo(() => {
    const q = munQuery.trim().toLowerCase()
    if (!q) return municipalities
    return municipalities.filter((n) => n.toLowerCase().includes(q))
  }, [municipalities, munQuery])

  const nByMun = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) {
      const m = r['Municípios']
      if (!m) continue
      map.set(m, (map.get(m) ?? 0) + 1)
    }
    return map
  }, [rows])

  const sectionsOn = CARGOS.filter((c) => include[c.id]).length

  const generate = async () => {
    if (!munSel.size) {
      setError('Selecione ao menos um município.')
      return
    }
    if (!sectionsOn) {
      setError('Ligue ao menos um cargo.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await generateTemporalidadePdf(rows, {
        municipalities: [...munSel].sort((a, b) => a.localeCompare(b, 'pt-BR')),
        allMunicipalities: allMuns,
        include,
      })
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
        className="pdf-builder"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tmp-pdf-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pdf-builder-head">
          <div>
            <p className="kicker">Analítica</p>
            <h2 id="tmp-pdf-title">Relatório de Temporalidade</h2>
            <div className="pdf-builder-pills">
              <span>{formatN(scoped.length)} entrevistas</span>
              <span>Presidente, governador e senador</span>
            </div>
          </div>
          <button
            type="button"
            className="pdf-builder-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className="pdf-builder-stack">
          <section className="pdf-panel">
            <div className="pdf-panel-head">
              <h3>Municípios</h3>
              <span className="pdf-builder-count">
                {munSel.size}/{municipalities.length}
              </span>
            </div>
            <div className="pdf-builder-toolbar">
              <input
                type="search"
                className="pdf-builder-search"
                placeholder="Buscar município"
                value={munQuery}
                onChange={(e) => setMunQuery(e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                className="pdf-chip-btn"
                disabled={busy}
                onClick={() => setMunSel(new Set(municipalities))}
              >
                Todos
              </button>
              <button
                type="button"
                className="pdf-chip-btn"
                disabled={busy}
                onClick={() => setMunSel(new Set())}
              >
                Nenhum
              </button>
            </div>
            <ul className="pdf-panel-scroll pdf-check-list">
              {munHits.map((name) => {
                const n = nByMun.get(name) ?? 0
                const on = munSel.has(name)
                return (
                  <li key={name}>
                    <label className={`pdf-check${on ? ' on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={busy}
                        onChange={() => setMunSel((prev) => toggleInSet(prev, name))}
                      />
                      <span className="pdf-check-name">{name}</span>
                      <span className="pdf-check-n">{formatN(n)}</span>
                    </label>
                  </li>
                )
              })}
              {!munHits.length ? (
                <li className="pdf-builder-empty">Nenhum município com esse nome.</li>
              ) : null}
            </ul>
          </section>

          <section className="pdf-panel">
            <div className="pdf-panel-head">
              <h3>Cards do acumulado</h3>
              <span className="pdf-builder-count">{sectionsOn}/3</span>
            </div>
            <div className="pdf-panel-scroll pdf-section-grid">
              {preview.map((cargo) => (
                <label
                  key={cargo.id}
                  className={`pdf-section-card${include[cargo.id] ? ' on' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={include[cargo.id]}
                    disabled={busy}
                    onChange={() =>
                      setInclude((prev) => ({ ...prev, [cargo.id]: !prev[cargo.id] }))
                    }
                  />
                  <span>
                    <strong>
                      {cargo.title} · {cargo.topN} principais
                    </strong>
                    <span className="pdf-section-names">
                      {cargo.names.join(' · ') || 'Sem candidatos neste recorte'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <footer className="pdf-builder-foot">
          <div className="pdf-builder-summary">
            <p>
              <strong>{formatN(scoped.length)}</strong> entrevistas ·{' '}
              <strong>{allMuns ? 'Bahia' : `${munSel.size} municípios`}</strong> ·{' '}
              {sectionsOn} {sectionsOn === 1 ? 'cargo' : 'cargos'}
            </p>
            {error ? <p className="pdf-error">{error}</p> : null}
          </div>
          <div className="pdf-actions">
            <button type="button" className="pdf-cancel" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button
              type="button"
              className="login-submit pdf-go"
              onClick={() => void generate()}
              disabled={busy || !scoped.length}
            >
              {busy ? 'Gerando…' : 'Gerar PDF'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
