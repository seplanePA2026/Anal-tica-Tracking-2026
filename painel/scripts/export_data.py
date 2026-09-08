# Read-only export of interviewee survey fields from the source workbook.
# Does not modify the Excel file. Researcher and PII columns are omitted.

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "Pesquisa_Estadual_Bahia_26_06 e 07 de set.xlsx"
OUT = Path(__file__).resolve().parents[1] / "public" / "data.json"

EXCLUDE = {
    "Autor",
    "Data início",
    "Data fim",
    "Duração",
    "Latitude",
    "Longitude",
    "Nome",
    "Endereço",
    "Bairro",
    "telefone",
    "audios_urls",
}

FIELD_GROUPS = [
    {
        "id": "identificacao",
        "title": "P01–P02 · Identificação",
        "keys": ["sexo", "idade"],
    },
    {
        "id": "presidente",
        "title": "P03–P04 · Presidente",
        "keys": [
            "ESTIMULADA PRESIDENTE",
            "ESTIMULADA REJEIÇÃO PRESIDENTE cdd",
        ],
    },
    {
        "id": "posicao",
        "title": "P05 · Posição política",
        "keys": ["enquadramento político"],
    },
    {
        "id": "governador",
        "title": "P06–P15 · Governo do Estado",
        "keys": [
            "CANDIDATO A GOV DE LULA",
            "CANDIDATO A GOV DE FLAVIO",
            "ESPONTÂNEA GOVERNADOR",
            "ESTIMULADA GOVERNADOR",
            "JEROXACM com apoios",
            "Conhecimento e voto JERÔNIMO RODRIGUES",
            "Conhecimento e voto ACM NETO",
            "Conhecimento e voto RONALDO MANSUR",
            "escolha de voto",
            "lado de governador",
        ],
    },
    {
        "id": "senado",
        "title": "P16–P18 · Senado",
        "keys": [
            "ESTIMULADA SENADOR 1ª OPÇÃO",
            "ESTIMULADA SENADOR  2ª OPÇÃO",
            "REJEIÇÃO SENADOR",
        ],
    },
    {
        "id": "expectativas",
        "title": "P19–P20 · Expectativas",
        "keys": ["QUEM VAI GANHAR", "candidato que ajudará o município"],
    },
    {
        "id": "programa",
        "title": "P21–P22 · Programa eleitoral",
        "keys": [
            "ACOMPANHAMENTO PROGRAMA",
            "MELHOR PROGRAMA",
            "MAIS ALEGRE",
            "O QUE TEM A MELHOR MÚSICA JINGLE",
            "O QUE MAIS ATACA O ADVERSÁRIO",
            "O  MAIS  VERDADEIRO",
            "O QUE APRESENTA AS MELHORES PROPOSTAS",
        ],
    },
    {
        "id": "avaliacao",
        "title": "P23–P26 · Avaliação",
        "keys": [
            "aprovação do gov Lula",
            "aval Lula",
            "aprovação do gov Jerônimo",
            "nota Jerônimo",
            "aprovação do prefeito",
        ],
    },
    {
        "id": "perfil",
        "title": "P27–P30 · Perfil",
        "keys": [
            "religião",
            "frequentou templo",
            "ESCOLARIDADE",
            "renda familiar",
        ],
    },
]


def cell(v):
    if v is None:
        return None
    if isinstance(v, float) and (np.isnan(v) or pd.isna(v)):
        return None
    try:
        if pd.isna(v):
            return None
    except Exception:
        pass
    if isinstance(v, str):
        s = v.strip()
        return s if s else None
    if isinstance(v, (np.integer, int)):
        return str(int(v))
    if isinstance(v, (np.floating, float)):
        if float(v).is_integer():
            return str(int(v))
        return str(v)
    s = str(v).strip()
    return s if s else None


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Planilha não encontrada: {SOURCE}")

    frames = []
    sheets = pd.ExcelFile(SOURCE).sheet_names
    for sheet in sheets:
        df = pd.read_excel(SOURCE, sheet_name=sheet, dtype=object)
        df["__folha"] = sheet
        frames.append(df)
    raw = pd.concat(frames, ignore_index=True)

    keep = [c for c in raw.columns if c not in EXCLUDE]
    rows = []
    for rec in raw[keep].to_dict(orient="records"):
        item = {"folha": cell(rec.pop("__folha"))}
        for k, v in rec.items():
            item[k] = cell(v)
        rows.append(item)

    gps = raw[
        (raw["Latitude"].notna())
        & (raw["Longitude"].notna())
        & (raw["Latitude"] != 0)
        & (raw["Longitude"] != 0)
    ].copy()
    gps["Latitude"] = pd.to_numeric(gps["Latitude"], errors="coerce")
    gps["Longitude"] = pd.to_numeric(gps["Longitude"], errors="coerce")
    gps = gps[gps["Latitude"].notna() & gps["Longitude"].notna()]

    municipalities = []
    for name, g in raw.groupby("Municípios", dropna=False):
        sub = gps[gps["Municípios"] == name]
        municipalities.append(
            {
                "name": str(name),
                "n": int(len(g)),
                "lat": float(sub["Latitude"].median()) if len(sub) else None,
                "lon": float(sub["Longitude"].median()) if len(sub) else None,
                "nComGpsValido": int(len(sub)),
            }
        )
    municipalities.sort(key=lambda m: (-m["n"], m["name"]))

    counts = {}
    for r in rows:
        mun = r.get("Municípios") or "(vazio)"
        counts[mun] = counts.get(mun, 0) + 1
    for m in municipalities:
        if m["n"] != counts.get(m["name"], 0):
            raise SystemExit(f"Inconsistência de N em {m['name']}")

    payload = {
        "meta": {
            "sourceFile": SOURCE.name,
            "sheets": sheets,
            "n": len(rows),
            "nPorFolha": {s: int((raw["__folha"] == s).sum()) for s in sheets},
            "excludedFields": sorted(EXCLUDE),
            "missingInSource": ["estado civil"],
            "notes": [
                "Valores copiados da planilha sem alteração, interpolação ou exclusão de entrevistas.",
                "Campos do pesquisador e dados pessoais do entrevistado não entram na visualização.",
                "Coordenadas do mapa são a mediana do GPS válido de cada município (excluídos pares 0,0).",
                "Nomes de município, categorias e textos de resposta são os da planilha.",
                "O campo estado civil não existe na planilha e não foi criado.",
            ],
        },
        "groups": FIELD_GROUPS,
        "municipalities": municipalities,
        "rows": rows,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"OK n={len(rows)} municipios={len(municipalities)} -> {OUT}")
    print("n por folha", payload["meta"]["nPorFolha"])


if __name__ == "__main__":
    main()
