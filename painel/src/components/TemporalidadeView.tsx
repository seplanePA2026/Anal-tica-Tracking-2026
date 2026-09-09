import { useMemo, useState } from 'react'
import { isCandidateLabel } from '../intencaoRejeicao'
import { colorFor, countBy, formatN, formatPctNum } from '../stats'
import { RESEARCH_WAVES, temporalPoints } from '../temporal'
import { ALL, type Row } from '../types'
import { IntencaoRejeicaoPanel } from './IntencaoRejeicaoPanel'

type Props = {
  rows: Row[]
  municipalities: string[]
}

const PRESIDENT_FIELD = 'ESTIMULADA PRESIDENTE'
const TOP_N = 5

export function TemporalidadeView({ rows, municipalities }: Props) {
  const wave = RESEARCH_WAVES[0]

  return (
    <div className="temporal-page">
      <header className="report-hero">
        <p className="kicker">Temporalidade</p>
        <h2>{wave?.label ?? 'Evolução'}</h2>
      </header>

      <IntencaoRejeicaoPanel rows={rows} municipalities={municipalities} />

      <TemporalAcumulado rows={rows} municipalities={municipalities} />

      <TemporalIntencaoPresidente rows={rows} municipalities={municipalities} />
    </div>
  )
}

function dayDisplayLabel(folha: string): string {
  return folha.replace(/\./g, '/')
}

function useMunicipioScope(rows: Row[], municipio: string) {
  return useMemo(() => {
    if (municipio === ALL) return rows
    return rows.filter((r) => r['Municípios'] === municipio)
  }, [rows, municipio])
}

function TemporalAcumulado({
  rows,
  municipalities,
}: {
  rows: Row[]
  municipalities: string[]
}) {
  const [municipio, setMunicipio] = useState(ALL)
  const scoped = useMunicipioScope(rows, municipio)
  const days = useMemo(() => temporalPoints(scoped), [scoped])
  const total = scoped.length

  const dayRows = useMemo(() => {
    let running = 0
    return days.map((d) => {
      const n = d.rows.length
      running += n
      return {
        id: d.id,
        label: `Dia ${dayDisplayLabel(d.label)}`,
        n,
        pct: total ? (n / total) * 100 : 0,
        acumulado: running,
        color: undefined as string | undefined,
      }
    })
  }, [days, total])

  return (
    <section className="temporal-group temporal-acumulado">
      <h3>Acumulado da pesquisa</h3>
      <p className="temporal-acumulado-lede">
        Total consolidado e divisão das entrevistas por dia de campo (06, 07 e
        08 de setembro).
      </p>

      <article className="temporal-mini">
        <MunicipioFilter
          municipio={municipio}
          municipalities={municipalities}
          onChange={setMunicipio}
        />

        {!scoped.length ? (
          <p className="empty-filter">Sem entrevistas neste recorte.</p>
        ) : (
          <AcumuladoBody
            heroLabel={
              municipio === ALL
                ? 'Total acumulado da pesquisa'
                : `Total acumulado em ${municipio}`
            }
            heroValue={total}
            heroHint={`entrevistas · ${dayRows.length} ${
              dayRows.length === 1 ? 'dia' : 'dias'
            } de campo`}
            items={dayRows}
            itemKind="Dia"
            chartAria="Total acumulado e entrevistas por dia"
            barLegend="Entrevistas do dia"
            lineLegend="Total acumulado"
            defaultBarColor="#c4b5fd"
            lineColor="#7C4DFF"
          />
        )}
      </article>
    </section>
  )
}

