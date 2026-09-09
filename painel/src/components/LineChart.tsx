type Point = { x: string; pct: number }

type Series = {
  label: string
  color: string
  points: Point[]
}

type Props = {
  series: Series[]
  height?: number
}

export function LineChart({ series, height = 260 }: Props) {
  const pad = { top: 16, right: 16, bottom: 36, left: 42 }
  const width = 720
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const xs = series[0]?.points.map((p) => p.x) ?? []
  const maxY = Math.max(10, ...series.flatMap((s) => s.points.map((p) => p.pct)))
  const yMax = Math.min(100, Math.ceil(maxY / 10) * 10 || 10)

  const xPos = (i: number) => {
    if (xs.length <= 1) return pad.left + innerW / 2
    return pad.left + (i / (xs.length - 1)) * innerW
  }
  const yPos = (pct: number) => pad.top + innerH - (pct / yMax) * innerH

  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax)

  return (
    <div className="line-chart-wrap">
      <svg
        className="line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Gráfico de linhas"
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
            <text x={pad.left - 8} y={yPos(g) + 3} className="line-axis" textAnchor="end">
              {g}%
            </text>
          </g>
        ))}

        {xs.map((label, i) => (
          <text
            key={label}
            x={xPos(i)}
            y={height - 10}
            className="line-axis"
            textAnchor="middle"
          >
            {label}
          </text>
        ))}

        {series.map((s) => {
          const d = s.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(p.pct)}`)
            .join(' ')
          return (
            <g key={s.label}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" />
              {s.points.map((p, i) => (
                <circle
                  key={`${s.label}-${p.x}`}
                  cx={xPos(i)}
                  cy={yPos(p.pct)}
                  r="4"
                  fill={s.color}
                >
                  <title>
                    {s.label}: {p.pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                  </title>
                </circle>
              ))}
            </g>
          )
        })}
      </svg>
      <ul className="line-legend">
        {series.map((s) => (
          <li key={s.label}>
            <span className="line-swatch" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
