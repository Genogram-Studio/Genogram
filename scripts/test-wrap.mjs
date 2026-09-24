/* 설명 박스의 줄바꿈 — 태국어·크메르어는 띄어쓰기가 없고 부호가 글자에 붙어 있다. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const a = source.indexOf("/* 태국어·크메르어는 낱말 사이에");
const b = source.indexOf("function hullPoints(", a);
assert.ok(a >= 0 && b > a);
const noteA = source.indexOf("const NOTE_WRAP = 18;");
const noteB = source.indexOf("function noteBounds(n) {");
const noteC = source.indexOf("\nfunction unionAnchor", noteB);
assert.ok(noteA >= 0 && noteB > noteA && noteC > noteB);
const T = {};
const ctx = vm.createContext({ T });
vm.runInContext(`${source.slice(a, b)}\n${source.slice(noteA, noteC)}\nthis.wrapText = wrapText; this.noteBounds = noteBounds; this.noteLines = noteLines; this.graphemes = graphemes;`, ctx);
const { wrapText, noteBounds, noteLines, graphemes } = ctx;

const THAI = "วันนี้ฉันรู้สึกเหนื่อยมากเพราะต้องดูแลลูกสามคนและทำงานไปพร้อมกัน ตอนนี้อยากพักสักหน่อย";
const KHMER = "ខ្ញុំមានអារម្មណ៍នឿយហត់ណាស់ព្រោះត្រូវថែទាំកូនបីនាក់ហើយធ្វើការទៅជាមួយគ្នា។ ឥឡូវនេះខ្ញុំចង់សម្រាកបន្តិច។";
const strip = (s) => s.replace(/\s+/g, "");
const badStart = /^[\p{M}\u0E33\u17D2]/u;      // 줄 머리에 부호만 오면 안 된다
const badEnd = /[\u17D2\u0E40-\u0E44]$/u;      // 줄 끝에 코엥(아래 붙는 표시)이나 앞에 붙는 모음만 남으면 안 된다

for (const [name, text, n] of [["Thai", THAI, 16], ["Khmer", KHMER, 12], ["Thai", THAI, 28], ["Khmer", KHMER, 20]]) {
  const lines = wrapText(text, n);
  assert.ok(lines.length > 1, `${name} n=${n}: should wrap`);
  assert.equal(strip(lines.join("")), strip(text), `${name} n=${n}: no text may be lost or altered`);
  for (const line of lines) {
    assert.ok(graphemes(line).length <= n + 1, `${name} n=${n}: line too long (${graphemes(line).length}): ${line}`);
    assert.ok(!badStart.test(line), `${name} n=${n}: a line starts with a combining mark: ${line}`);
    assert.ok(!badEnd.test(line), `${name} n=${n}: a line ends with a dangling mark: ${line}`);
  }
}
/* 낱말 하나가 한 줄보다 길어도 글자 조각 단위로 자른다(부호가 떨어지지 않는다) */
const long = wrapText("ก".repeat(3) + "ั".repeat(1) + "ข".repeat(40), 10);
for (const line of long) assert.ok(!badStart.test(line));
/* 한글·영어 줄은 예전 그대로 */
assert.equal(JSON.stringify(wrapText("가나다라마바사아자차카타파하", 5)), JSON.stringify(["가나다라마", "바사아자차", "카타파하"]));
assert.equal(JSON.stringify(wrapText("one two three four", 9)), JSON.stringify(["one two", "three", "four"]));
/* 설명 박스: 태국어·크메르어 줄은 줄 간격이 넓고, 그 밖의 줄은 그대로다 */
const plain = noteBounds({ text: "hello\nworld", x: 0, y: 0 });
assert.equal(plain.h, 2 * 12 * 1.4 + 18);
const thai = noteBounds({ text: THAI, x: 0, y: 0 });
assert.ok(Array.from(thai.steps).every((s) => s === 1.75));
assert.ok(Math.abs(thai.h - (thai.lines.length * 1.75 * 12 + 18)) < 1e-9);
const mixed = noteBounds({ text: `한국어 문장입니다\n\u200B${THAI}`, x: 0, y: 0 });
assert.equal(mixed.steps[0], 1.4);
assert.equal(Array.from(mixed.steps).at(-1), 1.75);
assert.ok(thai.w > 64 && thai.w < 320, `Thai box width sane: ${thai.w}`);
assert.ok(noteBounds({ text: KHMER, x: 0, y: 0 }).w < 320);
console.log("✓ Thai/Khmer note wrapping keeps marks attached, keeps all text, respects widths; Korean/English wrapping unchanged; line spacing per script");