function TemporalIntencaoPresidente({
  rows,
  municipalities,
}: {
  rows: Row[]
  municipalities: string[]
}) {
  const [municipio, setMunicipio] = useState(ALL)
  const scoped = useMunicipioScope(rows, municipio)
  const total = scoped.length

  const topCandidates = useMemo(() => {
    const dist = countBy(scoped, PRESIDENT_FIELD)
    const candidates = dist.rows
      .filter((r) => isCandidateLabel(r.label))
      .slice(0, TOP_N)

    let running = 0
    return candidates.map((c) => {
      running += c.n
      return {
        id: c.label,
        label: c.label,
        n: c.n,
        pct: total ? (c.n / total) * 100 : 0,
        acumulado: running,
        color: colorFor(c.label),
      }
    })
  }, [scoped, total])

  const topSum = topCandidates.reduce((s, c) => s + c.n, 0)

  return (
    <section className="temporal-group temporal-acumulado temporal-intencao-pres">
      <h3>Intenção de voto — presidente</h3>
      <p className="temporal-acumulado-lede">
        Cinco principais candidatos na estimulada a presidente, no mesmo
        recorte dos três dias de campo.
      </p>

      <article className="temporal-mini">
        <MunicipioFilter
          municipio={municipio}
          municipalities={municipalities}
          onChange={setMunicipio}
        />

        {!scoped.length ? (
          <p className="empty-filter">Sem entrevistas neste recorte.</p>
        ) : (
          <AcumuladoBody
            heroLabel={
              municipio === ALL
                ? 'Total acumulado da pesquisa'
                : `Total acumulado em ${municipio}`
            }
            heroValue={total}
            heroHint={`${formatN(topSum)} votos nos 5 principais · base ${formatN(total)} entrevistas`}
            items={topCandidates}
            itemKind="Candidato"
            chartAria="Intenção de voto dos cinco principais candidatos a presidente"
            barLegend="Votos do candidato"
            lineLegend="Acumulado dos 5"
            defaultBarColor="#c4b5fd"
            lineColor="#7C4DFF"
            cardGridClass="acum-day-grid acum-cand-grid"
          />
        )}
      </article>
    </section>
  )
}

