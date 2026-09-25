export type Row = Record<string, string | null>

export type Municipality = {
  name: string
  n: number
  lat: number | null
  lon: number | null
  nComGpsValido: number
}

export type FieldGroup = {
  id: string
  title: string
  keys: string[]
}

export type Dataset = {
  meta: {
    sourceFile: string
    sheets: string[]
    sheetsRaw?: string[]
    /** Folhas da janela tracking ativa (últimos N dias). */
    trackingFolhas?: string[]
    trackingWindow?: number
    n: number
    nTemporal?: number
    nPorFolha: Record<string, number>
    excludedFields: string[]
    missingInSource: string[]
    notes: string[]
  }
  groups: FieldGroup[]
  municipalities: Municipality[]
  /** Todas as folhas (inclui dias só da Temporalidade). */
  rows: Row[]
}

export const ALL = 'all'
export const EMPTY = '(sem resposta)'

export type Filters = {
  municipio: string
  sexo: string
  idade: string
  escolaridade: string
  religiao: string
  renda: string
  enquadramento: string
  folha: string
  /** Onda de campo (ex.: onda-1 = 06–08, onda-2 = 09–11, onda-3 = 12–…). */
  onda: string
  dia: string
  answerField: string
  answerValue: string
}

export const EMPTY_FILTERS: Filters = {
  municipio: ALL,
  sexo: ALL,
  idade: ALL,
  escolaridade: ALL,
  religiao: ALL,
  renda: ALL,
  enquadramento: ALL,
  folha: ALL,
  onda: ALL,
  dia: ALL,
  answerField: ALL,
  answerValue: ALL,
}

export type ViewId =
  | 'mapa'
  | 'lista'
  | 'tabela'
  | 'relatorio'
  | 'temporalidade'
  | 'acumulador'
