import { useEffect, useMemo, useRef, useState } from 'react'
import { isCandidateLabel } from '../intencaoRejeicao'
import { countBy, formatN, formatPctNum } from '../stats'
import { IR_WAVE_FOLHAS, temporalIrPoints, type TimePoint } from '../temporal'
import type { Row } from '../types'

type Props = {
  rows: Row[]
}

const ACUMULADOR_CITIES = [
  'Salvador',
  'Feira de Santana',
  'Vitória da Conquista',
  'Camaçari',
  'Lauro de Freitas',
] as const

const CITY_COLORS: Record<(typeof ACUMULADOR_CITIES)[number], string> = {
  Salvador: '#6D28D9',
  'Feira de Santana': '#0D9488',
  'Vitória da Conquista': '#D97706',
  Camaçari: '#2563EB',
  'Lauro de Freitas': '#DB2777',
}

const PRESIDENT_FIELD = 'ESTIMULADA PRESIDENTE'
const GOVERNOR_FIELD = 'ESTIMULADA GOVERNADOR'
const JERO_APOIOS_FIELD = 'JEROXACM com apoios'
const JERO_APOIOS_CANDS = ['Jerônimo Rodrigues', 'ACM Neto'] as const
const MAX_CROSS = 4

type CityPoint = {
  x: string
  waveName: string
  dates: string
  n: number
  total: number
  acumuladoN: number
  acumuladoTotal: number
  pct: number
}

type CitySeries = {
  city: string
  color: string
  points: CityPoint[]
}

function shortWaveLabel(label: string): string {
  const range = label.match(
    /^0?(\d{1,2})\/(\d{2})\s*[–-]\s*0?(\d{1,2})\/(\d{2})$/,
  )
  if (range) {
    const [, d1, m1, d2, m2] = range
    if (m1 === m2) return `${Number(d1)}–${Number(d2)}/${m1}`
    return `${Number(d1)}/${m1}–${Number(d2)}/${m2}`
  }
  return label.replace(/\./g, '/')
}

function waveNameForPoint(w: TimePoint): string {
  const folha =
    w.rows.find((r) => r.folha)?.folha ??
    IR_WAVE_FOLHAS.flat().find((f) => w.id.includes(f))
  if (folha) {
    const idx = IR_WAVE_FOLHAS.findIndex((wave) =>
      (wave as readonly string[]).includes(folha),
    )
    if (idx >= 0) return `Onda ${idx + 1}`
  }
  return ''
}

/** Candidatos ordenados do maior para o menor (n no recorte). */
function candidateOptions(
  rows: Row[],
  fieldKey: string,
  fixed?: readonly string[],
): string[] {
  if (fixed?.length) {
    const ranked = countBy(rows, fieldKey).rows
    const order = new Map(ranked.map((r, i) => [r.label, i]))
    return fixed
      .filter((c) => rows.some((r) => r[fieldKey] === c))
      .sort(
        (a, b) =>
          (order.get(a) ?? 999) - (order.get(b) ?? 999) ||
          a.localeCompare(b, 'pt-BR'),
      )
  }
  return countBy(rows, fieldKey)
    .rows.filter((r) => isCandidateLabel(r.label))
    .map((r) => r.label)
}

function buildCitySeries(
  fieldKey: string,
  candidate: string,
  waves: TimePoint[],
): CitySeries[] {
  return ACUMULADOR_CITIES.map((city) => {
    let acumuladoN = 0
    let acumuladoTotal = 0
    const points = waves.map((w) => {
      const dayRows = w.rows.filter((r) => r['Municípios'] === city)
      const n = dayRows.filter((r) => r[fieldKey] === candidate).length
      const total = dayRows.length
      acumuladoN += n
      acumuladoTotal += total
      const dates = shortWaveLabel(w.label)
      const waveName = waveNameForPoint(w)
      return {
        x: waveName ? `${waveName} · ${dates}` : dates,
        waveName,
        dates,
        n,
        total,
        acumuladoN,
        acumuladoTotal,
        pct: acumuladoTotal ? (acumuladoN / acumuladoTotal) * 100 : 0,
      }
    })
    return {
      city,
      color: CITY_COLORS[city],
      points,
    }
  })
}

function seriesYMax(series: CitySeries[]): number {
  const maxY = Math.max(
    1,
    ...series.flatMap((s) => s.points.map((p) => p.acumuladoN)),
  )
  return Math.ceil(maxY / 50) * 50 || 50
}

