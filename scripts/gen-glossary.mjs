/* 용어집(glossary/glossary.js, ES 모듈)을 Netlify 함수가 바로 읽을 수 있는 CommonJS로 바꿔
   netlify/functions/_glossary.js에 쓴다. 용어집의 '원본'은 glossary/glossary.js 하나뿐이고,
   _glossary.js는 이 스크립트가 만드는 사본이다(직접 고치지 않는다).
   npm run glossary 로 만들고, npm run build:all 이 빌드 전에 자동으로 만든다. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "glossary/glossary.js"), "utf8");

const exported = [...src.matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]);
const extra = [...src.matchAll(/^export \{([^}]+)\};?\s*$/gm)].flatMap((m) => m[1].split(",").map((x) => x.trim()).filter(Boolean));
const names = [...new Set([...exported, ...extra])];
if (!names.includes("GLOSSARY") || !names.includes("findTerms")) throw new Error("glossary.js에서 GLOSSARY/findTerms를 찾지 못했습니다");

let out = src
  .replace(/^export \{[^}]+\};?\s*$/gm, "")
  .replace(/^export (const|function) /gm, "$1 ");
out = `/* 자동 생성 파일 — 고치지 마세요. 원본: glossary/glossary.js (scripts/gen-glossary.mjs가 변환) */\n` + out.trimEnd() +
  `\n\nmodule.exports = { ${names.join(", ")} };\n`;

const dest = path.join(root, "netlify/functions/_glossary.js");
fs.writeFileSync(dest, out);
console.log(`✓ _glossary.js 생성 — 내보내기 ${names.length}개(${names.join(", ")}) · ${(out.length / 1024).toFixed(1)}KB`);
