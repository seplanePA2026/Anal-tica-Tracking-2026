# analítica.tracking

Painel da pesquisa **Tracking Bahia 1 2026** (mapa, relatórios, tabelas e PDF).

## Desenvolvimento local

```bash
cd painel
npm install
npm run dev
```

Abra `http://127.0.0.1:5173/` (login → lobby → painel).

## Build

```bash
cd painel
npm run build
```

Saída em `painel/dist/` (`index.html` + `painel.html`).

## Deploy Cloudflare (Workers Static Assets)

```bash
cd painel
npm run deploy
```

Domínio de produção: **https://analiticapesquisas.com**

Worker: `analitica-tracking`

## Dados

- Base oficial: `BD Pesquisa_Estadual_Bahia_26_oficial.xlsx` (campo 6, 7 e 8 de setembro de 2026).
- Dias extras: `09.09 BA.xlsx`, `10.09.xlsx`, `11.09.xlsx`, `12.09.xlsx`, `13.09.xlsx`, `14.09.xlsx` (janela tracking = últimos 3 dias).
- Ondas: Onda 1 = 06–08; Onda 2 = 09–11; Onda 3 = 12–14.
- Microdados publicados: `painel/public/data.json` (gerado a partir da planilha, sem PII de pesquisador).
- A planilha Excel **não** vai no GitHub.
- A folha `excluido` da planilha oficial não entra no JSON.
- Regenerar JSON (local, com a planilha na pasta pai):

```bash
cd painel
npm run export-data
```

## Estrutura

| Caminho | Função |
|---------|--------|
| `index.html` | Login + lobby de pesquisas |
| `painel.html` | Dashboard (mapa / relatórios / tabelas) |
| `wrangler.jsonc` | Deploy Cloudflare + domínio customizado |
| `src/` | App React + TypeScript |
