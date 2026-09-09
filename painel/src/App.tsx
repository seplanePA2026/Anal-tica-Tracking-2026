import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CompactResults } from './components/CompactResults'
import { GenerateReportModal } from './components/GenerateReportModal'
import { KpiCards } from './components/KpiCards'
import { MapView } from './components/MapView'
import { Report } from './components/Report'
import { TablesView } from './components/TablesView'
import { TemporalidadeView } from './components/TemporalidadeView'
import { UserMenu } from './components/UserMenu'
import {
  ALL,
  EMPTY,
  EMPTY_FILTERS,
  type Dataset,
  type Filters,
  type ViewId,
} from './types'
import {
  applyFilters,
  formatN,
  uniqueValues,
} from './stats'

export default function App() {
  const [data, setData] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewId>('mapa')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [visited, setVisited] = useState<Record<ViewId, boolean>>({
    mapa: true,
    lista: false,
    relatorio: false,
    tabela: false,
    temporalidade: false,
  })
  const stageRef = useRef<HTMLElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const temporalRef = useRef<HTMLDivElement>(null)
  const listSideRef = useRef<HTMLDivElement>(null)
  const mapSideRef = useRef<HTMLElement>(null)

  const goView = useCallback((id: ViewId) => {
    setView(id)
    startTransition(() => {
      setVisited((prev) => (prev[id] ? prev : { ...prev, [id]: true }))
    })
  }, [])

  useLayoutEffect(() => {
    setFiltersOpen(false)
    setListOpen(false)
    const html = document.documentElement
    const prev = html.style.scrollBehavior
    html.style.scrollBehavior = 'auto'
    window.scrollTo(0, 0)
    html.scrollTop = 0
    document.body.scrollTop = 0
    const stage = stageRef.current
    if (stage) {
      stage.scrollTop = 0
      stage.scrollLeft = 0
    }
    reportRef.current && (reportRef.current.scrollTop = 0)
    tableRef.current && (tableRef.current.scrollTop = 0)
    temporalRef.current && (temporalRef.current.scrollTop = 0)
    listSideRef.current && (listSideRef.current.scrollTop = 0)
    mapSideRef.current && (mapSideRef.current.scrollTop = 0)
    html.style.scrollBehavior = prev
  }, [view])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)')
    const hideLista = () => {
      if (mq.matches) {
        setView((v) => (v === 'lista' ? 'mapa' : v))
        setListOpen(false)
      }
    }
    hideLista()
    mq.addEventListener('change', hideLista)
    return () => mq.removeEventListener('change', hideLista)
  }, [])

  useEffect(() => {
    fetch('/data.json')
      .then((r) => {
        if (!r.ok) throw new Error(`Falha ao ler data.json (${r.status})`)
        return r.json()
      })
      .then((json: Dataset) => setData(json))
      .catch((e: Error) => setError(e.message))
  }, [])

  const rows = useMemo(
    () => (data ? applyFilters(data.rows, filters) : []),
    [data, filters],
  )

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'answerField' ? { answerValue: ALL } : {}),
    }))
  }, [])

  const selectMun = useCallback((name: string) => {
    setFilters((prev) => ({
      ...prev,
      municipio: name,
    }))
  }, [])

  const clearMun = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      municipio: ALL,
    }))
  }, [])

  const scopeLabel = useMemo(() => {
    const parts: string[] = []
    if (filters.municipio === ALL) parts.push('Pesquisa completa — Bahia')
    else parts.push(filters.municipio)
    if (filters.folha !== ALL) parts.push(`folha ${filters.folha}`)
    if (filters.dia !== ALL) parts.push(filters.dia)
    if (filters.sexo !== ALL) parts.push(filters.sexo)
    return parts.join(' · ')
  }, [filters])

  const munRows = useMemo(() => {
    if (!data) return []
    if (filters.municipio === ALL) return data.rows
    return data.rows.filter((r) => r['Municípios'] === filters.municipio)
  }, [data, filters.municipio])

  const mapMunicipalities = useMemo(() => {
    if (!data) return []
    return data.municipalities
  }, [data])

  if (error) {
    return (
      <main className="boot">
        <p>Não foi possível carregar os microdados: {error}</p>
      </main>
    )
  }
  if (!data) {
    return (
      <main className="boot">
        <p>Carregando microdados da planilha…</p>
      </main>
    )
  }

  const munOpts = data.municipalities.map((m) => m.name)

  return (
    <div className={`app${view === 'mapa' ? ' map-mode' : ''}`}>
      <header className="chrome">
        <div className="top">
          <div className="brand">
            <img src="/analitica-logo.png?v=5" alt="Analítica" className="brand-logo" />
            <h1 className="sr-only">Analítica</h1>
          </div>
          <nav className="tabs" aria-label="Modos de visualização">
            {(
              [
                ['mapa', 'Mapa'],
                ['lista', 'Lista'],
                ['relatorio', 'Relatórios'],
                ['tabela', 'Tabelas'],
                ['temporalidade', 'Temporalidade'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`tab-${id}${view === id ? ' on' : ''}`}
                onClick={() => goView(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="top-actions">
            {view === 'mapa' ? <UserMenu /> : null}
            {view === 'lista' ? (
              <button
                type="button"
                className={`tool-btn ${listOpen ? 'on' : ''}`}
                onClick={() => {
                  setListOpen((v) => !v)
                  setFiltersOpen(false)
                }}
              >
                Municípios
              </button>
            ) : null}
            {view === 'relatorio' ? (
              <button
                type="button"
                className="print-btn"
                aria-label="Gerar relatório em PDF"
                title="Gerar relatório"
                onClick={() => setPdfOpen(true)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M18 7h1a2 2 0 0 1 2 2v6h-3v5H6v-5H3V9a2 2 0 0 1 2-2h1V3h12v4zm-2 0V5H8v2h8zM8 18h8v-5H8v5zm11-7a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
                  />
                </svg>
              </button>
            ) : null}
            {filters.municipio !== ALL ? (
              <span className="scope-pill">{filters.municipio}</span>
            ) : null}
            {view !== 'mapa' ? (
              <button
                type="button"
                className={`hamburger${filtersOpen ? ' on' : ''}`}
                aria-label="Abrir filtros"
                aria-expanded={filtersOpen}
                onClick={() => {
                  setFiltersOpen((v) => !v)
                  setListOpen(false)
                }}
              >
                <span />
                <span />
                <span />
              </button>
            ) : null}
          </div>
        </div>

        {view !== 'mapa' ? (
          <>
            {filtersOpen ? (
              <button
                type="button"
                className="drawer-backdrop filter-backdrop"
                aria-label="Fechar filtros"
                onClick={() => setFiltersOpen(false)}
              />
            ) : null}
            <section
              className={`filters${filtersOpen ? ' open' : ''}`}
              aria-label="Filtros"
            >
              <div className="filter-drawer-head">
                <h2>Filtros</h2>
                <button
                  type="button"
                  className="drawer-close"
                  onClick={() => setFiltersOpen(false)}
                >
                  Fechar
                </button>
              </div>
            <Select
              label="Município"
              value={filters.municipio}
              onChange={(v) => setFilter('municipio', v)}
              options={munOpts}
            />
            {view !== 'tabela' ? (
              <>
                <Select
                  label="Sexo"
                  value={filters.sexo}
                  onChange={(v) => setFilter('sexo', v)}
                  options={uniqueValues(data.rows, 'sexo').filter((x) => x !== EMPTY)}
                />
                <Select
                  label="Escolaridade"
                  value={filters.escolaridade}
                  onChange={(v) => setFilter('escolaridade', v)}
                  options={uniqueValues(data.rows, 'ESCOLARIDADE')}
                />
                <Select
                  label="Religião"
                  value={filters.religiao}
                  onChange={(v) => setFilter('religiao', v)}
                  options={uniqueValues(data.rows, 'religião')}
                />
                <Select
                  label="Renda"
                  value={filters.renda}
                  onChange={(v) => setFilter('renda', v)}
                  options={uniqueValues(data.rows, 'renda familiar')}
                />
              </>
            ) : null}
            <div className="flt clear-wrap">
              <span className="clear-spacer" aria-hidden="true">
                &nbsp;
              </span>
              <button
                type="button"
                className="clear-filters"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                Limpar filtros
              </button>
            </div>
            </section>
          </>
        ) : null}
      </header>

      <main className="stage" ref={stageRef}>
        {view === 'relatorio' && !visited.relatorio ? (
          <p className="pane-loading">Carregando relatório…</p>
        ) : null}
        {view === 'tabela' && !visited.tabela ? (
          <p className="pane-loading">Carregando tabelas…</p>
        ) : null}
        {view === 'temporalidade' && !visited.temporalidade ? (
          <p className="pane-loading">Carregando temporalidade…</p>
        ) : null}
        {visited.mapa ? (
          <div className={`stage-pane stage-mapa${view === 'mapa' ? ' is-on' : ''}`}>
            <MapView
              municipalities={mapMunicipalities}
              selected={filters.municipio === ALL ? null : filters.municipio}
              onSelect={selectMun}
              onClear={clearMun}
              visible={view === 'mapa'}
            />
            <aside className="map-side" ref={mapSideRef}>
              <p className="kicker">Indicadores</p>
              <h2>{filters.municipio === ALL ? 'Bahia' : filters.municipio}</h2>
              <p className="lede">
                {filters.municipio === ALL
                  ? 'Pesquisa completa. Clique um ponto no mapa para ver o município.'
                  : 'Resultado local. Clique no mapa (fora do ponto) para voltar à Bahia.'}
              </p>
              <KpiCards rows={munRows} />
              <button
                type="button"
                className="open-full"
                onClick={() => goView('relatorio')}
              >
                Acessar pesquisa
              </button>
            </aside>
          </div>
        ) : null}

        {visited.lista ? (
          <div className={`stage-pane stage-lista${view === 'lista' ? ' is-on' : ''}`}>
            {listOpen ? (
              <button
                type="button"
                className="drawer-backdrop"
                aria-label="Fechar lista de municípios"
                onClick={() => setListOpen(false)}
              />
            ) : null}
            <div className={`list-pane${listOpen ? ' open' : ''}`}>
              <h2>Dias de campo</h2>
              {data.meta.sheets.map((sheet) => {
                const n = data.meta.nPorFolha[sheet]
                const active = filters.folha === sheet
                return (
                  <button
                    type="button"
                    key={sheet}
                    className={`list-card ${active ? 'on' : ''}`}
                    onClick={() => {
                      setFilter('folha', active ? ALL : sheet)
                      goView('relatorio')
                    }}
                  >
                    <strong>Folha {sheet}</strong>
                    <span>{formatN(n)} entrevistas na planilha</span>
                  </button>
                )
              })}
              <h2>Municípios</h2>
              <ul className="mun-list">
                {mapMunicipalities.map((m) => (
                  <li key={m.name}>
                    <button
                      type="button"
                      className={filters.municipio === m.name ? 'on' : ''}
                      onClick={() => {
                        selectMun(m.name)
                        setListOpen(false)
                      }}
                    >
                      <span className="mun-name">{m.name}</span>
                      <span className="mun-n">{formatN(m.n)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="side" ref={listSideRef}>
              <CompactResults
                rows={rows}
                scopeLabel={scopeLabel}
                onOpenFull={() => goView('relatorio')}
              />
            </div>
          </div>
        ) : null}

        {visited.tabela ? (
          <div
            className={`stage-pane stage-tabela${view === 'tabela' ? ' is-on' : ''}`}
            ref={tableRef}
          >
            <div className="table-page">
              <TablesView
                data={data}
                rows={munRows}
                scopeLabel={
                  filters.municipio === ALL ? 'Pesquisa completa — Bahia' : filters.municipio
                }
              />
            </div>
          </div>
        ) : null}

        {visited.relatorio ? (
          <div
            className={`stage-pane stage-relatorio${view === 'relatorio' ? ' is-on' : ''}`}
            ref={reportRef}
          >
            <div className="report-page">
              <Report rows={rows} scopeLabel={scopeLabel} />
            </div>
          </div>
        ) : null}

        {visited.temporalidade ? (
          <div
            className={`stage-pane stage-temporalidade${view === 'temporalidade' ? ' is-on' : ''}`}
            ref={temporalRef}
          >
            <div className="report-page">
              <TemporalidadeView rows={data.rows} municipalities={munOpts} />
            </div>
          </div>
        ) : null}
      </main>
      {pdfOpen ? (
        <GenerateReportModal
          municipalities={munOpts}
          defaultMunicipio={filters.municipio}
          allRows={data.rows}
          onClose={() => setPdfOpen(false)}
        />
      ) : null}
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  allLabel = 'Todos',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  allLabel?: string
}) {
  return (
    <label className="flt">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={ALL}>{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}
