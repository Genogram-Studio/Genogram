#!/usr/bin/env python3
"""용어집 ↔ 엑셀 변환 (검수용).
  python3 tools/glossary_xlsx.py export [out.xlsx]   glossary.js → 검수 시트(기본 glossary/glossary_review.xlsx)
  python3 tools/glossary_xlsx.py import in.xlsx      검수한 시트 → glossary.js의 자동 구간(TRANSLATIONS·EXTRA_TERMS)
  python3 tools/glossary_xlsx.py seed drafts.json    초안 JSON({id:{fr,th,km,alt_fr}}) → 자동 구간(전부 '초안')
가져오기 규칙
  · 프랑스어·태국어·크메르어 칸과 '다른 표기(불어)'만 반영한다. 한국어·English·中文 칸이 glossary.js와 다르면 목록으로만 알려 준다(자동으로 바꾸지 않는다).
  · 검수 칸이 '확인'이면 ok(강제 적용), 그 밖이면 draft(권장어로만 전달).
  · 엑셀에 없는 항목은 그대로 둔다. glossary.js에 없는 ID가 새 행으로 들어오면 EXTRA_TERMS에 추가한다.
  · alt(다른 표기)·notFollowedBy·hint·desc·verify는 glossary.js 원본이 그대로 유지된다(엑셀에서 hint만 새 용어에 쓴다)."""
import json, re, subprocess, sys, pathlib
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

ROOT = pathlib.Path(__file__).resolve().parent.parent
GJS = ROOT / "glossary/glossary.js"
DEFAULT_XLSX = ROOT / "glossary/glossary_review.xlsx"
CAT = {"bowen": "보웬 이론", "structure": "가족 구조·역동", "genogram": "가계도 표기", "relation": "관계선", "therapy": "상담·평가", "culture": "문화", "user": "사용자 추가"}
CAT_REV = {v: k for k, v in CAT.items()}
FROM = {"app": "앱 기존 용어", "book": "원고·강의안", "lecture": "강의교안(박인숙)", "draft": "이번 보충 초안", "user": "사용자 추가"}
LANGS3 = ["fr", "th", "km"]
HDR = ["ID", "분류", "한국어", "English", "中文(繁體)", "Français", "ไทย (태국어)", "ខ្មែរ (크메르어)", "검수(불)", "검수(태)", "검수(크)",
       "다른 표기(한국어)", "다른 표기(불어)", "출처", "중국어 검수", "모호어(LLM만)", "메모 / 모델 주의사항", "화면 설명"]
OK_WORDS = {"확인", "ok", "✓", "✔", "검수완료", "검수 완료", "o", "완료"}

def dump():
    out = subprocess.run(["node", str(ROOT / "tools/dump-glossary.mjs")], capture_output=True, check=True, cwd=ROOT).stdout
    return json.loads(out.decode("utf-8"))

def base_ids():
    return re.findall(r'^\s*t\("([^"]+)"', GJS.read_text(encoding="utf-8"), re.M)

def read_blocks():
    s = GJS.read_text(encoding="utf-8")
    ns = {}
    for name in ("translations", "extra"):
        m = re.search(r"/\* <<AUTO:%s[^\n]*\n(.*?)/\* AUTO:%s>> \*/" % (name, name), s, re.S)
        assert m, f"자동 구간 {name}을 찾지 못했습니다"
    return s

def write_blocks(translations, extra):
    s = GJS.read_text(encoding="utf-8")
    order = base_ids()
    lines = []
    for i in order:
        x = translations.get(i)
        if not x:
            continue
        parts = []
        for l in LANGS3:
            parts.append(f'{l}: {json.dumps(x.get(l, ""), ensure_ascii=False)}')
        if x.get("alt"):
            parts.append("alt: " + json.dumps(x["alt"], ensure_ascii=False))
        parts.append("review: " + json.dumps(x.get("review", {}), ensure_ascii=False))
        lines.append(f'  {json.dumps(i)}: {{ {", ".join(parts)} }},')
    tr_block = "const TRANSLATIONS = {\n" + "\n".join(lines) + ("\n" if lines else "") + "};\n"
    ex_lines = [f"  {json.dumps(e, ensure_ascii=False)}," for e in extra]
    ex_block = "const EXTRA_TERMS = [\n" + "\n".join(ex_lines) + ("\n" if ex_lines else "") + "];\n"
    def sub(name, block, text):
        pat = re.compile(r"(/\* <<AUTO:%s[^\n]*\n).*?(/\* AUTO:%s>> \*/)" % (name, name), re.S)
        assert pat.search(text), name
        return pat.sub(lambda m: m.group(1) + block + m.group(2), text)
    s = sub("translations", tr_block, s)
    s = sub("extra", ex_block, s)
    GJS.write_text(s, encoding="utf-8")