export function AcumuladorView({ rows }: Props) {
  const cityRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          r['Municípios'] != null &&
          (ACUMULADOR_CITIES as readonly string[]).includes(r['Municípios']),
      ),
    [rows],
  )

  const waves = useMemo(() => temporalIrPoints(cityRows), [cityRows])

  const nCities = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of ACUMULADOR_CITIES) {
      map[c] = cityRows.filter((r) => r['Municípios'] === c).length
    }
    return map
  }, [cityRows])

  return (
    <div className="acumulador-page">
      <header className="report-hero temporal-hero">
        <div className="temporal-hero-text">
          <p className="kicker">Acumulador</p>
          <h2>Intenção acumulada × 5 municípios</h2>
          <p className="lede">
            {formatN(cityRows.length)} entrevistas em Salvador, Feira de Santana,
            Vitória da Conquista, Camaçari e Lauro de Freitas ·{' '}
            {IR_WAVE_FOLHAS.length} ondas. Os dois maiores candidatos abrem
            lado a lado; use as abas para cruzar até {MAX_CROSS} nomes.
          </p>
        </div>
      </header>

      <ul className="acum-city-legend" aria-label="Municípios">
        {ACUMULADOR_CITIES.map((city) => (
          <li key={city}>
            <span className="line-swatch" style={{ background: CITY_COLORS[city] }} />
            {city}
            <em>{formatN(nCities[city] ?? 0)}</em>
          </li>
        ))}
      </ul>

      <AcumuladorRace
        title="Presidente — estimulada"
        fieldKey={PRESIDENT_FIELD}
        rows={cityRows}
        waves={waves}
      />
      <AcumuladorRace
        title="Governador — estimulada"
        fieldKey={GOVERNOR_FIELD}
        rows={cityRows}
        waves={waves}
      />
      <AcumuladorRace
        title="Governador com apoio do presidente Lula"
        fieldKey={JERO_APOIOS_FIELD}
        rows={cityRows}
        waves={waves}
        fixedCandidates={JERO_APOIOS_CANDS}
      />
    </div>
  )
}

