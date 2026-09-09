import {
  ALL,
  EMPTY,
  type Filters,
  type Municipality,
  type Row,
} from './types'

export const BANNER_OPTIONS = [
  { id: 'sexo', label: 'Sexo', key: 'sexo' },
  { id: 'idade', label: 'Faixa etária', key: 'idade' },
  { id: 'sexo_idade', label: 'Sexo × faixa etária', key: 'sexo_idade' },
  { id: 'ESCOLARIDADE', label: 'Escolaridade', key: 'ESCOLARIDADE' },
  { id: 'religião', label: 'Religião', key: 'religião' },
  { id: 'renda familiar', label: 'Salário mínimo (renda)', key: 'renda familiar' },
  { id: 'enquadramento político', label: 'Enquadramento político', key: 'enquadramento político' },
] as const

const ORDERS: Record<string, string[]> = {
  sexo: ['Feminino', 'Masculino'],
  idade: [
    '16 a 17 anos',
    '18 a 24 anos',
    '25 a 44 anos',
    '45 a 59 anos',
    '60 anos e mais',
  ],
  'aprovação do gov Lula': ['Aprova', 'Desaprova', 'Não sabe', 'Não quis responder'],
  'aprovação do gov Jerônimo': ['Aprova', 'Desaprova', 'Não sabe', 'Não quis responder'],
  'aprovação do prefeito': ['Aprova', 'Desaprova', 'Não sabe', 'Não quis responder'],
  'aval Lula': [
    'Ótimo',
    'Bom',
    'Regular mais para positivo',
    'Regular mais para negativo',
    'Ruim',
    'Péssimo',
    'Não sabe',
    'Não quis responder',
  ],
  'nota Jerônimo': ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1', '0', 'Não sabe', 'Não respondeu'],
  'escolha de voto': ['Definitiva', 'Pode mudar', 'Não sabe', 'Não respondeu'],
  ESCOLARIDADE: [
    'Analfabeto',
    'Primário incompleto (ate 3ª. Serie)',
    'Primário completo (terminou 4ª. Serie)',
    'Ginasial incompleto (de 5ª  a 7ª serie)',
    'Ginasial completo ( terminou 8ª serie)',
    'Colegial incompleto (1º  ano ao 2º ano)',
    'Colegial completo (terminou 3º ano- pré vestibular)',
    'Superior incompleto',
    'Superior completo',
  ],
  'renda familiar': [
    'Até 1 SM (R$ 0,00 a R$ 1.621,00)',
    'De +1 a 2 SM (R$ 1.621,01 a R$ 3.242,00)',
    'De + 2 a 5 SM  (R$ 3.242,01 a R$ 8.105,00)',
    'De +5 a 10 SM (R$ 8.105,01 a R$ 16.210,00)',
    'Mais de 10 Salários Mínimos',
    'Não sabe/ não respondeu',
  ],
  'enquadramento político': [
    'Lulista',
    'Esquerda, não Lulista',
    'Independente',
    'Direita, não Bolsonarista',
    'Bolsonarista',
    'Não sabe/ não respondeu',
  ],
}

export function norm(v: string | null | undefined): string {
  if (v == null || v === '') return EMPTY
  return v
}

function bannerValue(row: Row, key: string): string {
  if (key === 'sexo_idade') {
    return `${norm(row.sexo)} · ${norm(row.idade)}`
  }
  return norm(row[key])
}

export function applyFilters(rows: Row[], f: Filters): Row[] {
  return rows.filter((r) => {
    if (f.municipio !== ALL && r['Municípios'] !== f.municipio) return false
    if (f.sexo !== ALL && r.sexo !== f.sexo) return false
    if (f.idade !== ALL && r.idade !== f.idade) return false
    if (f.escolaridade !== ALL && r.ESCOLARIDADE !== f.escolaridade) return false
    if (f.religiao !== ALL && r['religião'] !== f.religiao) return false
    if (f.renda !== ALL && r['renda familiar'] !== f.renda) return false
    if (f.enquadramento !== ALL && r['enquadramento político'] !== f.enquadramento) {
      return false
    }
    if (f.folha !== ALL && r.folha !== f.folha) return false
    if (f.dia !== ALL && r.dia !== f.dia) return false
    if (f.answerField !== ALL && f.answerValue !== ALL) {
      if (norm(r[f.answerField]) !== f.answerValue) return false
    }
    return true
  })
}

export function uniqueValues(rows: Row[], key: string): string[] {
  const set = new Set<string>()
  for (const r of rows) set.add(norm(r[key]))
  return sortLabels([...set], key)
}

export function sortLabels(labels: string[], key?: string): string[] {
  const empty = labels.filter((l) => l === EMPTY)
  const rest = labels.filter((l) => l !== EMPTY)
  const pref = key ? ORDERS[key] : undefined
  if (pref) {
    const set = new Set(rest)
    const ordered = pref.filter((p) => set.has(p))
    const extra = rest
      .filter((l) => !pref.includes(l))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    return [...ordered, ...extra, ...empty]
  }
  return [
    ...rest.sort((a, b) => a.localeCompare(b, 'pt-BR')),
    ...empty,
  ]
}