def current_state():
    ids = set(base_ids())
    entries = dump()
    translations, extra = {}, []
    for e in entries:
        if e["id"] in ids:
            if any(e.get(l) for l in LANGS3):
                translations[e["id"]] = {**{l: e.get(l, "") for l in LANGS3}, "alt": {k: v for k, v in (e.get("alt") or {}).items() if k in LANGS3}, "review": e.get("review") or {}}
        else:
            extra.append({k: e[k] for k in ("id", "cat", "ko", "en", "zh", "fr", "th", "km", "from", "alt", "ambiguous", "hint", "desc", "review") if k in e})
    return entries, translations, extra

def cmd_seed(path):
    drafts = json.load(open(path, encoding="utf-8"))
    _, translations, extra = current_state()
    ids = set(base_ids())
    for i, d in drafts.items():
        assert i in ids, f"알 수 없는 ID {i}"
        x = {l: d.get(l, "").strip() for l in LANGS3}
        alt = {"fr": d["alt_fr"]} if d.get("alt_fr") else {}
        x["alt"] = alt
        x["review"] = {l: "draft" for l in LANGS3 if x[l]}
        translations[i] = x
    write_blocks(translations, extra)
    print(f"초안 {len(drafts)}개 반영")

def cmd_export(out):
    entries = dump()
    wb = Workbook()
    ws0 = wb.active; ws0.title = "사용법"
    usage = [
        ("상담 용어집 검수 시트 (v0.4 · glossary.js에서 다시 만든 시트)", True),
        (f"총 {len(entries)}개 항목 · 언어: 한국어 / English / 中文(繁體) / Français / ไทย / ខ្មែរ", False),
        ("", False),
        ("무엇을 하나요", True),
        ("1. 노란 칸(프랑스어·태국어·크메르어)은 제가 쓴 초안입니다. 현장에서 실제로 쓰는 용어로 고쳐 주세요. 한 칸에 번역어 하나만, 설명이나 괄호 없이 용어만 적습니다.", False),
        ("2. 맞다고 확인한 줄은 오른쪽 '검수' 칸을 '확인'으로 바꿉니다. '초안'으로 남은 용어는 번역 모델에 '권장어'로만 전달되고 강제되지 않습니다. '확인'이 되면 그때부터 지정 용어로 강제됩니다.", False),
        ("3. 같은 뜻의 다른 표기는 '다른 표기' 칸에 쉼표로 적습니다(원문에서 이 표기도 같은 용어로 인식합니다).", False),
        ("4. 새 용어는 맨 아래 행에 추가하세요(ID는 영어 소문자와 하이픈, 예: new-term). 한국어·English는 꼭 적습니다.", False),
        ("5. 다 하신 뒤 이 파일을 다시 올려 주시면 glossary.js에 반영합니다. 한국어·English·中文 칸을 고치셨다면 반영 전에 목록으로 알려 드립니다.", False),
        ("", False),
        ("열 설명", True),
        ("출처: 앱 기존 용어 = 지금 앱 화면에 쓰이는 표현 / 원고·강의안 = 책 원고와 강의안의 한·영 병기 용어 / 강의교안(박인숙) = 가족심리상담사 강의교안에서 확인한 용어 / 이번 보충 초안 = 제가 추가한 것(검수 우선).", False),
        ("모호어(LLM만): 일상어와 겹쳐 오해하기 쉬운 용어입니다. GPT에는 주의사항과 함께 전달하고, DeepL 용어집에는 넣지 않습니다.", False),
        ("중국어 검수: 제가 보충한 번체 표현이라 대만 상담 현장 용어와 맞는지 확인이 필요한 줄입니다.", False),
        ("", False),
        ("참고", True),
        ("· 이 시트는 이전 시트(v0.2, 79개)를 대체합니다. 강의교안에서 늘어난 15개와 '동맹/연합' 결정이 반영되어 있습니다.", False),
        ("· 태국어·크메르어는 보웬 이론 용어의 정착된 번역어가 없는 경우가 많습니다. 초안은 서술형으로 옮긴 것이므로 현지 상담자들이 쓰는 용어로 덮어써 주세요.", False),
    ]
    for r, (t, bold) in enumerate(usage, 1):
        c = ws0.cell(row=r, column=1, value=t); c.font = Font(bold=bold, size=13 if r == 1 else 11); c.alignment = Alignment(wrap_text=True, vertical="top")
    ws0.column_dimensions["A"].width = 120
    ws = wb.create_sheet("용어집")
    ws.append(HDR)
    yellow = PatternFill("solid", fgColor="FFF4C2"); pink = PatternFill("solid", fgColor="FBE0E4"); head = PatternFill("solid", fgColor="D9E2F3"); grey = PatternFill("solid", fgColor="F2F2F2")
    for c in ws[1]:
        c.font = Font(bold=True); c.fill = head; c.alignment = Alignment(wrap_text=True, vertical="center")
    for e in entries:
        alt = e.get("alt") or {}
        rev = e.get("review") or {}
        row = [e["id"], CAT.get(e["cat"], e["cat"]), e["ko"], e["en"], e.get("zh", ""), e.get("fr", ""), e.get("th", ""), e.get("km", ""),
               ("확인" if rev.get("fr") == "ok" else "초안") if e.get("fr") else "", ("확인" if rev.get("th") == "ok" else "초안") if e.get("th") else "", ("확인" if rev.get("km") == "ok" else "초안") if e.get("km") else "",
               ", ".join(alt.get("ko", [])), ", ".join(alt.get("fr", [])), FROM.get(e.get("from"), e.get("from", "")), "확인" if "zh" in (e.get("verify") or []) else "",
               "예" if e.get("ambiguous") else "", e.get("hint", ""), e.get("desc", "")]
        ws.append(row)
        r = ws.max_row
        for col in (6, 7, 8): ws.cell(row=r, column=col).fill = yellow
        if row[14]: ws.cell(row=r, column=5).fill = pink
        for col in (1, 2, 3, 4, 14): ws.cell(row=r, column=col).fill = grey
    widths = [20, 14, 20, 30, 20, 30, 30, 30, 8, 8, 8, 26, 26, 16, 10, 10, 40, 34]
    for i, w in enumerate(widths, 1): ws.column_dimensions[get_column_letter(i)].width = w
    for row in ws.iter_rows(min_row=2):
        for c in row: c.alignment = Alignment(wrap_text=True, vertical="top")
    dv = DataValidation(type="list", formula1='"초안,확인"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"I2:K{ws.max_row + 200}")
    ws.freeze_panes = "D2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(HDR))}{ws.max_row}"
    out = pathlib.Path(out or DEFAULT_XLSX)
    wb.save(out)
    print(f"{out} — {len(entries)}행")

def cmd_import(path):
    entries, translations, extra = current_state()
    by_id = {e["id"]: e for e in entries}
    base = set(base_ids())
    ws = load_workbook(path, data_only=True)["용어집"]
    hdr = [c.value for c in ws[1]]
    col = {h: i for i, h in enumerate(hdr)}
    for need in ("ID", "한국어", "English", "Français", "ไทย (태국어)", "ខ្មែរ (크메르어)"):
        assert need in col, f"열 '{need}'이 없습니다 — tools/glossary_xlsx.py export로 만든 시트를 쓰세요"
    def cell(row, name):
        i = col.get(name)
        v = row[i] if i is not None and i < len(row) else None
        return ("" if v is None else str(v)).strip()
    changed, added, kodiff, warns = 0, 0, [], []
    extra_by = {e["id"]: e for e in extra}
    for row in ws.iter_rows(min_row=2, values_only=True):
        i = cell(row, "ID")
        if not i: continue
        tx = {"fr": cell(row, "Français"), "th": cell(row, "ไทย (태국어)"), "km": cell(row, "ខ្មែរ (크메르어)")}
        st = {"fr": cell(row, "검수(불)"), "th": cell(row, "검수(태)"), "km": cell(row, "검수(크)")}
        review = {l: ("ok" if st[l].lower() in OK_WORDS else "draft") for l in LANGS3 if tx[l]}
        altfr = [a.strip() for a in re.split(r"[,，]", cell(row, "다른 표기(불어)")) if a.strip()]
        if i in base:
            cur = by_id[i]
            for name, key in (("한국어", "ko"), ("English", "en"), ("中文(繁體)", "zh")):
                if cell(row, name) != (cur.get(key) or ""): kodiff.append(f"{i}: {key} '{cur.get(key)}' → '{cell(row, name)}'")
            new = {**tx, "alt": {"fr": altfr} if altfr else {}, "review": review}
            old = translations.get(i)
            if any(tx.values()):
                if old != new: changed += 1
                translations[i] = new
            elif old:
                del translations[i]; changed += 1
        else:
            ko, en = cell(row, "한국어"), cell(row, "English")
            if not ko or not en:
                warns.append(f"{i}: 한국어·English가 비어 있어 건너뜀"); continue
            alt = {"ko": [a.strip() for a in re.split(r"[,，]", cell(row, "다른 표기(한국어)")) if a.strip()]}
            if altfr: alt["fr"] = altfr
            e = {"id": i, "cat": CAT_REV.get(cell(row, "분류"), "user"), "ko": ko, "en": en, "zh": cell(row, "中文(繁體)"), **tx,
                 "from": "draft", "alt": {k: v for k, v in alt.items() if v}, "ambiguous": cell(row, "모호어(LLM만)") == "예", "hint": cell(row, "메모 / 모델 주의사항"), "desc": cell(row, "화면 설명"), "review": review}
            if i not in extra_by: added += 1
            else: changed += 1
            extra_by[i] = e
    write_blocks(translations, list(extra_by.values()))
    print(f"가져오기 완료 — 번역어 변경 {changed}건 · 새 용어 {added}개")
    if kodiff:
        print(f"\n⚠ 한국어·English·中文 칸이 glossary.js와 다른 항목 {len(kodiff)}개 (자동으로 바꾸지 않았습니다):")
        for d in kodiff[:40]: print("  ", d)
    for w in warns: print("  !", w)

if __name__ == "__main__":
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(1)
    if a[0] == "export": cmd_export(a[1] if len(a) > 1 else None)
    elif a[0] == "import": cmd_import(a[1])
    elif a[0] == "seed": cmd_seed(a[1])
    else: print(__doc__); sys.exit(1)
