import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* 판(mode)마다 출력 폴더만 다르다: --mode lite → dist-lite, --mode full → dist-full.
   판 스위치 값(VITE_EDITION)은 .env.lite / .env.full에서 온다. */
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: { outDir: mode === "full" ? "dist-full" : "dist-lite", emptyOutDir: true, chunkSizeWarningLimit: 1500 },
}));
