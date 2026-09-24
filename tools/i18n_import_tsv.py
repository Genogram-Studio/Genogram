#!/usr/bin/env python3
"""번역 초안(번호<TAB>번역) 파일을 언어팩 locales/<code>.json에 합친다.
번호는 i18n/catalog.json의 1단계(tier 1) 문구 순서다 — 이 도구는 초안을 처음 채울 때 쓴다(이후 검수는 엑셀로: tools/i18n_xlsx.py).
  사용: python3 tools/i18n_import_tsv.py fr 0.tsv 1.tsv …
검사: {a}·{n} 같은 자리 표시가 영어와 같은지, 앞뒤 공백을 지켰는지, 번호 누락·중복이 없는지."""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SEP = "\u0001"
META = {
    "fr": {"code": "fr", "label": "Français", "htmlLang": "fr", "order": 3},
    "th": {"code": "th", "label": "ภาษาไทย", "htmlLang": "th", "order": 4},
    "km": {"code": "km", "label": "ភាសាខ្មែរ", "htmlLang": "km", "order": 5},
}
PH = re.compile(r"\{[a-z]+\}")

def key_of(e):
    return e["en"] + SEP + e["ko"] if e["ambiguous"] else e["en"]

def main():
    code, files = sys.argv[1], sys.argv[2:]
    cat = json.load(open(ROOT / "i18n/catalog.json", encoding="utf-8"))["items"]
    tier1 = [e for e in cat if e["tier"] == 1]
    path = ROOT / "locales" / f"{code}.json"
    pack = json.load(open(path, encoding="utf-8")) if path.exists() else {"meta": dict(META.get(code, {"code": code, "label": code, "htmlLang": code, "order": 9})), "strings": {}}
    seen, problems, added = set(), [], 0
    for f in files:
        for line in open(f, encoding="utf-8").read().split("\n"):
            if not line.strip():
                continue
            n, _, text = line.partition("\t")
            n = int(n)
            if n in seen:
                problems.append(f"번호 {n} 중복")
            seen.add(n)
            e = tier1[n]
            en = e["en"]
            # 영어의 앞뒤 공백을 그대로 지킨다
            lead = re.match(r"\s*", en).group(0); trail = re.search(r"\s*$", en).group(0)
            text = lead + text.strip() + trail
            if sorted(PH.findall(en)) != sorted(PH.findall(text)):
                problems.append(f"{n} 자리표시 불일치: {en!r} → {text!r}")
            if not text.strip():
                problems.append(f"{n} 비어 있음")
                continue
            pack["strings"][key_of(e)] = text
            added += 1
    missing = [i for i in range(len(tier1)) if i not in seen and files]
    pack["meta"]["status"] = "draft"
    path.parent.mkdir(exist_ok=True)
    json.dump(pack, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=False)
    print(f"{code}: {added}개 반영 · 팩 전체 {len(pack['strings'])}개 · 문제 {len(problems)}건")
    for p in problems[:20]:
        print("  !", p)

main()
