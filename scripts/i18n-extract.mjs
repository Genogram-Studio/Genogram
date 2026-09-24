/* 화면 문구 추출기 — App.jsx에서 [영어, 한국어, 중국어] 문구를 문법 분석으로 뽑아 i18n/catalog.json을 만든다.
   · 대상: 앞의 세 칸이 (영어, 한글, 한자) 문자열인 배열, 그리고 t("영어", "한글", "中文") 호출
   · 문자열 안에 ${…}가 들어 있는 것은 실행할 때 값이 바뀌므로 대상이 아니다 → dynamic으로 따로 센다(언어팩에서는 영어로 나온다)
   · 사용: node scripts/i18n-extract.mjs        (i18n/catalog.json 갱신 + 요약 출력)
   언어팩(locales/xx.json)은 이 카탈로그의 영어(+한국어) 문구를 열쇠로 삼는다. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "src/App.jsx"), "utf8");
const ast = parser.parse(src, { sourceType: "module", plugins: ["jsx"] });

const HANGUL = /[가-힣]/, HAN = /[\u3400-\u9fff]/, LATIN = /[A-Za-z]/;
const staticStr = (n) => (n && n.type === "StringLiteral" ? n.value : n && n.type === "TemplateLiteral" && n.expressions.length === 0 ? n.quasis.map((q) => q.value.cooked).join("") : null);
const looksDynamic = (n) => n && n.type === "TemplateLiteral" && n.expressions.length > 0;
const isTriple = (a, b, c) => a != null && b != null && c != null && LATIN.test(a) && !HANGUL.test(a) && HANGUL.test(b) && HAN.test(c) && !HANGUL.test(c);
const sectionOf = (p) => {
  const top = p.findParent((x) => x.parentPath && x.parentPath.isProgram());
  const n = top && top.node;
  if (!n) return "(top)";
  const d = n.type === "ExportNamedDeclaration" || n.type === "ExportDefaultDeclaration" ? n.declaration : n;
  if (!d) return "(top)";
  if (d.type === "FunctionDeclaration" || d.type === "ClassDeclaration") return d.id ? d.id.name : "(default)";
  if (d.type === "VariableDeclaration") return d.declarations[0].id.name || "(var)";
  return "(top)";
};

const found = [], dynamic = [];
const take = (nodes, p, kind) => {
  const [a, b, c] = nodes.map(staticStr);
  if (isTriple(a, b, c)) found.push({ en: a, ko: b, zh: c, section: sectionOf(p), line: nodes[0].loc.start.line, kind });
  else if (nodes.slice(0, 3).every((n) => staticStr(n) != null || looksDynamic(n)) && nodes.slice(0, 3).some(looksDynamic)) dynamic.push({ section: sectionOf(p), line: nodes[0].loc.start.line, kind });
};
traverse(ast, {
  ArrayExpression(p) { if (p.node.elements.length >= 3) take(p.node.elements.slice(0, 3), p, "array"); },
  CallExpression(p) {
    const n = p.node;
    if (n.callee.type === "Identifier" && n.callee.name === "t" && n.arguments.length >= 3) take(n.arguments.slice(0, 3), p, "call");
  },
});

/* 같은 (영어, 한국어)는 하나로 합친다 */
const byKey = new Map();
for (const f of found) {
  const k = f.en + "\u0001" + f.ko;
  if (!byKey.has(k)) byKey.set(k, { ...f, uses: 1 }); else byKey.get(k).uses++;
}
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
/* 번역 순서: 1단계 = 메뉴·버튼·기호 이름·짧은 안내(화면 문구), 2단계 = 분석 엔진·면담 질문·근거·긴 안내문(30단어 초과) */
const ANALYSIS = new Set(["CULTURES", "IV_CATS", "RULES", "DOMAINS", "OVERVIEW_QS", "QUESTIONS", "ANALYSIS_SOURCES", "CULTURE_CAUTION"]);
const tierOf = (section, w) => (ANALYSIS.has(section) || w > 30 ? 2 : 1);
const items = [...byKey.values()].map((e) => ({ en: e.en, ko: e.ko, zh: e.zh, section: e.section, words: words(e.en), tier: tierOf(e.section, words(e.en)), uses: e.uses }));

/* 영어가 같은데 한국어가 다른 문구: 열쇠에 한국어를 함께 써서 구분한다 */
const enCount = new Map(); for (const e of items) enCount.set(e.en, (enCount.get(e.en) || 0) + 1);
for (const e of items) e.ambiguous = enCount.get(e.en) > 1;

fs.mkdirSync(path.join(root, "i18n"), { recursive: true });
fs.writeFileSync(path.join(root, "i18n/catalog.json"), JSON.stringify({ generatedFrom: "src/App.jsx", count: items.length, items }, null, 1));

const bySec = {};
for (const e of items) { const s = (bySec[e.section] ||= { n: 0, w: 0 }); s.n++; s.w += e.words; }
if (process.argv.includes("--quiet")) { console.log(`✓ i18n/catalog.json — ${items.length}개 문구 (동적 ${dynamic.length}곳 제외)`); }
else {
  const t1 = items.filter((e) => e.tier === 1), t2 = items.filter((e) => e.tier === 2);
  console.log(`1단계(화면 문구) ${t1.length}개 ${t1.reduce((a, e) => a + e.words, 0)}단어 · 2단계(분석·긴 안내) ${t2.length}개 ${t2.reduce((a, e) => a + e.words, 0)}단어`);
  console.log(`문구 ${items.length}개 · 영어 ${items.reduce((a, e) => a + e.words, 0)}단어 · 영어가 같은 다른 문구 ${items.filter((e) => e.ambiguous).length}개 · 동적 문구 ${dynamic.length}곳`);
  for (const [s, v] of Object.entries(bySec).sort((a, b) => b[1].w - a[1].w)) console.log(`  ${s.padEnd(28)} ${String(v.n).padStart(4)}개 ${String(v.w).padStart(5)}단어`);
  if (dynamic.length) console.log("동적 문구 위치:", dynamic.slice(0, 40).map((d) => `${d.section}:${d.line}`).join(" "));
}
