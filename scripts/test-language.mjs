import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const start = source.indexOf("function detectScript(text) {");
const end = source.indexOf("\n/* 긴 글은", start);
assert.ok(start >= 0 && end > start);
const detectScript = vm.runInNewContext(`${source.slice(start, end)}; detectScript`);

assert.equal(detectScript("안녕하세요."), "ko");
assert.equal(detectScript("您好，請說。"), "zh");
assert.equal(detectScript("How are you?"), "latin");
assert.equal(detectScript("Comment allez-vous ?"), "latin");
assert.equal(detectScript("Écoutez."), "latin");
assert.equal(detectScript("é"), "latin");
assert.equal(detectScript("1234"), null);
/* 태국어·크메르어는 글자 종류만으로 구분된다 */
assert.equal(detectScript("สวัสดีครับ วันนี้เป็นอย่างไรบ้าง"), "th");
assert.equal(detectScript("សួស្តី តើអ្នកសុខសប្បាយជាទេ?"), "km");
assert.equal(detectScript("๑๒๓"), null, "Thai digits alone are not text");
assert.equal(detectScript("១២៣"), null, "Khmer digits alone are not text");
assert.equal(detectScript("어머니는 ครูสอนภาษา 이십니다"), "ko", "a Thai word inside a Korean sentence must not flip the source language");

const sourceCodes = /const LANG_CODE\s*=\s*\[([^\]]+)\]/.exec(source)?.[1];
const labels = /const GPT_LANG\s*=\s*\[([^\]]+)\]/.exec(source)?.[1];
assert.ok(sourceCodes?.endsWith('"fr"'));
assert.ok(labels?.endsWith('"Français"'));
/* 기존 언어 번호(ko 0, zh 1, en 2, th 3, km 4, fr 5)는 그대로 — 저장된 통역 설정이 밀리지 않는다 */
assert.ok(source.includes("const LANG_IDX = { ko: 0, zh: 1, en: 2, th: 3, km: 4, fr: 5 }"));
assert.ok(source.includes('const FIELD_LANGUAGES = ["ko", "en", "zh", "fr", "th", "km"]'));
const codes = sourceCodes.split(",").map((x) => x.trim().replace(/"/g, ""));
const gpt = labels.split(",").map((x) => x.trim().replace(/"/g, ""));
const idx = JSON.parse(/const LANG_IDX = (\{[^}]+\})/.exec(source)[1].replace(/(\w+):/g, '"$1":'));
for (const [code, i] of Object.entries(idx)) assert.equal(codes[i], code, `LANG_IDX.${code} must point at LANG_CODE[${i}]`);
assert.equal(gpt[idx.th], "ภาษาไทย");
assert.equal(gpt[idx.km], "ភាសាខ្មែរ");

/* 서버가 번역 목표 언어를 알아보는지(글자 이름 → 코드) */
const fn = fs.readFileSync(new URL("../netlify/functions/gpt-translate.js", import.meta.url), "utf8");
const langCodeSrc = fn.slice(fn.indexOf("const langCode = "), fn.indexOf("};", fn.indexOf("const langCode = ")) + 2);
const langCode = vm.runInNewContext(`${langCodeSrc}; langCode`);
for (const [code, i] of Object.entries(idx)) assert.equal(langCode(gpt[i]), code, `server langCode(${gpt[i]})`);

console.log("✓ Korean/Chinese/Thai/Khmer script detection, English/French Latin ambiguity, mixed-script text, language indexes, server language codes");
