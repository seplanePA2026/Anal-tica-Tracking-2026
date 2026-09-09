# Read-only export of interviewee survey fields from the source workbook.
# Does not modify the Excel file. Researcher and PII columns are omitted.

from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "BD Pesquisa_Estadual_Bahia_26_oficial.xlsx"
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
        "id": "perfil",
        "title": "Perfil do entrevistado",
        "keys": [
            "sexo",
            "idade",
            "religião",
            "ESCOLARIDADE",
            "renda familiar",
            "frequentou templo",
        ],
    },
    {
        "id": "presidente",
        "title": "Intenção de voto e rejeição a presidência",
        "keys": [
            "ESTIMULADA PRESIDENTE",
            "ESTIMULADA REJEIÇÃO PRESIDENTE cdd",
        ],
    },
    {
        "id": "posicao",
        "title": "Autoidentificação no espectro político",
        "keys": ["enquadramento político"],
    },
    {
        "id": "governador",
        "title": "Corrida ao Governo da Bahia: nomes, apoios e firmeza do voto",
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
        "title": "Intenção e rejeição ao Senado pela Bahia",
        "keys": [
            "ESTIMULADA SENADOR 1ª OPÇÃO",
            "ESTIMULADA SENADOR  2ª OPÇÃO",
            "REJEIÇÃO SENADOR",
        ],
    },
    {
        "id": "expectativas",
        "title": "Expectativas de resultado e impacto local",
        "keys": ["QUEM VAI GANHAR", "candidato que ajudará o município"],
    },
    {
        "id": "programa",
        "title": "Percepção do horário eleitoral e dos programas de TV",
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
        "title": "Avaliação de governo: Lula, Jerônimo e prefeitos",
        "keys": [
            "aprovação do gov Lula",
            "aval Lula",
            "aprovação do gov Jerônimo",
            "nota Jerônimo",
            "aprovação do prefeito",
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


def folha_label(sheet: str) -> str:
    """Normalize sheet tab names like '06.09Corrigido' -> '06.09'."""
    s = sheet.strip()
    m = re.match(r"^(\d{2}\.\d{2})", s, flags=re.IGNORECASE)
    if m:
        return m.group(1)
    return re.sub(r"(?i)corrigido$", "", s).strip() or s


def strip_frame(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for col in out.columns:
        if out[col].dtype == object:
            out[col] = out[col].map(
                lambda v: v.strip() if isinstance(v, str) else v
            )
    return out


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Planilha não encontrada: {SOURCE}")

    frames = []
    sheet_map: list[tuple[str, str]] = []
    sheets_raw = pd.ExcelFile(SOURCE).sheet_names
    for sheet in sheets_raw:
        # Folha auxiliar de registros fora da base oficial.
        if sheet.strip().lower() == "excluido":
            continue
        df = strip_frame(pd.read_excel(SOURCE, sheet_name=sheet, dtype=object))
        label = folha_label(sheet)
        sheet_map.append((sheet, label))
        df["__folha"] = label
        frames.append(df)
    if not frames:
        raise SystemExit("Nenhuma folha válida encontrada na planilha oficial.")
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

    expected_keys = [k for g in FIELD_GROUPS for k in g["keys"]]
    sample_cols = set(rows[0].keys()) if rows else set()
    missing_in_source = [k for k in expected_keys if k not in sample_cols]
    extra_note_missing = ["estado civil"]
    for k in extra_note_missing:
        if k not in missing_in_source:
            missing_in_source.append(k)

    sheets = [label for _, label in sheet_map]
    payload = {
        "meta": {
            "sourceFile": SOURCE.name,
            "sheets": sheets,
            "sheetsRaw": [raw_name for raw_name, _ in sheet_map],
            "n": len(rows),
            "nPorFolha": {s: int((raw["__folha"] == s).sum()) for s in sheets},
            "excludedFields": sorted(EXCLUDE),
            "missingInSource": missing_in_source,
            "notes": [
                "Base definitiva regenerada a partir de BD Pesquisa_Estadual_Bahia_26_oficial.xlsx.",
                "Valores copiados da planilha sem alteração, interpolação ou exclusão de entrevistas.",
                "A folha 'excluido' da planilha oficial não entra na visualização.",
                "Campos do pesquisador e dados pessoais do entrevistado não entram na visualização.",
                "Coordenadas do mapa são a mediana do GPS válido de cada município (excluídos pares 0,0).",
                "Nomes de município, categorias e textos de resposta são os da planilha.",
                "Campo de 6, 7 e 8 de setembro de 2026 (folhas 06.09, 07.09 e 08.09).",
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
    print("sheets", sheets)


if __name__ == "__main__":
    main()
