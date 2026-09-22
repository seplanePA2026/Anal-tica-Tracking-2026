/** Ondas da pesquisa tracking: agrupamentos fixos de dias de campo. */

export type ResearchOnda = {
  id: string
  label: string
  /** Ex.: "06/09 · 07/09 · 08/09" */
  daysLabel: string
  folhas: string[]
}

function daySlash(folha: string): string {
  return folha.replace(/\./g, '/')
}

/** Definição das ondas: Onda 1 = 6–8; Onda 2 = 9–11; Onda 3 = 12–14; Onda 4 = 15–17; Onda 5 = 18–20; Onda 6 = 21–… */
export const RESEARCH_ONDAS: ResearchOnda[] = [
  {
    id: 'onda-1',
    label: 'Onda 1',
    folhas: ['06.09', '07.09', '08.09'],
    daysLabel: '06/09 · 07/09 · 08/09',
  },
  {
    id: 'onda-2',
    label: 'Onda 2',
    folhas: ['09.09', '10.09', '11.09'],
    daysLabel: '09/09 · 10/09 · 11/09',
  },
  {
    id: 'onda-3',
    label: 'Onda 3',
    folhas: ['12.09', '13.09', '14.09'],
    daysLabel: '12/09 · 13/09 · 14/09',
  },
  {
    id: 'onda-4',
    label: 'Onda 4',
    folhas: ['15.09', '16.09', '17.09'],
    daysLabel: '15/09 · 16/09 · 17/09',
  },
  {
    id: 'onda-5',
    label: 'Onda 5',
    folhas: ['18.09', '19.09', '20.09'],
    daysLabel: '18/09 · 19/09 · 20/09',
  },
  {
    id: 'onda-6',
    label: 'Onda 6',
    folhas: ['21.09'],
    daysLabel: '21/09',
  },
]

export function findOnda(id: string): ResearchOnda | undefined {
  return RESEARCH_ONDAS.find((o) => o.id === id)
}

/** Só retorna ondas que têm pelo menos uma folha presente nos dados. */
export function availableOndas(sheets: string[]): ResearchOnda[] {
  const set = new Set(sheets)
  return RESEARCH_ONDAS.map((o) => {
    const folhas = o.folhas.filter((f) => set.has(f))
    if (!folhas.length) return null
    return {
      ...o,
      folhas,
      daysLabel: folhas.map(daySlash).join(' · '),
    }
  }).filter((o): o is ResearchOnda => o != null)
}

export function rowsForFolhas<T extends { folha?: string | null }>(
  rows: T[],
  folhas: string[],
): T[] {
  const set = new Set(folhas)
  return rows.filter((r) => r.folha != null && set.has(r.folha))
}
