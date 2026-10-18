import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* 판(mode)마다 출력 폴더만 다르다: --mode lite → dist-lite, --mode full → dist-full.
   판 스위치 값(VITE_EDITION)은 .env.lite / .env.full에서 온다.

   빌드 표시(VITE_BUILD) — 화면 왼쪽 아래 "통역판 · …"에 찍힌다.
   빌드한 날짜·시각(태국 시간)과, Netlify에서 빌드했으면 커밋 번호 앞 7자리를 붙인다.
   Netlify 'Deploys' 목록의 main@xxxxxxx와 같으면 그 판이 지금 사이트에 올라가 있는 것이다. */
function buildStamp() {
  if (process.env.VITE_BUILD) return process.env.VITE_BUILD;
  const now = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");
  const ref = (process.env.COMMIT_REF || "").slice(0, 7);
  return ref ? `${now} · ${ref}` : now;
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: { "import.meta.env.VITE_BUILD": JSON.stringify(buildStamp()) },
  build: { outDir: mode === "full" ? "dist-full" : "dist-lite", emptyOutDir: true, chunkSizeWarningLimit: 1500 },
}));
