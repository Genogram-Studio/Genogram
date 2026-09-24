/* npm run build:all — 두 판을 빌드하고, 검사하고, zip 두 개를 만든다.
   결과: out/genogram-lite-<해시>.zip, out/genogram-full-<해시>.zip
   · lite: 화면 파일만(함수 폴더·API 키 설정 없음)
   · full: 화면 파일 + netlify/functions + netlify.toml(함수 폴더 지정) */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { ZipArchive } from "archiver";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hash = crypto.createHash("md5").update(fs.readFileSync(path.join(root, "src/App.jsx"))).digest("hex").slice(0, 8);
const env = { ...process.env, VITE_BUILD: hash };

execFileSync(process.execPath, ["scripts/gen-glossary.mjs"], { cwd: root, stdio: "inherit" });   // 용어집 원본 → 함수용 사본
execFileSync(process.execPath, ["scripts/i18n-extract.mjs", "--quiet"], { cwd: root, stdio: "inherit" });   // 화면 문구 카탈로그 갱신
for (const mode of ["lite", "full"]) execFileSync(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--mode", mode], { cwd: root, stdio: "inherit", env });
execFileSync(process.execPath, ["scripts/check.mjs"], { cwd: root, stdio: "inherit" });

const out = path.join(root, "out");
fs.mkdirSync(out, { recursive: true });
const zip = (name, add) => new Promise((resolve, reject) => {
  const file = path.join(out, name);
  const stream = fs.createWriteStream(file);
  const ar = new ZipArchive({ zlib: { level: 9 } });
  stream.on("close", () => { console.log(`  ${name}  ${(fs.statSync(file).size / 1024).toFixed(0)}KB`); resolve(file); });
  ar.on("error", reject); ar.pipe(stream); add(ar); ar.finalize();
});

console.log("zip 만드는 중…");
await zip(`genogram-lite-${hash}.zip`, (ar) => ar.directory(path.join(root, "dist-lite"), false));
await zip(`genogram-full-${hash}.zip`, (ar) => {
  ar.directory(path.join(root, "dist-full"), false);
  ar.directory(path.join(root, "netlify/functions"), "netlify/functions");
  ar.append('[functions]\n  directory = "netlify/functions"\n', { name: "netlify.toml" });
});
await zip(`genogram-project-${hash}.zip`, (ar) => {
  for (const dir of ["src", "netlify", "scripts", "glossary", "locales", "i18n", "tools"]) ar.directory(path.join(root, dir), dir);
  for (const file of fs.readdirSync(root)) if (/\.(json|html|js|md)$/.test(file) || file.startsWith(".env.")) ar.file(path.join(root, file), { name: file });
});
fs.copyFileSync(path.join(root, "src/App.jsx"), path.join(out, `genogram-studio-${hash}.jsx`));
console.log(`끝. 해시 ${hash}`);
