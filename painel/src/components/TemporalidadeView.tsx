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
const GOVERNOR_FIELD = 'ESTIMULADA GOVERNADOR'
const SENATOR_FIELD = 'ESTIMULADA SENADOR 1ª OPÇÃO'

export function TemporalidadeView({ rows, municipalities }: Props) {
  const wave = RESEARCH_WAVES[0]

  return (
    <div className="temporal-page">
      <header className="report-hero">
        <p className="kicker">Temporalidade</p>
        <h2>{wave?.label ?? 'Evolução'}</h2>
      </header>

      <IntencaoRejeicaoPanel rows={rows} municipalities={municipalities} />

      <div className="temporal-intencao-row">
        <TemporalIntencaoCargo
          rows={rows}
          municipalities={municipalities}
          fieldKey={PRESIDENT_FIELD}
          title="Intenção de voto — presidente"
          lede="Cinco principais candidatos na estimulada a presidente, com linha de acumulado por candidato nos dias 06, 07 e 08."
          topN={5}
          compact
        />
        <TemporalIntencaoCargo
          rows={rows}
          municipalities={municipalities}
          fieldKey={GOVERNOR_FIELD}
          title="Intenção de voto — governador"
          lede="Três principais candidatos na estimulada a governador, com linha de acumulado por candidato nos dias 06, 07 e 08."
          topN={3}
          compact
        />
      </div>

      <div className="temporal-intencao-row">
        <TemporalIntencaoCargo
          rows={rows}
          municipalities={municipalities}
          fieldKey={SENATOR_FIELD}
          title="Intenção de voto — senador"
          lede="Seis principais candidatos na estimulada a senador (1ª opção), com linha de acumulado por candidato nos dias 06, 07 e 08."
          topN={6}
          compact
        />
        <TemporalAcumulado rows={rows} municipalities={municipalities} />
      </div>
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
    <section className="temporal-group temporal-acumulado temporal-intencao-card">
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

function TemporalIntencaoCargo({
  rows,
  municipalities,
  fieldKey,
  title,
  lede,
  topN,
  compact,
  cardClassName = 'temporal-intencao-card',
}: {
  rows: Row[]
  municipalities: string[]
  fieldKey: string
  title: string
  lede: string
  topN: number
  compact: boolean
  cardClassName?: string
}) {
  const [municipio, setMunicipio] = useState(ALL)
  const scoped = useMunicipioScope(rows, municipio)
  const total = scoped.length
  const days = useMemo(() => temporalPoints(scoped), [scoped])

  const topCandidates = useMemo(() => {
    const dist = countBy(scoped, fieldKey)
    return dist.rows
      .filter((r) => isCandidateLabel(r.label))
      .slice(0, topN)
      .map((c) => ({
        id: c.label,
        label: c.label,
        n: c.n,
        pct: total ? (c.n / total) * 100 : 0,
        color: colorFor(c.label),
      }))
  }, [scoped, total, fieldKey, topN])

  const series = useMemo(() => {
    return topCandidates.map((c) => {
      let running = 0
      const points = days.map((d) => {
        const n = d.rows.filter((r) => r[fieldKey] === c.label).length
        running += n
        const dayTotal = d.rows.length || 1
        return {
          x: dayDisplayLabel(d.label),
          n,
          acumulado: running,
          pctDia: (n / dayTotal) * 100,
        }
      })
      return { ...c, points }
    })
  }, [topCandidates, days, fieldKey])

  const topSum = topCandidates.reduce((s, c) => s + c.n, 0)

  const dayBaseAcum = useMemo(() => {
    let running = 0
    return days.map((d) => {
      running += d.rows.length
      return { id: d.id, label: dayDisplayLabel(d.label), acumulado: running }
    })
  }, [days])

  const gridClass =
    topN <= 3
      ? 'acum-day-grid acum-cand-grid acum-cand-grid-3'
      : topN >= 6
        ? 'acum-day-grid acum-cand-grid acum-cand-grid-6'
        : 'acum-day-grid acum-cand-grid'

  return (
    <section className={`temporal-group temporal-acumulado ${cardClassName}`}>
      <h3>{title}</h3>
      <p className="temporal-acumulado-lede">{lede}</p>

      <article className="temporal-mini">
        <MunicipioFilter
          municipio={municipio}
          municipalities={municipalities}
          onChange={setMunicipio}
        />

        {!scoped.length ? (
          <p className="empty-filter">Sem entrevistas neste recorte.</p>
        ) : (
          <>
            <div className="acum-hero">
              <p className="temporal-total-label">
                {municipio === ALL
                  ? 'Total acumulado da pesquisa'
                  : `Total acumulado em ${municipio}`}
              </p>
              <p className="temporal-total-value">{formatN(total)}</p>
              <p className="temporal-n temporal-n-card">
                {formatN(topSum)} votos nos {topN} principais · base{' '}
                {formatN(total)} entrevistas
              </p>
            </div>

            <div className={gridClass}>
              {topCandidates.map((c) => (
                <div key={c.id} className="acum-day-card">
                  <p className="acum-day-label">{c.label}</p>
                  <p className="acum-day-n">{formatN(c.n)}</p>
                  <p className="acum-day-meta">{formatPctNum(c.pct)} do total</p>
                </div>
              ))}
            </div>

            <CandidateCumChart series={series} compact={compact} />

            <div className="table-scroll acum-table acum-table-compact">
              <table>
                <thead>
                  <tr>
                    <th>Candidato</th>
                    {days.map((d) => (
                      <th key={d.id} className="num">
                        Acum. {dayDisplayLabel(d.label)}
                      </th>
                    ))}
                    <th className="num">Total</th>
                    <th className="num">% do total</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((s) => (
                    <tr key={s.id}>
                      <td>{s.label}</td>
                      {s.points.map((p) => (
                        <td key={p.x} className="num">
                          {formatN(p.acumulado)}
                        </td>
                      ))}
                      <td className="num">{formatN(s.n)}</td>
                      <td className="num">{formatPctNum(s.pct)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Base (entrevistas)</th>
                    {dayBaseAcum.map((d) => (
                      <th key={d.id} className="num">
                        {formatN(d.acumulado)}
                      </th>
                    ))}
                    <th className="num">{formatN(total)}</th>
                    <th className="num">{total ? '100,0%' : '—'}</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </article>
    </section>
  )
}

type CandPoint = {
  x: string
  n: number
  acumulado: number
  pctDia: number
}

type CandSeries = {
  id: string
  label: string
  n: number
  pct: number
  color: string
  points: CandPoint[]
}

function CandidateCumChart({
  series,
  compact = false,
}: {
  series: CandSeries[]
  compact?: boolean
}) {
  if (!series.length || !series[0]?.points.length) return null

  const pad = compact
    ? { top: 22, right: 44, bottom: 36, left: 18 }
    : { top: 26, right: 56, bottom: 40, left: 20 }
  const width = compact ? 640 : 920
  const height = compact ? 260 : 320
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const xs = series[0].points.map((p) => p.x)
  const maxY = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.acumulado)))
  const yMax = Math.ceil(maxY / 50) * 50 || 50
  /** Separação mínima entre pontos no mesmo dia. */
  const minGap = compact ? 20 : 24
  const yLo = pad.top + 16
  const yHi = pad.top + innerH - 10

  const xPos = (i: number) => {
    if (xs.length <= 1) return pad.left + innerW / 2
    // margens internas maiores = mais espaço entre 06/09, 07/09 e 08/09
    const edge = Math.min(56, innerW * 0.12)
    const usable = innerW - edge * 2
    return pad.left + edge + (i / (xs.length - 1)) * usable
  }
  const yPos = (value: number) => pad.top + innerH - (value / yMax) * innerH
  const gridYs = [0, 0.5, 1].map((t) => t * yMax)

  const displayY: number[][] = series.map((s) =>
    s.points.map((p) => yPos(p.acumulado)),
  )
  for (let day = 0; day < xs.length; day++) {
    const items = series.map((s, si) => ({
      si,
      v: s.points[day]?.acumulado ?? 0,
      y: displayY[si][day],
    }))
    items.sort((a, b) => a.v - b.v || a.si - b.si)

    for (let k = 0; k < items.length; k++) {
      if (k === 0) items[k].y = Math.min(yHi, items[k].y)
      else items[k].y = Math.min(items[k].y, items[k - 1].y - minGap)
    }
    for (let k = items.length - 1; k >= 0; k--) {
      if (k === items.length - 1) items[k].y = Math.max(yLo, items[k].y)
      else items[k].y = Math.max(items[k].y, items[k + 1].y + minGap)
    }
    for (const it of items) displayY[it.si][day] = it.y
  }

  /** Rank no dia (0 = menor) — define se o valor vai acima ou abaixo do ponto. */
  const rankAtDay: number[][] = xs.map((_, day) => {
    const order = series
      .map((s, si) => ({ si, v: s.points[day]?.acumulado ?? 0 }))
      .sort((a, b) => a.v - b.v || a.si - b.si)
    const ranks = new Array(series.length).fill(0)
    order.forEach((o, rank) => {
      ranks[o.si] = rank
    })
    return ranks
  })

  function labelPlacement(si: number, day: number, cx: number, cy: number) {
    const rank = rankAtDay[day][si]
    const isBottom = rank === 0
    // Topo e meio: valor sempre acima. Só o mais baixo fica abaixo.
    if (isBottom) {
      return { x: cx, y: cy + 13, anchor: 'middle' as const }
    }
    return { x: cx, y: cy - 10, anchor: 'middle' as const }
  }

  return (
    <div className="line-chart-wrap acum-chart">
      <svg
        className="line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Acumulado diário de intenção de voto por candidato"
      >
        {gridYs.map((g) => (
          <line
            key={g}
            x1={pad.left}
            x2={pad.left + innerW}
            y1={yPos(g)}
            y2={yPos(g)}
            className="line-grid"
          />
        ))}

        {xs.map((label, i) => (
          <text
            key={label}
            x={xPos(i)}
            y={height - 12}
            className="line-axis"
            textAnchor="middle"
          >
            {label}
          </text>
        ))}

        {series.map((s, si) => {
          const d = s.points
            .map((_, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${displayY[si][i]}`)
            .join(' ')
          return (
            <g key={s.id}>
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth="2.25"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.points.map((p, i) => {
                const cx = xPos(i)
                const cy = displayY[si][i]
                const lab = labelPlacement(si, i, cx, cy)
                return (
                  <g key={`${s.id}-${p.x}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r="4"
                      fill={s.color}
                      stroke="#fff"
                      strokeWidth="1.5"
                    >
                      <title>
                        {s.label} · {p.x}: acum. {formatN(p.acumulado)} (+
                        {formatN(p.n)} no dia)
                      </title>
                    </circle>
                    <text
                      x={lab.x}
                      y={lab.y}
                      className="line-point-value acum-point-label"
                      textAnchor={lab.anchor}
                      fill={s.color}
                    >
                      {formatN(p.acumulado)}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
      <ul className="line-legend">
        {series.map((s) => (
          <li key={s.id}>
            <span className="line-swatch" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
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
