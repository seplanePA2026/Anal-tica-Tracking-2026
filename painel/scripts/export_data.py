# Read-only export of interviewee survey fields from the source workbooks.
# Does not modify the Excel files. Researcher and PII columns are omitted.
#
# Tracking rule: all field days stay in the JSON for Temporalidade; the active
# research window is the last TRACKING_WINDOW days (drops the oldest when a
# new day arrives).

from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "BD Pesquisa_Estadual_Bahia_26_oficial.xlsx"
EXTRA_DAYS = [
    ROOT / "09.09 BA.xlsx",
    ROOT / "10.09.xlsx",
]
OUT = Path(__file__).resolve().parents[1] / "public" / "data.json"
TRACKING_WINDOW = 3

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
    # Drop junk columns from form exports.
    out = out.loc[:, [c for c in out.columns if not str(c).startswith("Unnamed")] ]
    for col in out.columns:
        if out[col].dtype == object:
            out[col] = out[col].map(
                lambda v: v.strip() if isinstance(v, str) else v
            )
    return out


def load_workbook(path: Path) -> list[tuple[str, str, pd.DataFrame]]:
    if not path.exists():
        raise SystemExit(f"Planilha não encontrada: {path}")
    out: list[tuple[str, str, pd.DataFrame]] = []
    for sheet in pd.ExcelFile(path).sheet_names:
        if sheet.strip().lower() == "excluido":
            continue
        df = strip_frame(pd.read_excel(path, sheet_name=sheet, dtype=object))
        label = folha_label(sheet)
        df["__folha"] = label
        out.append((path.name, sheet, df))
    return out


def main() -> None:
    packs = load_workbook(SOURCE)
    for extra in EXTRA_DAYS:
        packs.extend(load_workbook(extra))

    # Prefer first occurrence of a folha label (official BD wins over extras).
    by_folha: dict[str, tuple[str, str, pd.DataFrame]] = {}
    for source_name, sheet, df in packs:
        label = str(df["__folha"].iloc[0])
        if label in by_folha:
            print(f"aviso: folha {label} já carregada; ignorando {source_name}/{sheet}")
            continue
        by_folha[label] = (source_name, sheet, df)

    folhas = sorted(by_folha.keys(), key=lambda s: [int(x) for x in s.split(".")])
    if not folhas:
        raise SystemExit("Nenhuma folha válida encontrada.")

    tracking_folhas = folhas[-TRACKING_WINDOW:]
    frames = [by_folha[f][2] for f in folhas]
    sheet_map = [(by_folha[f][1], f) for f in folhas]
    sources = sorted({by_folha[f][0] for f in folhas})

    raw = pd.concat(frames, ignore_index=True)

    keep = [c for c in raw.columns if c not in EXCLUDE]
    rows = []
    for rec in raw[keep].to_dict(orient="records"):
        item = {"folha": cell(rec.pop("__folha"))}
        for k, v in rec.items():
            item[k] = cell(v)
        rows.append(item)

    tracking_mask = raw["__folha"].isin(tracking_folhas)
    raw_tracking = raw.loc[tracking_mask].copy()

    gps = raw_tracking[
        (raw_tracking["Latitude"].notna())
        & (raw_tracking["Longitude"].notna())
        & (raw_tracking["Latitude"] != 0)
        & (raw_tracking["Longitude"] != 0)
    ].copy()
    gps["Latitude"] = pd.to_numeric(gps["Latitude"], errors="coerce")
    gps["Longitude"] = pd.to_numeric(gps["Longitude"], errors="coerce")
    gps = gps[gps["Latitude"].notna() & gps["Longitude"].notna()]

    municipalities = []
    for name, g in raw_tracking.groupby("Municípios", dropna=False):
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

    tracking_rows = [r for r in rows if r.get("folha") in tracking_folhas]
    counts = {}
    for r in tracking_rows:
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

    n_por_folha = {f: int((raw["__folha"] == f).sum()) for f in folhas}
    dropped = [f for f in folhas if f not in tracking_folhas]

    payload = {
        "meta": {
            "sourceFile": " + ".join(sources),
            "sheets": folhas,
            "sheetsRaw": [raw_name for raw_name, _ in sheet_map],
            "trackingFolhas": tracking_folhas,
            "trackingWindow": TRACKING_WINDOW,
            "n": len(tracking_rows),
            "nTemporal": len(rows),
            "nPorFolha": n_por_folha,
            "excludedFields": sorted(EXCLUDE),
            "missingInSource": missing_in_source,
            "notes": [
                "Base regenerada a partir de BD Pesquisa_Estadual_Bahia_26_oficial.xlsx + arquivos diários extras.",
                "Valores copiados da planilha sem alteração, interpolação ou exclusão de entrevistas.",
                "A folha 'excluido' da planilha oficial não entra na visualização.",
                "Campos do pesquisador e dados pessoais do entrevistado não entram na visualização.",
                "Coordenadas do mapa são a mediana do GPS válido de cada município (excluídos pares 0,0).",
                "Nomes de município, categorias e textos de resposta são os da planilha.",
                f"Janela tracking ativa ({TRACKING_WINDOW} dias): {', '.join(tracking_folhas)}.",
                (
                    f"Dias só na Temporalidade (fora da janela ativa): {', '.join(dropped)}."
                    if dropped
                    else "Nenhum dia fora da janela tracking."
                ),
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
    print(f"OK temporal={len(rows)} tracking={len(tracking_rows)} municipios={len(municipalities)} -> {OUT}")
    print("n por folha", n_por_folha)
    print("tracking", tracking_folhas)
    print("sheets", folhas)


if __name__ == "__main__":
    main()
