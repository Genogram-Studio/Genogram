/* 화면 언어 — 영어·한국어·중국어는 문구 배열 안에 있고(번호 0·1·2), 그 밖의 언어는 locales/xx.json 언어팩에서 찾는다.
   새 언어를 넣으려면 locales/에 파일 하나를 추가하면 된다(코드는 바꾸지 않는다). 언어 선택 목록도 파일에 맞춰 자동으로 늘어난다.

   언어팩 형식
     { "meta": { "code": "fr", "label": "Français", "htmlLang": "fr", "order": 3 },
       "strings": { "<영어 문구>": "번역", "<영어 문구>\u0001<한국어 문구>": "번역" } }
   · 열쇠는 영어 문구다. 영어는 같은데 한국어가 다른 문구(예: 명사 Close와 동사 Close)는 "영어\u0001한국어"로 구분한다.
   · 언어팩에 없거나 비어 있는 문구는 영어로 나온다 — 번역이 덜 끝난 언어를 먼저 배포해도 화면이 깨지지 않는다.
   · 문구 목록(i18n/catalog.json)은 npm run i18n으로 App.jsx에서 뽑는다. */
const files = import.meta.glob("../locales/*.json", { eager: true, import: "default" });

export const BASE_LANGS = [
  { id: "en", label: "English", htmlLang: "en" },
  { id: "ko", label: "한국어", htmlLang: "ko" },
  { id: "zh", label: "繁體中文", htmlLang: "zh-Hant" },
];
export const BASE_LANG_COUNT = BASE_LANGS.length;

const packs = Object.values(files)
  .filter((p) => p && p.meta && p.meta.code && !BASE_LANGS.some((b) => b.id === p.meta.code))
  .sort((a, b) => (a.meta.order ?? 99) - (b.meta.order ?? 99) || String(a.meta.code).localeCompare(String(b.meta.code)));

export const LANGS = [...BASE_LANGS, ...packs.map((p) => ({ id: p.meta.code, label: p.meta.label, htmlLang: p.meta.htmlLang || p.meta.code }))];
export const langIndexOf = (code) => LANGS.findIndex((l) => l.id === code);

const SEP = "\u0001";
const MAPS = packs.map((p) => new Map(Object.entries(p.strings || {})));
/* v = [영어, 한국어, 중국어, …]. 언어팩에 번역이 있으면 그것을, 없으면 undefined(→ 호출한 쪽이 영어로 돌아간다). */
export const packText = (v, li) => {
  const m = MAPS[li - BASE_LANG_COUNT];
  if (!m) return undefined;
  return m.get(v[0] + SEP + v[1]) || m.get(v[0]) || undefined;
};
