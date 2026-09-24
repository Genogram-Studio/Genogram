/* 언어팩 점검 — npm run i18n:report
   · 언어별 번역 진행률(1단계 화면 문구 / 2단계 분석·긴 안내)
   · 카탈로그에 없는 열쇠(App.jsx의 영어 문구가 바뀌어 번역이 떠 있는 것), 자리 표시({n}) 불일치, 빈 값
   · 좁은 자리에서 넘칠 수 있는 짧은 문구(영어 3단어 이하인데 번역이 훨씬 긴 것)
   --strict 를 주면 문제가 있을 때 종료 코드 1(테스트에서 사용). 진행률은 문제로 세지 않는다. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEP = "\u0001";
const cat = JSON.parse(fs.readFileSync(path.join(root, "i18n/catalog.json"), "utf8")).items;
const keyOf = (e) => (e.ambiguous ? e.en + SEP + e.ko : e.en);
const byKey = new Map(cat.map((e) => [keyOf(e), e]));
const PH = /\{[a-z]+\}/g;
const dir = path.join(root, "locales");
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
const strict = process.argv.includes("--strict");
let bad = 0;
const say = (s) => console.log(s);

for (const f of files) {
  const pack = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const m = pack.meta || {};
  if (!m.code || !m.label) { say(`✗ ${f}: meta.code / meta.label 이 없습니다`); bad++; continue; }
  const strings = pack.strings || {};
  const problems = [];
  const orphans = Object.keys(strings).filter((k) => !byKey.has(k));
  for (const k of orphans) problems.push(`카탈로그에 없는 열쇠: ${JSON.stringify(k.slice(0, 50))}`);
  const done = { 1: 0, 2: 0 }, total = { 1: 0, 2: 0 };
  const wide = [];
  for (const e of cat) {
    total[e.tier]++;
    const v = strings[keyOf(e)];
    if (v === undefined) continue;
    if (!String(v).trim()) { problems.push(`빈 값: ${e.en.slice(0, 40)}`); continue; }
    done[e.tier]++;
    if ((e.en.match(PH) || []).sort().join() !== (String(v).match(PH) || []).sort().join()) problems.push(`자리 표시 불일치: ${e.en.slice(0, 40)}`);
    if (e.words <= 3 && [...String(v).trim()].length > Math.max(14, [...e.en.trim()].length * 2.2)) wide.push(`${e.en} → ${String(v).trim()}`);
  }
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 100);
  say(`${m.label} (${m.code}) — 화면 문구 ${done[1]}/${total[1]} (${pct(done[1], total[1])}%) · 분석·긴 안내 ${done[2]}/${total[2]} (${pct(done[2], total[2])}%) · 상태 ${m.status || "-"}`);
  for (const p of problems.slice(0, 12)) say(`   ✗ ${p}`);
  if (problems.length > 12) say(`   … 문제 ${problems.length}건`);
  if (wide.length) say(`   ⚠ 좁은 자리에서 넘칠 수 있는 짧은 문구 ${wide.length}개 (예: ${wide.slice(0, 3).join(" | ")})`);
  bad += problems.length;
}
if (!files.length) say("언어팩이 없습니다(locales/*.json).");
if (strict && bad) { console.error(`✗ 언어팩 문제 ${bad}건`); process.exit(1); }
if (strict) console.log(`✓ 언어팩 ${files.length}개 점검 통과 (열쇠·자리 표시·빈 값)`);
