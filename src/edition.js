/* 판(edition) 스위치 — 소스는 하나, 배포는 둘.
   빌드할 때 VITE_EDITION 값이 글자 그대로 바뀌어 들어간다(.env.lite / .env.full).
   기본판(lite)에서는 HAS_AI가 항상 거짓이라, 번역·통역·음성 코드가 결과물에서 통째로 빠진다
   (화면에서 버튼만 숨기는 것이 아니다). 값이 없으면 기본판 — 빠뜨려도 API가 열리지 않는 쪽이다. */
export const EDITION = import.meta.env.VITE_EDITION === "full" ? "full" : "lite";
export const HAS_AI = EDITION === "full";
export const BUILD = import.meta.env.VITE_BUILD || "dev";
/* 기본판의 안내창이 가리킬 통역판 주소. .env.lite의 VITE_FULL_URL에 적는다(비어 있으면 링크를 보이지 않는다). */
export const FULL_URL = import.meta.env.VITE_FULL_URL || "";
