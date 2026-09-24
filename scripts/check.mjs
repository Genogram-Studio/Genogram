/* 빌드가 끝난 뒤의 자동 검사 — 실수로 비용이 새는 길을 막는다.
   · 기본판(dist-lite)에는 API 호출이 한 글자도 남아 있으면 안 된다.
   · 통역판(dist-full)에는 번역·음성 호출이 있어야 한다. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (d) => {
  const dir = path.join(root, d, "assets");
  if (!fs.existsSync(dir)) throw new Error(`${d}/assets가 없습니다 — 먼저 빌드하세요`);
  return fs.readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
};
const lite = read("dist-lite"), full = read("dist-full");
const fails = [];

for (const needle of ["/.netlify/functions", "gpt-translate", "x-access-code", "gs:trans", "gs:code", "gs:tier", "gs:glossary", "gs:assist", "gpt-4o-mini-tts"]) {
  if (lite.includes(needle)) fails.push(`기본판에 "${needle}"가 남아 있음`);
}
for (const needle of ["/.netlify/functions/gpt-translate", "/.netlify/functions/tts", "/.netlify/functions/whisper", "x-access-code", "gs:tier", "gs:glossary"]) {
  if (!full.includes(needle)) fails.push(`통역판에 "${needle}"가 없음`);
}
if (!lite.includes("별도 사이트(통역판)로 분리했습니다")) fails.push("기본판에 번역·통역 안내창 문구가 없음");
if (full.includes("별도 사이트(통역판)로 분리했습니다")) fails.push("통역판에 기본판 안내창이 들어 있음");
/* 용어집: 함수용 사본이 원본과 항목 수까지 같아야 하고, 기본판에는 용어집 자료가 들어 있으면 안 된다 */
const gsrc = fs.readFileSync(path.join(root, "glossary/glossary.js"), "utf8");
const gcopy = path.join(root, "netlify/functions/_glossary.js");
const n = (t) => (t.match(/^\s*t\("/gm) || []).length;
if (!fs.existsSync(gcopy)) fails.push("netlify/functions/_glossary.js가 없음(npm run glossary)");
else if (n(fs.readFileSync(gcopy, "utf8")) !== n(gsrc)) fails.push("_glossary.js가 glossary/glossary.js와 다름(npm run glossary)");
for (const needle of ["emotional surrogate", "cross-generational coalition"]) {
  if (lite.includes(needle)) fails.push(`기본판에 용어집 자료("${needle}")가 남아 있음`);
  if (!full.includes(needle)) fails.push(`통역판에 용어집 자료("${needle}")가 없음`);
}
/* 화면 언어팩(프랑스어·태국어·크메르어)은 두 판 모두에 들어 있어야 한다 */
for (const needle of ["Dessiner un génogramme", "วาดจีโนแกรม", "គូរហ្សេណូក្រាម"]) {
  if (!lite.includes(needle)) fails.push(`기본판에 화면 언어팩 문구("${needle}")가 없음`);
  if (!full.includes(needle)) fails.push(`통역판에 화면 언어팩 문구("${needle}")가 없음`);
}
/* 용어집의 프랑스어·태국어·크메르어 초안은 기본판에 들어가면 안 된다(번역 기능이 없는 판) */
for (const needle of ["coalition de détournement", "แนวร่วมเบี่ยงประเด็น", "សម្ព័ន្ធប្រឆាំងបង្វែរ"]) {   // 화면 언어팩에는 없고 용어집에만 있는 용어
  if (lite.includes(needle)) fails.push(`기본판에 용어집 초안("${needle}")이 남아 있음`);
  if (!full.includes(needle)) fails.push(`통역판에 용어집 초안("${needle}")이 없음`);
}
const dl = fs.existsSync(path.join(root, "dist-lite", "netlify")) || fs.existsSync(path.join(root, "dist-lite", "netlify.toml"));
if (dl) fails.push("기본판 폴더에 netlify 폴더/설정이 있음");

/* 사용자 코드 변경(USER_ACCOUNTS용) 단추는 통역판에만 있어야 한다 — 기본판은 서버 함수가 없다 */
if (lite.includes("사용자 코드 변경")) fails.push("기본판에 '사용자 코드 변경' 단추가 남아 있음");
if (!full.includes("사용자 코드 변경")) fails.push("통역판에 '사용자 코드 변경' 단추가 없음");
/* USER_ACCOUNTS를 함수들이 실제로 쓰는지 — 빌드 산출물이 아니라 함수 소스를 직접 본다 */
for (const fn of ["gpt-translate.js", "tts.js", "whisper.js", "translate.js"]) {
  const src = fs.readFileSync(path.join(root, "netlify/functions", fn), "utf8");
  if (!src.includes("resolveAccount")) fails.push(`${fn}이 resolveAccount를 쓰지 않음(USER_ACCOUNTS 미지원)`);
  if (/process\.env\.OPENAI_API_KEY|process\.env\.DEEPL_API_KEY/.test(src)) fails.push(`${fn}이 공용 키를 직접 읽음(사람별 계정을 우회할 수 있음)`);
}

if (fails.length) { console.error("✗ 검사 실패\n  " + fails.join("\n  ")); process.exit(1); }
console.log(`✓ 검사 통과 — 기본판 ${(lite.length / 1024).toFixed(0)}KB(API 호출 없음) · 통역판 ${(full.length / 1024).toFixed(0)}KB`);