export type CountRow = { label: string; n: number; pct: number }

export function hasEmptyAnswers(rows: Row[], key: string): boolean {
  return rows.some((r) => norm(r[key]) === EMPTY)
}

/** Linhas com resposta efetiva (exclui células vazias → "(sem resposta)"). */
export function answeredRows(rows: Row[], key: string): Row[] {
  return rows.filter((r) => norm(r[key]) !== EMPTY)
}

export function countBy(
  rows: Row[],
  key: string,
  opts?: { excludeEmpty?: boolean },
): { total: number; rows: CountRow[]; skippedEmpty: number } {
  const excludeEmpty = Boolean(opts?.excludeEmpty)
  const map = new Map<string, number>()
  let skippedEmpty = 0
  for (const r of rows) {
    const k = norm(r[key])
    if (excludeEmpty && k === EMPTY) {
      skippedEmpty += 1
      continue
    }
    map.set(k, (map.get(k) || 0) + 1)
  }
  const total = [...map.values()].reduce((s, n) => s + n, 0)
  const labels = [...map.keys()]
  const pref = ORDERS[key]
  labels.sort((a, b) => {
    if (a === EMPTY) return 1
    if (b === EMPTY) return -1
    const na = map.get(a) || 0
    const nb = map.get(b) || 0
    if (pref) {
      const ia = pref.indexOf(a)
      const ib = pref.indexOf(b)
      if (ia !== -1 || ib !== -1) {
        if (ia === -1) return 1
        if (ib === -1) return -1
        return ia - ib
      }
    }
    if (nb !== na) return nb - na
    return a.localeCompare(b, 'pt-BR')
  })
  return {
    total,
    skippedEmpty,
    rows: labels.map((label) => {
      const n = map.get(label) || 0
      return { label, n, pct: total ? (n / total) * 100 : 0 }
    }),
  }
}

export function leading(rows: Row[], key: string): CountRow | null {
  const { rows: dist } = countBy(rows, key)
  const ranked = [...dist]
    .filter((r) => r.label !== EMPTY)
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'pt-BR'))
  return ranked[0] ?? null
}

export type CrossTab = {
  banners: string[]
  bannerN: number[]
  rows: { label: string; n: number[]; pct: number[] }[]
  total: number
}

export function crosstab(rows: Row[], question: string, bannerKey: string): CrossTab {
  const bannerNs = new Map<string, number>()
  const cells = new Map<string, Map<string, number>>()
  const answers = new Map<string, number>()

  for (const r of rows) {
    const b = bannerValue(r, bannerKey)
    const a = norm(r[question])
    bannerNs.set(b, (bannerNs.get(b) || 0) + 1)
    answers.set(a, (answers.get(a) || 0) + 1)
    if (!cells.has(a)) cells.set(a, new Map())
    const row = cells.get(a)!
    row.set(b, (row.get(b) || 0) + 1)
  }

  const banners = sortLabels(
    [...bannerNs.keys()].filter((b) => (bannerNs.get(b) || 0) > 0),
    bannerKey === 'sexo_idade' ? undefined : bannerKey,
  )
  if (bannerKey === 'sexo_idade') {
    const sexOrder = ORDERS.sexo
    const ageOrder = ORDERS.idade
    banners.sort((a, b) => {
      if (a === EMPTY) return 1
      if (b === EMPTY) return -1
      const [sa, aa] = a.split(' · ')
      const [sb, ab] = b.split(' · ')
      const si = sexOrder.indexOf(sa)
      const sj = sexOrder.indexOf(sb)
      if (si !== sj) return (si === -1 ? 99 : si) - (sj === -1 ? 99 : sj)
      const ai = ageOrder.indexOf(aa)
      const aj = ageOrder.indexOf(ab)
      return (ai === -1 ? 99 : ai) - (aj === -1 ? 99 : aj)
    })
  }

  const answerLabels = [...answers.keys()]
  answerLabels.sort((a, b) => {
    if (a === EMPTY) return 1
    if (b === EMPTY) return -1
    const pref = ORDERS[question]
    if (pref) {
      const ia = pref.indexOf(a)
      const ib = pref.indexOf(b)
      if (ia !== -1 || ib !== -1) {
        if (ia === -1) return 1
        if (ib === -1) return -1
        return ia - ib
      }
    }
    const na = answers.get(a) || 0
    const nb = answers.get(b) || 0
    if (nb !== na) return nb - na
    return a.localeCompare(b, 'pt-BR')
  })

  return {
    banners,
    bannerN: banners.map((b) => bannerNs.get(b) || 0),
    rows: answerLabels.map((label) => {
      const n = banners.map((b) => cells.get(label)?.get(b) || 0)
      const pct = n.map((v, i) => {
        const den = bannerNs.get(banners[i]) || 0
        return den ? (v / den) * 100 : 0
      })
      return { label, n, pct }
    }),
    total: rows.length,
  }
}

