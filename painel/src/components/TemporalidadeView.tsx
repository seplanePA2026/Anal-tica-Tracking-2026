import { useMemo, useState } from 'react'
import { formatN, formatPctNum } from '../stats'
import { RESEARCH_WAVES, temporalPoints } from '../temporal'
import { ALL, type Row } from '../types'
import { IntencaoRejeicaoPanel } from './IntencaoRejeicaoPanel'

type Props = {
  rows: Row[]
  municipalities: string[]
}

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
    </div>
  )
}

function dayDisplayLabel(folha: string): string {
  // "06.09" → "06/09"
  return folha.replace(/\./g, '/')
}

function TemporalAcumulado({
  rows,
  municipalities,
}: {
  rows: Row[]
  municipalities: string[]
}) {
  const [municipio, setMunicipio] = useState(ALL)

  const scoped = useMemo(() => {
    if (municipio === ALL) return rows
    return rows.filter((r) => r['Municípios'] === municipio)
  }, [rows, municipio])

  const days = useMemo(() => temporalPoints(scoped), [scoped])
  const total = scoped.length

  const dayRows = useMemo(() => {
    let running = 0
    return days.map((d) => {
      const n = d.rows.length
      running += n
      return {
        id: d.id,
        label: dayDisplayLabel(d.label),
        n,
        pct: total ? (n / total) * 100 : 0,
        acumulado: running,
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
        <div className="temporal-card-filters">
          <label className="flt">
            Município
            <select value={municipio} onChange={(e) => setMunicipio(e.target.value)}>
              <option value={ALL}>Bahia (todos)</option>
              {municipalities.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>

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
                entrevistas · {dayRows.length}{' '}
                {dayRows.length === 1 ? 'dia' : 'dias'} de campo
              </p>
            </div>

            <div className="acum-day-grid">
              {dayRows.map((d) => (
                <div key={d.id} className="acum-day-card">
                  <p className="acum-day-label">Dia {d.label}</p>
                  <p className="acum-day-n">{formatN(d.n)}</p>
                  <p className="acum-day-meta">
                    {formatPctNum(d.pct)} do total · acum. {formatN(d.acumulado)}
                  </p>
                </div>
              ))}
            </div>

            <AcumuladoChart days={dayRows} total={total} />

            <div className="table-scroll acum-table">
              <table>
                <thead>
                  <tr>
                    <th>Dia</th>
                    <th className="num">N do dia</th>
                    <th className="num">% do total</th>
                    <th className="num">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {dayRows.map((d) => (
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
                    <th>Total</th>
                    <th className="num">{formatN(total)}</th>
                    <th className="num">{total ? '100,0%' : '—'}</th>
                    <th className="num">{formatN(total)}</th>
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

type DayRow = {
  id: string
  label: string
  n: number
  pct: number
  acumulado: number
}

function AcumuladoChart({ days, total }: { days: DayRow[]; total: number }) {
  if (!days.length) return null

  const pad = { top: 28, right: 24, bottom: 40, left: 52 }
  const width = 720
  const height = 260
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const maxY = Math.max(1, total)
  const yMax = Math.ceil(maxY / 100) * 100 || 100
  const barGap = 28
  const barW = Math.min(96, (innerW - barGap * (days.length - 1)) / days.length)

  const xCenter = (i: number) => {
    const span = days.length * barW + (days.length - 1) * barGap
    const start = pad.left + (innerW - span) / 2
    return start + i * (barW + barGap) + barW / 2
  }
  const yPos = (value: number) => pad.top + innerH - (value / yMax) * innerH
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax)

  const cumPath = days
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xCenter(i)} ${yPos(d.acumulado)}`)
    .join(' ')

  return (
    <div className="line-chart-wrap acum-chart">
      <svg
        className="line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Total acumulado e entrevistas por dia"
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

        {days.map((d, i) => {
          const cx = xCenter(i)
          const top = yPos(d.n)
          const h = Math.max(2, pad.top + innerH - top)
          return (
            <g key={`bar-${d.id}`}>
              <rect
                x={cx - barW / 2}
                y={top}
                width={barW}
                height={h}
                rx="8"
                className="acum-bar"
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
                y={height - 12}
                className="line-axis"
                textAnchor="middle"
              >
                {d.label}
              </text>
            </g>
          )
        })}

        <path
          d={cumPath}
          fill="none"
          stroke="#7C4DFF"
          strokeWidth="2.75"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {days.map((d, i) => (
          <g key={`cum-${d.id}`}>
            <circle
              cx={xCenter(i)}
              cy={yPos(d.acumulado)}
              r="5.5"
              fill="#7C4DFF"
              stroke="#fff"
              strokeWidth="2"
            >
              <title>
                Acumulado em {d.label}: {formatN(d.acumulado)}
              </title>
            </circle>
            <text
              x={xCenter(i) + 14}
              y={yPos(d.acumulado) + 4}
              className="acum-cum-label"
              textAnchor="start"
            >
              {formatN(d.acumulado)}
            </text>
          </g>
        ))}
      </svg>
      <ul className="line-legend">
        <li>
          <span className="line-swatch" style={{ background: '#c4b5fd' }} />
          Entrevistas do dia
        </li>
        <li>
          <span className="line-swatch" style={{ background: '#7C4DFF' }} />
          Total acumulado
        </li>
      </ul>
    </div>
  )
}
