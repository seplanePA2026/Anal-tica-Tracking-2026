import { useMemo, useState } from 'react'
import {
  BANNER_OPTIONS,
  crosstab,
  formatN,
  formatPctNum,
} from '../stats'
import type { Row } from '../types'

type Props = {
  fieldKey: string
  rows: Row[]
}

const NO_CROSS = new Set([
  'sexo',
  'idade',
  'religião',
  'frequentou templo',
  'ESCOLARIDADE',
  'renda familiar',
])

export function CrossTabPanel({ fieldKey, rows }: Props) {
  const banners = useMemo(
    () => BANNER_OPTIONS.filter((b) => b.key !== fieldKey),
    [fieldKey],
  )
  const [bannerId, setBannerId] = useState<string>(banners[0]?.id ?? 'sexo')
  const banner = banners.find((b) => b.id === bannerId) ?? banners[0]
  const tab = useMemo(
    () => (banner ? crosstab(rows, fieldKey, banner.key) : null),
    [rows, fieldKey, banner],
  )

  if (NO_CROSS.has(fieldKey) || !banner || !tab) return null

  return (
    <div className="cross-card">
      <div className="cross-head">
        <div>
          <p className="kicker">Cruzamento</p>
          <h4>Cruzar respostas por perfil</h4>
        </div>
        <label className="cross-select">
          Banner
          <select
            value={banner.id}
            onChange={(e) => setBannerId(e.target.value)}
          >
            {banners.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-scroll cross-scroll">
        <table className="cross-table">
          <thead>
            <tr>
              <th>Resposta</th>
              {tab.banners.map((b, i) => (
                <th key={b} className="num" title={b}>
                  <span className="cross-ban">{b}</span>
                  <span className="cross-ban-n">N={formatN(tab.bannerN[i] ?? 0)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tab.rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                {r.n.map((n, i) => (
                  <td key={`${r.label}-${i}`} className="num">
                    <span className="cross-cell-n">{formatN(n)}</span>
                    <span className="cross-cell-pct">{formatPctNum(r.pct[i] ?? 0)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