export function meanScore(rows: Row[], key: string) {
  const nums: number[] = []
  let skipped = 0
  for (const r of rows) {
    const v = r[key]
    if (v == null || v === '') {
      skipped += 1
      continue
    }
    if (/^-?\d+$/.test(v)) nums.push(Number(v))
    else skipped += 1
  }
  const mean = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
  return { mean, n: nums.length, skipped }
}

export function share(rows: Row[], key: string, value: string): { n: number; pct: number } {
  const n = rows.filter((r) => r[key] === value).length
  return { n, pct: rows.length ? (n / rows.length) * 100 : 0 }
}

export function formatN(n: number): string {
  return n.toLocaleString('pt-BR')
}

export function formatPct(n: number, total: number): string {
  if (!total) return '—'
  return `${((n / total) * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

export function formatPctNum(pct: number): string {
  return `${pct.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

export function formatMean(mean: number | null): string {
  if (mean == null) return '—'
  return mean.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export type MunRow = {
  name: string
  n: number
  feminino: number
  lula: number
  flavio: number
  jeronimo: number
  acm: number
  aprovaLula: number
  aprovaJero: number
  nota: number | null
  notaN: number
}

export function municipalityTable(rows: Row[], municipalities: Municipality[]): MunRow[] {
  const byMun = new Map<string, Row[]>()
  for (const r of rows) {
    const name = r['Municípios'] || EMPTY
    if (!byMun.has(name)) byMun.set(name, [])
    byMun.get(name)!.push(r)
  }
  const names = municipalities.map((m) => m.name)
  for (const name of byMun.keys()) {
    if (!names.includes(name)) names.push(name)
  }
  return names
    .map((name) => {
      const sub = byMun.get(name) || []
      const n = sub.length
      const nota = meanScore(sub, 'nota Jerônimo')
      return {
        name,
        n,
        feminino: n ? share(sub, 'sexo', 'Feminino').pct : 0,
        lula: n ? share(sub, 'ESTIMULADA PRESIDENTE', 'Lula (PT)').pct : 0,
        flavio: n ? share(sub, 'ESTIMULADA PRESIDENTE', 'Flávio Bolsonaro (PL)').pct : 0,
        jeronimo: n ? share(sub, 'ESTIMULADA GOVERNADOR', 'Jerônimo Rodrigues (PT)').pct : 0,
        acm: n ? share(sub, 'ESTIMULADA GOVERNADOR', 'ACM Neto (UNIÃO BRASIL)').pct : 0,
        aprovaLula: n ? share(sub, 'aprovação do gov Lula', 'Aprova').pct : 0,
        aprovaJero: n ? share(sub, 'aprovação do gov Jerônimo', 'Aprova').pct : 0,
        nota: nota.mean,
        notaN: nota.n,
      }
    })
    .filter((r) => r.n > 0)
}

export function colorFor(label: string): string {
  const known: Record<string, string> = {
    'Lula (PT)': '#E53935',
    'Flávio Bolsonaro (PL)': '#1E88E5',
    'Jerônimo Rodrigues (PT)': '#C62828',
    'Jerônimo Rodrigues': '#C62828',
    'ACM Neto (UNIÃO BRASIL)': '#1565C0',
    'ACM Neto': '#1565C0',
    'ACM Neto (União Brasil': '#1565C0',
    'Ronaldo Mansur': '#00897B',
    'Ronaldo Mansur (MDB)': '#00897B',
    Aprova: '#2E7D32',
    Desaprova: '#D32F2F',
    Ótimo: '#2E7D32',
    Bom: '#66BB6A',
    'Regular mais para positivo': '#9CCC65',
    'Regular mais para negativo': '#FFA726',
    Ruim: '#EF6C00',
    Péssimo: '#BF360C',
    Feminino: '#AB47BC',
    Masculino: '#1E88E5',
    Definitiva: '#2E7D32',
    'Pode mudar': '#FB8C00',
    'Conhece e vota': '#2E7D32',
    'Conhece e não vota': '#FB8C00',
    'Não o conhece': '#78909C',
    'Aliada de Lula': '#E53935',
    'Aliada de Flávio Bolsonaro': '#1E88E5',
    Independente: '#546E7A',
    Lulista: '#E53935',
    Bolsonarista: '#1E88E5',
    'Branco/Nulo': '#607D8B',
    'Não sabe': '#9E9E9E',
    'Não sabe / Não respondeu': '#9E9E9E',
  }
  if (known[label]) return known[label]
  if (label === EMPTY) return '#B0BEC5'
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h * 33 + label.charCodeAt(i)) >>> 0
  const palette = [
    '#E53935',
    '#1E88E5',
    '#43A047',
    '#FB8C00',
    '#8E24AA',
    '#00ACC1',
    '#F9A825',
    '#EC407A',
    '#3949AB',
    '#6D4C41',
    '#00897B',
    '#7CB342',
  ]
  return palette[h % palette.length]
}
