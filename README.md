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

- Base atual: `BD Pesquisa_Estadual_Bahia_26_.xlsx` (campo 6, 7 e 8 de setembro de 2026).
- Microdados publicados: `painel/public/data.json` (gerado a partir da planilha, sem PII de pesquisador).
- A planilha Excel **não** vai no GitHub.
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
