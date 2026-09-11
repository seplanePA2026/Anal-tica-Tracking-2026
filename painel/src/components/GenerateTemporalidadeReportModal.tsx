import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  candidateIntentionRejection,
  INTENTION_REJECTION_RACES,
} from '../intencaoRejeicao'
import {
  generateTemporalidadePdf,
  type TemporalidadePdfInclude,
} from '../pdf/generateTemporalidadeReport'
import { formatN } from '../stats'
import type { Row } from '../types'

type Props = {
  rows: Row[]
  municipalities: string[]
  onClose: () => void
}

type Catalog = { id: string; title: string; names: string[] }

function emptyInclude(): TemporalidadePdfInclude {
  return {
    acumulado: true,
    intencaoRejeicao: true,
    presidente: true,
    governador: true,
    senador: true,
  }
}

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

export function GenerateTemporalidadeReportModal({
  rows,
  municipalities,
  onClose,
}: Props) {
  const dayLabels = useMemo(() => {
    const folhas = [
      ...new Set(rows.map((r) => r.folha).filter(Boolean) as string[]),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
    return folhas.map((f) => f.replace(/\./g, '/'))
  }, [rows])

  const catalogs = useMemo<Catalog[]>(() => {
    return INTENTION_REJECTION_RACES.map((race) => ({
      id: race.id,
      title: race.title.replace(/^Intenção de voto /i, ''),
      names: candidateIntentionRejection(rows, race).map((c) => c.name),
    }))
  }, [rows])

  const [munSel, setMunSel] = useState<Set<string>>(
    () => new Set(municipalities),
  )
  const [candSel, setCandSel] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {}
    for (const race of INTENTION_REJECTION_RACES) {
      init[race.id] = new Set(
        candidateIntentionRejection(rows, race).map((c) => c.name),
      )
    }
    return init
  })
  const [include, setInclude] = useState<TemporalidadePdfInclude>(emptyInclude)
  const [munQuery, setMunQuery] = useState('')
  const [candQuery, setCandQuery] = useState('')
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

  const nCand = catalogs.reduce((s, c) => s + (candSel[c.id]?.size ?? 0), 0)
  const nCandTotal = catalogs.reduce((s, c) => s + c.names.length, 0)
  const sectionsOn = Object.values(include).filter(Boolean).length

  const generate = async () => {
    if (!munSel.size) {
      setError('Selecione ao menos um município.')
      return
    }
    if (!sectionsOn) {
      setError('Ligue ao menos uma seção do relatório.')
      return
    }
    if (
      !nCand &&
      (include.intencaoRejeicao ||
        include.presidente ||
        include.governador ||
        include.senador)
    ) {
      setError('Selecione ao menos um candidato, ou desligue as seções de cargo.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const candidatesByRace: Record<string, string[]> = {}
      for (const c of catalogs) {
        candidatesByRace[c.id] = c.names.filter((n) => candSel[c.id]?.has(n))
      }
      await generateTemporalidadePdf(rows, {
        municipalities: [...munSel].sort((a, b) => a.localeCompare(b, 'pt-BR')),
        allMunicipalities: allMuns,
        candidatesByRace,
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
            <p className="kicker">Construtor de PDF</p>
            <h2 id="tmp-pdf-title">Relatório de Temporalidade</h2>
            <div className="pdf-builder-pills">
              <span>{formatN(scoped.length)} entrevistas</span>
              <span>
                {dayLabels.length} {dayLabels.length === 1 ? 'dia' : 'dias'}
              </span>
              <span>
                {munSel.size}/{municipalities.length} mun.
              </span>
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
              <h3>1. Municípios</h3>
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
                        onChange={() =>
                          setMunSel((prev) => toggleInSet(prev, name))
                        }
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
              <h3>2. Candidatos</h3>
              <span className="pdf-builder-count">
                {nCand}/{nCandTotal}
              </span>
            </div>
            <div className="pdf-builder-toolbar">
              <input
                type="search"
                className="pdf-builder-search"
                placeholder="Buscar candidato"
                value={candQuery}
                onChange={(e) => setCandQuery(e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                className="pdf-chip-btn"
                disabled={busy}
                onClick={() => {
                  const next: Record<string, Set<string>> = {}
                  for (const c of catalogs) next[c.id] = new Set(c.names)
                  setCandSel(next)
                }}
              >
                Todos
              </button>
              <button
                type="button"
                className="pdf-chip-btn"
                disabled={busy}
                onClick={() => {
                  const next: Record<string, Set<string>> = {}
                  for (const c of catalogs) next[c.id] = new Set()
                  setCandSel(next)
                }}
              >
                Nenhum
              </button>
            </div>
            <div className="pdf-panel-scroll">
              {catalogs.map((cat) => {
                const q = candQuery.trim().toLowerCase()
                const names = q
                  ? cat.names.filter((n) => n.toLowerCase().includes(q))
                  : cat.names
                if (!names.length) return null
                const selected = candSel[cat.id] ?? new Set<string>()
                return (
                  <div key={cat.id} className="pdf-race-block">
                    <div className="pdf-race-head">
                      <h4>{cat.title}</h4>
                      <button
                        type="button"
                        className="pdf-chip-btn"
                        disabled={busy}
                        onClick={() =>
                          setCandSel((prev) => ({
                            ...prev,
                            [cat.id]:
                              selected.size === cat.names.length
                                ? new Set()
                                : new Set(cat.names),
                          }))
                        }
                      >
                        {selected.size === cat.names.length
                          ? 'Limpar cargo'
                          : 'Cargo todo'}
                      </button>
                    </div>
                    <div className="pdf-cand-chips">
                      {names.map((name) => {
                        const on = selected.has(name)
                        return (
                          <label
                            key={name}
                            className={`pdf-cand-chip${on ? ' on' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              disabled={busy}
                              onChange={() =>
                                setCandSel((prev) => ({
                                  ...prev,
                                  [cat.id]: toggleInSet(
                                    prev[cat.id] ?? new Set(),
                                    name,
                                  ),
                                }))
                              }
                            />
                            {name}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="pdf-panel">
            <div className="pdf-panel-head">
              <h3>3. Seções do PDF</h3>
              <span className="pdf-builder-count">{sectionsOn}/5</span>
            </div>
            <div className="pdf-panel-scroll pdf-section-grid">
              {(
                [
                  ['acumulado', 'Acumulado da pesquisa'],
                  ['intencaoRejeicao', 'Intenção × rejeição'],
                  ['presidente', 'Acumulado presidente'],
                  ['governador', 'Acumulado governador'],
                  ['senador', 'Acumulado senador'],
                ] as const
              ).map(([key, title]) => (
                <label
                  key={key}
                  className={`pdf-section-card${include[key] ? ' on' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={include[key]}
                    disabled={busy}
                    onChange={() =>
                      setInclude((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                  />
                  <span>
                    <strong>{title}</strong>
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
              <strong>{nCand} candidatos</strong> · {sectionsOn} seções
            </p>
            {error ? <p className="pdf-error">{error}</p> : null}
          </div>
          <div className="pdf-actions">
            <button
              type="button"
              className="pdf-cancel"
              onClick={onClose}
              disabled={busy}
            >
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