function MunicipioFilter({
  municipio,
  municipalities,
  onChange,
}: {
  municipio: string
  municipalities: string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="temporal-card-filters">
      <label className="flt">
        Município
        <select value={municipio} onChange={(e) => onChange(e.target.value)}>
          <option value={ALL}>Bahia (todos)</option>
          {municipalities.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

type AcumItem = {
  id: string
  label: string
  n: number
  pct: number
  acumulado: number
  color?: string
}

function AcumuladoBody({
  heroLabel,
  heroValue,
  heroHint,
  items,
  itemKind,
  chartAria,
  barLegend,
  lineLegend,
  defaultBarColor,
  lineColor,
  cardGridClass = 'acum-day-grid',
}: {
  heroLabel: string
  heroValue: number
  heroHint: string
  items: AcumItem[]
  itemKind: string
  chartAria: string
  barLegend: string
  lineLegend: string
  defaultBarColor: string
  lineColor: string
  cardGridClass?: string
}) {
  return (
    <>
      <div className="acum-hero">
        <p className="temporal-total-label">{heroLabel}</p>
        <p className="temporal-total-value">{formatN(heroValue)}</p>
        <p className="temporal-n temporal-n-card">{heroHint}</p>
      </div>

      <div className={cardGridClass}>
        {items.map((d) => (
          <div key={d.id} className="acum-day-card">
            <p className="acum-day-label">{d.label}</p>
            <p className="acum-day-n">{formatN(d.n)}</p>
            <p className="acum-day-meta">
              {formatPctNum(d.pct)} do total · acum. {formatN(d.acumulado)}
            </p>
          </div>
        ))}
      </div>

      <AcumuladoChart
        items={items}
        total={heroValue}
        ariaLabel={chartAria}
        barLegend={barLegend}
        lineLegend={lineLegend}
        defaultBarColor={defaultBarColor}
        lineColor={lineColor}
      />

      <div className="table-scroll acum-table">
        <table>
          <thead>
            <tr>
              <th>{itemKind}</th>
              <th className="num">N</th>
              <th className="num">% do total</th>
              <th className="num">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id}>
                <td>{d.label}</td>
                <td className="num">{formatN(d.n)}</td>
                <td className="num">{formatPctNum(d.pct)}</td>
                <td className="num">{formatN(d.acumulado)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>Total (base)</th>
              <th className="num">{formatN(heroValue)}</th>
              <th className="num">{heroValue ? '100,0%' : '—'}</th>
              <th className="num">{formatN(items.at(-1)?.acumulado ?? 0)}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}

function AcumuladoChart({
  items,
  total,
  ariaLabel,
  barLegend,
  lineLegend,
  defaultBarColor,
  lineColor,
}: {
  items: AcumItem[]
  total: number
  ariaLabel: string
  barLegend: string
  lineLegend: string
  defaultBarColor: string
  lineColor: string
}) {
  if (!items.length) return null

  const pad = { top: 28, right: 28, bottom: 56, left: 52 }
  const width = 720
  const height = 280
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const maxBar = Math.max(1, ...items.map((d) => d.n), ...items.map((d) => d.acumulado))
  const yMax = Math.ceil(Math.max(maxBar, total) / 100) * 100 || 100
  const barGap = items.length > 3 ? 16 : 28
  const barW = Math.min(
    96,
    Math.max(36, (innerW - barGap * (items.length - 1)) / items.length),
  )

  const xCenter = (i: number) => {
    const span = items.length * barW + (items.length - 1) * barGap
    const start = pad.left + (innerW - span) / 2
    return start + i * (barW + barGap) + barW / 2
  }
  const yPos = (value: number) => pad.top + innerH - (value / yMax) * innerH
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax)

  const cumPath = items
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xCenter(i)} ${yPos(d.acumulado)}`)
    .join(' ')

  return (
    <div className="line-chart-wrap acum-chart">
      <svg
        className="line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
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
              y={yPos(g) + 3}
              className="line-axis"
              textAnchor="end"
            >
              {formatN(Math.round(g))}
            </text>
          </g>
        ))}

        {items.map((d, i) => {
          const cx = xCenter(i)
          const top = yPos(d.n)
          const h = Math.max(2, pad.top + innerH - top)
          const fill = d.color ?? defaultBarColor
          const short =
            d.label.length > 18 ? `${d.label.slice(0, 16)}…` : d.label
          return (
            <g key={`bar-${d.id}`}>
              <rect
                x={cx - barW / 2}
                y={top}
                width={barW}
                height={h}
                rx="8"
                fill={fill}
                opacity={0.85}
              />
              <text
                x={cx}
                y={top - 8}
                className="line-point-value"
                textAnchor="middle"
              >
                {formatN(d.n)}
              </text>
              <text
                x={cx}
                y={height - 28}
                className="line-axis acum-bar-label"
                textAnchor="middle"
              >
                {short}
              </text>
            </g>
          )
        })}

        <path
          d={cumPath}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.75"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {items.map((d, i) => (
          <g key={`cum-${d.id}`}>
            <circle
              cx={xCenter(i)}
              cy={yPos(d.acumulado)}
              r="5.5"
              fill={lineColor}
              stroke="#fff"
              strokeWidth="2"
            >
              <title>
                Acumulado até {d.label}: {formatN(d.acumulado)}
              </title>
            </circle>
            <text
              x={xCenter(i) + 12}
              y={yPos(d.acumulado) + 4}
              className="acum-cum-label"
              textAnchor="start"
              fill={lineColor}
            >
              {formatN(d.acumulado)}
            </text>
          </g>
        ))}
      </svg>
      <ul className="line-legend">
        <li>
          <span className="line-swatch" style={{ background: defaultBarColor }} />
          {barLegend}
        </li>
        <li>
          <span className="line-swatch" style={{ background: lineColor }} />
          {lineLegend}
        </li>
      </ul>
    </div>
  )
}
