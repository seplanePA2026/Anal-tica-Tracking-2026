/** Enunciados do QUESTIONÁRIO CODIFICADO TRACKING BAHIA 1 2026. */
export type FieldLabel = {
  code: string
  title: string
  short: string
}

export const FIELD_LABELS: Record<string, FieldLabel> = {
  Municípios: {
    code: '',
    title: 'Município',
    short: 'Município',
  },
  folha: {
    code: '',
    title: 'Folha',
    short: 'Folha',
  },
  dia: {
    code: '',
    title: 'Dia',
    short: 'Dia',
  },
  sexo: {
    code: 'P01',
    title: 'Sexo',
    short: 'Sexo',
  },
  idade: {
    code: 'P02',
    title: 'Idade',
    short: 'Idade',
  },
  'ESTIMULADA PRESIDENTE': {
    code: 'P03',
    title:
      'Em outubro teremos eleição para vários cargos. Mas se a eleição fosse hoje, e os candidatos a presidente fossem esses desse cartão, em quem você votaria para Presidente do Brasil?',
    short: 'Voto para presidente',
  },
  'ESTIMULADA REJEIÇÃO PRESIDENTE cdd': {
    code: 'P04',
    title:
      'E se a eleição fosse hoje e os candidatos fossem esses do cartão, em quem você não votaria de jeito nenhum para Presidente do Brasil?',
    short: 'Rejeição a presidente',
  },
  'enquadramento político': {
    code: 'P05',
    title:
      'Na escala de posições políticas, você diria que se encaixa em qual grupo político?',
    short: 'Enquadramento político',
  },
  'CANDIDATO A GOV DE LULA': {
    code: 'P06',
    title:
      'Pelo que você sabe ou ouviu falar, quem vai ser o candidato apoiado pelo Lula para o governo do Estado da Bahia em 2026?',
    short: 'Candidato de Lula ao governo',
  },
  'CANDIDATO A GOV DE FLAVIO': {
    code: 'P07',
    title:
      'Pelo que você sabe ou ouviu falar, quem vai ser o candidato apoiado pelo Flávio Bolsonaro para o governo do Estado da Bahia em 2026?',
    short: 'Candidato de Flávio ao governo',
  },
  'ESPONTÂNEA GOVERNADOR': {
    code: 'P08',
    title:
      'E se a eleição fosse hoje, em quem você votaria para governador da Bahia?',
    short: 'Voto espontâneo para governador',
  },
  'ESTIMULADA GOVERNADOR': {
    code: 'P09',
    title:
      'E se a eleição fosse hoje, e os candidatos ao governo do estado fossem esses desse cartão, em quem você votaria para governador da Bahia?',
    short: 'Voto para governador',
  },
  'JEROXACM com apoios': {
    code: 'P10',
    title:
      'E se a eleição fosse hoje, e os candidatos ao governo do estado fossem de um lado Jerônimo Rodrigues, com apoio de Lula, Otto Alencar, Wagner e Rui Costa, e do outro ACM Neto, com apoio de Flávio Bolsonaro, Zema e Ronaldo Caiado, em quem você votaria para governador da Bahia?',
    short: 'Jerônimo × ACM Neto com apoios',
  },
  'Conhecimento e voto JERÔNIMO RODRIGUES': {
    code: 'P11',
    title:
      'Dos candidatos a governador que vou citar, você diria que conhece e votaria nele, não conhece, ou conhece e não votaria? — Jerônimo Rodrigues',
    short: 'Conhecimento e voto — Jerônimo',
  },
  'Conhecimento e voto ACM NETO': {
    code: 'P12',
    title:
      'Dos candidatos a governador que vou citar, você diria que conhece e votaria nele, não conhece, ou conhece e não votaria? — ACM Neto',
    short: 'Conhecimento e voto — ACM Neto',
  },
  'Conhecimento e voto RONALDO MANSUR': {
    code: 'P13',
    title:
      'Dos candidatos a governador que vou citar, você diria que conhece e votaria nele, não conhece, ou conhece e não votaria? — Ronaldo Mansur',
    short: 'Conhecimento e voto — Mansur',
  },
  'escolha de voto': {
    code: 'P14',
    title:
      'Você diria que sua escolha de voto para governador é definitiva ou ainda pode mudar caso algo aconteça até as eleições?',
    short: 'Escolha de voto definitiva',
  },
  'lado de governador': {
    code: 'P15',
    title:
      'De modo geral, você gostaria que a pessoa eleita como governador do Estado da Bahia fosse aliada de Lula, aliada de Flávio Bolsonaro ou independente?',
    short: 'Lado do governador eleito',
  },
  'ESTIMULADA SENADOR 1ª OPÇÃO': {
    code: 'P16',
    title:
      'E se a eleição fosse hoje, e os candidatos ao Senado fossem esses desse cartão, em quem você votaria para senador pela Bahia para a primeira vaga?',
    short: 'Voto para senador — 1ª vaga',
  },
  'ESTIMULADA SENADOR  2ª OPÇÃO': {
    code: 'P17',
    title:
      'E se a eleição para senadores pela Bahia fosse hoje e os candidatos fossem esses do cartão, em quem você votaria para a segunda vaga do Senado?',
    short: 'Voto para senador — 2ª vaga',
  },
  'REJEIÇÃO SENADOR': {
    code: 'P18',
    title:
      'E se a eleição fosse hoje e os candidatos fossem esses do cartão, em quem você não votaria de jeito nenhum para senador pela Bahia?',
    short: 'Rejeição a senador',
  },
  'QUEM VAI GANHAR': {
    code: 'P19',
    title:
      'Independentemente de em quem você pretende votar, quem você acha que vai ganhar a eleição para governador da Bahia em 2026?',
    short: 'Quem vai ganhar o governo',
  },
  'candidato que ajudará o município': {
    code: 'P20',
    title:
      'Entre ACM Neto e Jerônimo, qual deles você acha que, se eleito governador, poderá ajudar mais a resolver os problemas que afetam a vida das pessoas neste município?',
    short: 'Quem ajuda mais o município',
  },
  'ACOMPANHAMENTO PROGRAMA': {
    code: 'P21',
    title:
      'Nessa eleição você vai acompanhar ou tem acompanhado o programa eleitoral gratuito?',
    short: 'Acompanha o programa eleitoral',
  },
  'MELHOR PROGRAMA': {
    code: 'P22.1',
    title:
      'Pelo que você tem acompanhado ou visto no programa eleitoral gratuito, qual o candidato que tem o melhor programa?',
    short: 'Melhor programa',
  },
  'MAIS ALEGRE': {
    code: 'P22.2',
    title:
      'Pelo que você tem acompanhado ou visto no programa eleitoral gratuito, qual o candidato que é o mais alegre?',
    short: 'Mais alegre',
  },
  'O QUE TEM A MELHOR MÚSICA JINGLE': {
    code: 'P22.3',
    title:
      'Pelo que você tem acompanhado ou visto no programa eleitoral gratuito, qual o candidato que tem a melhor música/jingle?',
    short: 'Melhor música/jingle',
  },
  'O QUE MAIS ATACA O ADVERSÁRIO': {
    code: 'P22.4',
    title:
      'Pelo que você tem acompanhado ou visto no programa eleitoral gratuito, qual o candidato que mais ataca o adversário?',
    short: 'Mais ataca o adversário',
  },
  'O  MAIS  VERDADEIRO': {
    code: 'P22.5',
    title:
      'Pelo que você tem acompanhado ou visto no programa eleitoral gratuito, qual o candidato que é o mais verdadeiro?',
    short: 'Mais verdadeiro',
  },
  'O QUE APRESENTA AS MELHORES PROPOSTAS': {
    code: 'P22.6',
    title:
      'Pelo que você tem acompanhado ou visto no programa eleitoral gratuito, qual o candidato que apresenta as melhores propostas?',
    short: 'Melhores propostas',
  },
  'aprovação do gov Lula': {
    code: 'P23',
    title:
      'Você aprova ou desaprova o trabalho que o presidente Lula vem fazendo até aqui?',
    short: 'Aprovação do presidente Lula',
  },
  'aval Lula': {
    code: 'P24',
    title:
      'Para você, o presidente Lula está fazendo um governo ótimo, bom, regular, ruim ou péssimo?',
    short: 'Avaliação do governo Lula',
  },
  'aprovação do gov Jerônimo': {
    code: 'P25',
    title:
      'Você aprova ou desaprova o trabalho que o governador Jerônimo vem fazendo até aqui na Bahia?',
    short: 'Aprovação do governador Jerônimo',
  },
  'nota Jerônimo': {
    code: 'P26',
    title:
      'Pensando no trabalho realizado pelo governador Jerônimo Rodrigues até aqui, que nota de 0 a 10 você daria para o governo dele, sendo 0 a pior nota e 10 a melhor nota?',
    short: 'Nota do governo Jerônimo',
  },
  'aprovação do prefeito': {
    code: '',
    title: 'Você aprova ou desaprova o trabalho que o prefeito vem fazendo até aqui?',
    short: 'Aprovação do prefeito',
  },
  religião: {
    code: 'P27',
    title: 'Quando se fala em religião, você professa e se declara…',
    short: 'Religião',
  },
  'frequentou templo': {
    code: 'P28',
    title:
      'Pensando nos últimos dois meses, você frequentou presencialmente alguma igreja, templo, terreiro, centro espírita ou outra instituição religiosa para participar de missa, culto, celebração ou outra atividade religiosa?',
    short: 'Frequentou templo',
  },
  ESCOLARIDADE: {
    code: 'P29',
    title: 'Qual a sua escolaridade? Você estudou até que série?',
    short: 'Escolaridade',
  },
  'renda familiar': {
    code: 'P30',
    title: 'No mês passado, qual foi a sua renda familiar?',
    short: 'Renda familiar',
  },
}

