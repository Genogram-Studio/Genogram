/* 용어집 — 프랑스어 찾기, 초안(soft) 정책, 서버용 사본 동기화 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { GLOSSARY, LANGS, findTerms, toPairs, buildPromptBlock, toDeepLTsv } from "../glossary/glossary.js";
const require = createRequire(import.meta.url);

assert.deepEqual(LANGS, ["ko", "en", "zh", "fr", "th", "km"]);
const ids = (arr) => arr.map((e) => e.id);
const fr = (t) => ids(findTerms(t, "fr"));

/* 프랑스어: 낱말 경계·악센트·축약·복수 */
assert.ok(fr("La différenciation du soi est centrale.").includes("self-diff"));
assert.ok(fr("Une triangulation dans la famille").includes("triangulation"));
assert.ok(fr("Les triangulations se répètent").includes("triangulation"), "plural s");
assert.ok(fr("l'alliance parentale est fragile").includes("parental-alliance"));
assert.ok(fr("L’alliance parentale").includes("parental-alliance"), "curly apostrophe in the text");
assert.ok(!fr("Il y a de la confusion").includes("fusion"), "'fusion' must not match inside 'confusion'");
assert.ok(!fr("un client important").includes("counselor"));
assert.ok(fr("Un client difficile").includes("client"));
assert.ok(fr("La famille d'origine et la famille d’origine").includes("family-of-origin"));
assert.ok(fr("une coupure émotionnelle").includes("cutoff"), "alt form");
assert.ok(fr("le patient désigné").includes("identified-patient"));
/* 태국어·크메르어 원문에서도 찾는다(글자 단위) */
assert.ok(ids(findTerms("การแยกความเป็นตัวตนของเขา", "th")).includes("self-diff"));
assert.ok(ids(findTerms("ការញែកខ្លួនឯង", "km")).includes("self-diff"));
/* 한국어/영어/중국어 동작은 예전 그대로 */
assert.ok(ids(findTerms("자기분화가 낮다", "ko")).includes("self-diff"));
assert.ok(ids(findTerms("Differentiation of self", "en")).includes("self-diff"));
assert.ok(ids(findTerms("自我分化", "zh")).includes("self-diff"));

/* 초안 정책: fr/th/km이 걸린 쌍은 soft, 한·영·중끼리는 hard */
const found = findTerms("자아분화와 삼각관계", "ko");
const pfr = toPairs(found, "ko", "fr"), pen = toPairs(found, "ko", "en");
assert.ok(pfr.length >= 2 && pfr.every((p) => p.soft), "draft French terms are soft");
assert.ok(pen.length >= 2 && pen.every((p) => !p.soft), "reviewed languages stay hard");
const blockSoft = buildPromptBlock(pfr), blockHard = buildPromptBlock(pen);
assert.ok(/Suggested terms/.test(blockSoft) && !/use exactly the target term/.test(blockSoft), "soft-only block does not say 'use exactly'");
assert.ok(/^Glossary: when the source text contains these counseling terms, use exactly the target term shown\./.test(blockHard), "hard block text unchanged");
assert.equal(toDeepLTsv(pfr), "", "draft terms never go to the DeepL glossary");
assert.ok(toDeepLTsv(pen).length > 0);
/* 검수 완료('ok')로 바꾸면 강제된다 */
const okEntry = { ...GLOSSARY.find((e) => e.id === "self-diff"), review: { fr: "ok" } };
assert.equal(toPairs([okEntry], "ko", "fr")[0].soft, false);

/* 모든 fr/th/km 번역어는 검수 상태를 가진다 */
for (const e of GLOSSARY) for (const l of ["fr", "th", "km"]) if (e[l]) assert.ok(e.review && ["draft", "ok"].includes(e.review[l]), `${e.id}.${l} needs a review state`);
/* 서버용 사본(_glossary.js)이 원본과 같다 */
const G = require("../netlify/functions/_glossary.js");
assert.equal(G.GLOSSARY.length, GLOSSARY.length);
assert.equal(JSON.stringify(G.GLOSSARY), JSON.stringify(GLOSSARY), "netlify/functions/_glossary.js is stale — run npm run glossary");
assert.equal(G.findTerms("la différenciation du soi", "fr")[0].id, "self-diff");
/* gpt-translate는 초안을 강제하지 않는다 */
assert.ok(/!p\.soft/.test(fs.readFileSync(new URL("../netlify/functions/gpt-translate.js", import.meta.url), "utf8")));
console.log(`✓ 용어집 ${GLOSSARY.length}개 · 프랑스어 낱말 경계·축약·복수, 태국어·크메르어 원문, 초안=권장어(soft)·확인=강제, 서버 사본 동기화`);