function AcumuladorRace({
  title,
  fieldKey,
  rows,
  waves,
  fixedCandidates,
}: {
  title: string
  fieldKey: string
  rows: Row[]
  waves: TimePoint[]
  fixedCandidates?: readonly string[]
}) {
  const options = useMemo(
    () => candidateOptions(rows, fieldKey, fixedCandidates),
    [rows, fieldKey, fixedCandidates],
  )
  const [selected, setSelected] = useState<string[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelected((prev) => {
      const valid = prev.filter((c) => options.includes(c))
      if (valid.length >= 1) return valid
      return options.slice(0, Math.min(2, options.length))
    })
  }, [options])

  useEffect(() => {
    if (!pickerOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [pickerOpen])

  const active = useMemo(() => {
    const valid = selected.filter((c) => options.includes(c))
    if (valid.length) return valid
    return options.slice(0, Math.min(2, options.length))
  }, [selected, options])

  const panels = useMemo(
    () =>
      active.map((cand) => ({
        candidate: cand,
        series: buildCitySeries(fieldKey, cand, waves),
      })),
    [active, fieldKey, waves],
  )

  const sharedYMax = useMemo(
    () => Math.max(50, ...panels.map((p) => seriesYMax(p.series))),
    [panels],
  )

  function toggleCandidate(name: string) {
    setSelected((prev) => {
      const base = (prev.length ? prev : active).filter((c) =>
        options.includes(c),
      )
      if (base.includes(name)) {
        if (base.length <= 1) return base
        return base.filter((c) => c !== name)
      }
      if (base.length >= MAX_CROSS) return [...base.slice(1), name]
      return [...base, name]
    })
  }

  if (!options.length) {
    return (
      <section className="temporal-intencao-card temporal-intencao-card-full acumulador-card">
        <h3>{title}</h3>
        <p className="empty-filter">Sem candidatos neste recorte.</p>
      </section>
    )
  }

  return (
    <section className="temporal-intencao-card temporal-intencao-card-full acumulador-card">
      <div className="acumulador-card-head">
        <div>
          <h3>{title}</h3>
          <p className="temporal-acumulado-lede">
            Comparativo acumulado por município (ondas). Escala Y compartilhada
            entre os painéis.
          </p>
        </div>

        <div className="acum-cand-picker" ref={pickerRef}>
          <span className="acum-cand-picker-label">Cruzar candidatos</span>
          <div className="acum-cand-tabs" role="tablist" aria-label="Candidatos ativos">
            {active.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected="true"
                className="acum-cand-tab on"
                onClick={() => setPickerOpen((o) => !o)}
              >
                {c}
              </button>
            ))}
            <button
              type="button"
              className={`acum-cand-tab acum-cand-tab-more${pickerOpen ? ' on' : ''}`}
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              onClick={() => setPickerOpen((o) => !o)}
            >
              + Cruzar
            </button>
          </div>

          {pickerOpen && (
            <div className="acum-cand-menu" role="listbox" aria-multiselectable="true">
              <p className="acum-cand-menu-hint">
                Selecione até {MAX_CROSS} · os dois maiores já vêm marcados
              </p>
              <ul>
                {options.map((o, i) => {
                  const on = active.includes(o)
                  return (
                    <li key={o}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={on}
                        className={`acum-cand-option${on ? ' on' : ''}`}
                        onClick={() => toggleCandidate(o)}
                      >
                        <span className="acum-cand-check" aria-hidden="true">
                          {on ? '✓' : ''}
                        </span>
                        <span className="acum-cand-option-name">{o}</span>
                        {i < 2 && (
                          <em className="acum-cand-rank">Top {i + 1}</em>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div
        className={`acum-compare-grid acum-compare-n${Math.min(panels.length, 3)}`}
      >
        {panels.map((panel) => (
          <CandidatePanel
            key={panel.candidate}
            candidate={panel.candidate}
            series={panel.series}
            yMax={sharedYMax}
          />
        ))}
      </div>
    </section>
  )
}

function CandidatePanel({
  candidate,
  series,
  yMax,
}: {
  candidate: string
  series: CitySeries[]
  yMax: number
}) {
  const waveBaseAcum = useMemo(() => {
    if (!series.length) return [] as { x: string; acumulado: number }[]
    return series[0].points.map((_, wi) => ({
      x: series[0].points[wi].x,
      acumulado: series.reduce((s, city) => s + city.points[wi].acumuladoTotal, 0),
    }))
  }, [series])

  return (
    <div className="acum-compare-panel">
      <h4 className="acum-compare-title">{candidate}</h4>
      <CityCrossLineChart series={series} candidate={candidate} yMax={yMax} />
      <div className="table-scroll acum-table acum-table-compact">
        <table>
          <thead>
            <tr>
              <th>Município</th>
              {series[0]?.points.map((p) => (
                <th key={p.x} className="num acum-wave-th">
                  {p.waveName ? (
                    <>
                      <span className="acum-wave-name">{p.waveName}</span>
                      <span className="acum-wave-dates">{p.dates}</span>
                    </>
                  ) : (
                    <>Acum. {p.dates}</>
                  )}
                </th>
              ))}
              <th className="num">Total</th>
              <th className="num">% no município</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => {
              const last = s.points[s.points.length - 1]
              return (
                <tr key={s.city}>
                  <td>
                    <span
                      className="line-swatch"
                      style={{ background: s.color, marginRight: 8 }}
                      aria-hidden="true"
                    />
                    {s.city}
                  </td>
                  {s.points.map((p) => (
                    <td key={p.x} className="num">
                      {formatN(p.acumuladoN)}
                    </td>
                  ))}
                  <td className="num">{formatN(last?.acumuladoN ?? 0)}</td>
                  <td className="num">{formatPctNum(last?.pct ?? 0)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <th>Base (entrevistas)</th>
              {waveBaseAcum.map((d) => (
                <th key={d.x} className="num">
                  {formatN(d.acumulado)}
                </th>
              ))}
              <th className="num">
                {formatN(waveBaseAcum[waveBaseAcum.length - 1]?.acumulado ?? 0)}
              </th>
              <th className="num">—</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function CityCrossLineChart({
  series,
  candidate,
  yMax: yMaxProp,
}: {
  series: CitySeries[]
  candidate: string
  yMax?: number
}) {
  const [hoverDay, setHoverDay] = useState<number | null>(null)

  if (!series.length || !series[0]?.points.length) {
    return <p className="empty-filter">Sem dados para {candidate}.</p>
  }

  const axisPoints = series[0].points
  const pad = { top: 24, right: 36, bottom: 54, left: 44 }
  const width = 640
  const height = 340
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const yMax = yMaxProp ?? seriesYMax(series)

  const xPos = (i: number) => {
    if (axisPoints.length <= 1) return pad.left + innerW / 2
    const edge = Math.min(36, innerW * 0.08)
    const usable = innerW - edge * 2
    return pad.left + edge + (i / (axisPoints.length - 1)) * usable
  }
  const yPos = (value: number) => pad.top + innerH - (value / yMax) * innerH

  const pointY: number[][] = series.map((s) =>
    s.points.map((p) => yPos(p.acumuladoN)),
  )

  const hitHalf =
    axisPoints.length <= 1
      ? innerW / 2
      : Math.max(14, (xPos(1) - xPos(0)) / 2)

  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax)

  const tipRows =
    hoverDay == null
      ? []
      : series
          .map((s) => ({
            city: s.city,
            color: s.color,
            n: s.points[hoverDay]?.acumuladoN ?? 0,
            pct: s.points[hoverDay]?.pct ?? 0,
          }))
          .sort((a, b) => b.n - a.n || a.city.localeCompare(b.city))

  const tipLeftPct =
    hoverDay == null ? 50 : Math.min(78, Math.max(22, (xPos(hoverDay) / width) * 100))

  return (
    <div
      className="acumulador-chart-wrap line-chart-wrap acum-chart"
      onMouseLeave={() => setHoverDay(null)}
    >
      <svg
        className="line-chart acumulador-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Evolução acumulada de ${candidate} por município`}
      >
        {gridYs.map((g) => (
          <g key={g}>
            <line
              x1={pad.left}
              x2={pad.left + innerW}
              y1={yPos(g)}
              y2={yPos(g)}
              className="line-grid"
            />
            <text
              x={pad.left - 8}
              y={yPos(g) + 4}
              className="line-axis"
              textAnchor="end"
            >
              {formatN(g)}
            </text>
          </g>
        ))}

        {axisPoints.map((p, i) => (
          <text
            key={p.x}
            x={xPos(i)}
            y={height - 28}
            className="line-axis acum-axis-wave"
            textAnchor="middle"
          >
            {p.waveName ? (
              <>
                <tspan x={xPos(i)} dy="0" className="acum-axis-wave-name">
                  {p.waveName}
                </tspan>
                <tspan x={xPos(i)} dy="12" className="acum-axis-wave-dates">
                  {p.dates}
                </tspan>
              </>
            ) : (
              p.dates
            )}
          </text>
        ))}

        {hoverDay != null && (
          <line
            x1={xPos(hoverDay)}
            x2={xPos(hoverDay)}
            y1={pad.top}
            y2={pad.top + innerH}
            className="acum-hover-guide"
          />
        )}

        {series.map((s, si) => {
          const d = s.points
            .map((_, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${pointY[si][i]}`)
            .join(' ')
          return (
            <g key={s.city}>
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.points.map((p, i) => {
                const active = hoverDay === i
                return (
                  <circle
                    key={`${s.city}-${p.x}`}
                    cx={xPos(i)}
                    cy={pointY[si][i]}
                    r={active ? 6 : 4.5}
                    fill={s.color}
                    stroke="#fff"
                    strokeWidth={1.5}
                    className={active ? 'acum-point-active' : undefined}
                  />
                )
              })}
            </g>
          )
        })}

        {axisPoints.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={xPos(i) - hitHalf}
            y={pad.top}
            width={hitHalf * 2}
            height={innerH}
            fill="transparent"
            className="acum-day-hit"
            onMouseEnter={() => setHoverDay(i)}
          />
        ))}
      </svg>

      {hoverDay != null && tipRows.length > 0 && (
        <div
          className="acum-hover-card"
          style={{ left: `${tipLeftPct}%` }}
          role="tooltip"
        >
          <p className="acum-hover-card-title">
            {candidate} ·{' '}
            {axisPoints[hoverDay].waveName
              ? `${axisPoints[hoverDay].waveName} · ${axisPoints[hoverDay].dates}`
              : axisPoints[hoverDay].dates}
          </p>
          <ul>
            {tipRows.map((r) => (
              <li key={r.city}>
                <span className="line-swatch" style={{ background: r.color }} />
                <span className="acum-hover-city">{r.city}</span>
                <strong>{formatN(r.n)}</strong>
                <em>{formatPctNum(r.pct)}</em>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="acum-city-legend acumulador-chart-legend">
        {series.map((s) => {
          const last = s.points[s.points.length - 1]
          return (
            <li key={s.city}>
              <span className="line-swatch" style={{ background: s.color }} />
              {s.city}
              <em>
                {formatN(last?.acumuladoN ?? 0)} · {formatPctNum(last?.pct ?? 0)}
              </em>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