export function fieldLabel(key: string): FieldLabel {
  return (
    FIELD_LABELS[key] ?? {
      code: '',
      title: key,
      short: key,
    }
  )
}

export function fieldHeading(key: string): string {
  const { code, title } = fieldLabel(key)
  return code ? `${code}. ${title}` : title
}

export function fieldColumn(key: string): string {
  const { code, short } = fieldLabel(key)
  return code ? `${code}. ${short}` : short
}

/** Ordem do questionário codificado (P01 → P30), não a ordem temática. */
export const QUESTION_SECTIONS: { id: string; title: string; keys: string[] }[] = [
  {
    id: 'identificacao',
    title: 'P01–P02 · Identificação',
    keys: ['sexo', 'idade'],
  },
  {
    id: 'presidente',
    title: 'P03–P04 · Presidente',
    keys: ['ESTIMULADA PRESIDENTE', 'ESTIMULADA REJEIÇÃO PRESIDENTE cdd'],
  },
  {
    id: 'posicao',
    title: 'P05 · Posição política',
    keys: ['enquadramento político'],
  },
  {
    id: 'governador',
    title: 'P06–P15 · Governo do Estado',
    keys: [
      'CANDIDATO A GOV DE LULA',
      'CANDIDATO A GOV DE FLAVIO',
      'ESPONTÂNEA GOVERNADOR',
      'ESTIMULADA GOVERNADOR',
      'JEROXACM com apoios',
      'Conhecimento e voto JERÔNIMO RODRIGUES',
      'Conhecimento e voto ACM NETO',
      'Conhecimento e voto RONALDO MANSUR',
      'escolha de voto',
      'lado de governador',
    ],
  },
  {
    id: 'senado',
    title: 'P16–P18 · Senado',
    keys: [
      'ESTIMULADA SENADOR 1ª OPÇÃO',
      'ESTIMULADA SENADOR  2ª OPÇÃO',
      'REJEIÇÃO SENADOR',
    ],
  },
  {
    id: 'expectativas',
    title: 'P19–P20 · Expectativas',
    keys: ['QUEM VAI GANHAR', 'candidato que ajudará o município'],
  },
  {
    id: 'programa',
    title: 'P21–P22 · Programa eleitoral',
    keys: [
      'ACOMPANHAMENTO PROGRAMA',
      'MELHOR PROGRAMA',
      'MAIS ALEGRE',
      'O QUE TEM A MELHOR MÚSICA JINGLE',
      'O QUE MAIS ATACA O ADVERSÁRIO',
      'O  MAIS  VERDADEIRO',
      'O QUE APRESENTA AS MELHORES PROPOSTAS',
    ],
  },
  {
    id: 'avaliacao',
    title: 'P23–P26 · Avaliação',
    keys: [
      'aprovação do gov Lula',
      'aval Lula',
      'aprovação do gov Jerônimo',
      'nota Jerônimo',
      'aprovação do prefeito',
    ],
  },
  {
    id: 'perfil',
    title: 'P27–P30 · Perfil',
    keys: ['religião', 'frequentou templo', 'ESCOLARIDADE', 'renda familiar'],
  },
]

export const QUESTION_SEQUENCE = QUESTION_SECTIONS.flatMap((g) => g.keys)
