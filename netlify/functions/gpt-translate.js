/* GPT 번역 — POST { text, from, to, context?, tier?, glossary?, warm? } → { result, model, tier, ms }
   from/to는 언어 이름 그대로("한국어", "English", "繁體中文"…) 프롬프트에 넣는다.
   context : 바로 앞 문장들(번역하지 않고 누가 무엇인지 파악하는 데만 쓴다) — 한국어는 주어를 자주 생략한다.
   tier    : "std"(일반, 빠르고 저렴 — 기본 Terra) | "pro"(정밀, 가장 정확 — 기본 Sol). 없으면 pro.
             앱은 [자동|일반|정밀] 버튼으로 고르고, 실제 모델 이름은 여기(서버)에서만 정한다.
   glossary: 사용자가 ⚙에서 적은 용어 쌍 [[한국어, 영어, 중국어], …] — 기본 용어집보다 앞선다.
   기본 용어집(glossary/glossary.js → _glossary.js): 원문에서 찾은 용어만 골라 지침에 넣고(불필요한 글을 줄인다),
             번역에 지정 용어가 빠졌으면 한 번 다시 번역하게 한다(응답의 retried/missing).
   warm    : true면 OpenAI를 부르지 않고 바로 답한다(함수를 미리 깨워 첫 문장의 지연을 줄이는 용도).
   API 키는 Netlify 환경변수 OPENAI_API_KEY에서만 읽는다(브라우저에 나가지 않는다).
   USER_ACCOUNTS가 설정되어 있으면 그 대신 요청의 접근 코드에 연결된 사용자 계정의 키를 쓴다(_util.resolveAccount) —
   사람마다 자기 OpenAI 프로젝트로 청구되어, OpenAI의 Usage → Costs에서 사람별 비용을 볼 수 있다.

   환경변수(모두 선택):
     OPENAI_TRANSLATE_MODEL   정밀 등급 모델(쉼표로 여러 개, 앞의 것부터 시도)  기본 gpt-5.6-sol …
     OPENAI_MODEL_STD         일반 등급 모델                                    기본 gpt-5.6-terra → gpt-5.6-sol …
     OPENAI_TRANSLATE_EFFORT  추론 단계 none | minimal | low | medium | high     기본 none(실시간이라 빠르게)
     OPENAI_TRANSLATE_TIER    fast 로 두면 Fast mode(속도 최대 2.5배, 가격 2배)   기본 꺼짐
   그 계정에서 쓸 수 없거나 이름이 바뀐 모델이면 다음 모델로 내려간다. */
const { json, parseBody, resolveAccount } = require("./_util");
const G = require("./_glossary");

/* ── 용어집 ────────────────────────────────────────────────────────────
   기본 용어집(G.GLOSSARY)이 원본이고, 여기에는 '앱 메뉴에 쓰이는 여러 낱말 표기' 몇 개만 덧붙인다.
   '통제', '무관심'처럼 일상어와 겹치는 한 낱말은 일부러 뺐다(일반 문장에서 억지로 바꾸지 않도록). */
const APP_TERMS = [
  ["app-harmony", "무난한 관계", "harmonious relationship", "平順關係"],
  ["app-close", "친근한 관계", "close relationship", "親近關係"],
  ["app-indifferent", "빈약한 관계", "indifferent relationship", "淡漠關係"],
  ["app-conflict", "갈등 관계", "conflictual relationship", "衝突關係"],
  ["app-focused", "집중된 관계", "focused relationship", "專注關係"],
  ["app-phys", "신체 폭력", "physical violence", "身體暴力"],
  ["app-verbal", "언어 폭력", "verbal violence", "言語暴力"],
  ["app-sexual", "성 폭력", "sexual violence", "性暴力"],
  ["app-other-viol", "기타 폭력", "other violence", "其他暴力"],
  ["app-household", "가구", "household", "同住家戶", { ambiguous: true, hint: "Household = people living together in one home, not furniture." }],
].map(([id, ko, en, zh, o]) => ({ id, cat: "relation", ko, en, zh, th: "", km: "", from: "app", alt: {}, ambiguous: false, notFollowedBy: {}, hint: "", verify: [], ...(o || {}) }));
const BASE_KO = new Set(G.GLOSSARY.map((e) => e.ko));

const langCode = (label) => {
  const l = String(label || "");
  if (/detect the source language/i.test(l)) return "";
  if (/한국|korean/i.test(l)) return "ko";
  if (/繁體|中文|chinese/i.test(l)) return "zh";
  if (/english|영어/i.test(l)) return "en";
  if (/fran[cç]ais|french|프랑스어|불어/i.test(l)) return "fr";
  if (/ไทย|thai/i.test(l)) return "th";
  if (/ខ្មែរ|khmer/i.test(l)) return "km";
  return "";
};
/* 사용자 용어집 [[한국어, 영어, 중국어], …] → 용어 항목.
   · 칸을 비운 언어는 '지정 안 함'이라 기본 용어집 값을 그대로 물려받는다(원가족 = = 原生家庭 → 영어는 기본값 유지).
   · 한국어 표기가 기본 용어집의 다른 표기(자기분화 → 자아분화)여도 같은 용어로 보고 덮어쓴다.
   · 기본 용어집에 없는 용어는 새 항목으로 더한다. */
const BASE_BY_KO = new Map();
G.GLOSSARY.forEach((e) => { BASE_BY_KO.set(e.ko, e); ((e.alt && e.alt.ko) || []).forEach((k) => { if (!BASE_BY_KO.has(k)) BASE_BY_KO.set(k, e); }); });
const userTermsOf = (list) => (Array.isArray(list) ? list : []).slice(0, 60).map((row, i) => {
  const r = (Array.isArray(row) ? row : []).slice(0, 3).map((x) => String(x || "").trim().slice(0, 80));
  const b = BASE_BY_KO.get(r[0]);
  return {
    ...(b ? { alt: b.alt, ambiguous: b.ambiguous, notFollowedBy: b.notFollowedBy, hint: b.hint, th: b.th, km: b.km } : {}),
    id: `user-${i}`, ko: b ? b.ko : r[0] || "", en: r[1] || (b ? b.en : ""), zh: r[2] || (b ? b.zh : ""),
  };
}).filter((u) => [u.ko, u.en, u.zh].filter(Boolean).length >= 2);

/* 원문(과 앞 문장)에서 용어를 찾아 이번 번역에 필요한 것만 지침 조각으로 만든다 */
function termsFor(text, context, from, to, users) {
  const src = langCode(from), tgt = langCode(to);
  if (!src || !tgt || src === tgt) return { pairs: [], block: "", inText: new Set() };
  const userKo = new Set(users.map((u) => u.ko).filter(Boolean));
  const app = APP_TERMS.filter((a) => !BASE_KO.has(a.ko) && !userKo.has(a.ko));
  const extra = [...app, ...users];
  const inText = G.findTerms(text, src, extra);                                  // 번역할 문장에 있는 용어
  const inCtx = context ? G.findTerms(context, src, extra) : [];                 // 앞 문장에만 있는 용어(표기를 맞추는 데만 쓴다)
  const all = [...inText, ...inCtx.filter((e) => !inText.some((x) => x.id === e.id))];
  const pairs = G.toPairs(all, src, tgt);
  return { pairs, block: G.buildPromptBlock(pairs), inText: new Set(inText.map((e) => e.id)) };
}
/* 빠졌는지 검사할 용어: 일상어와 겹치는 모호어, 너무 짧은 표기(우연히 걸리기 쉬움), 검수 전 초안 용어는 강제하지 않는다 */
const enforceable = (pairs) => pairs.filter((p) => !p.ambiguous && !p.soft && [...p.src].length >= 3);   // 초안(soft) 용어는 강제하지 않는다

const splitEnv = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
const DEFAULT_PRO = ["gpt-5.6-sol", "gpt-5.5", "gpt-5.4", "gpt-5.2", "gpt-4.1"];
const DEFAULT_STD = ["gpt-5.6-terra", "gpt-5.6-sol", "gpt-5.5", "gpt-5.4", "gpt-5.2", "gpt-4.1"];
const CHAIN = {
  pro: [...new Set([...splitEnv(process.env.OPENAI_TRANSLATE_MODEL), ...DEFAULT_PRO])],
  std: [...new Set([...splitEnv(process.env.OPENAI_MODEL_STD), ...DEFAULT_STD])],
};
const EFFORT = (process.env.OPENAI_TRANSLATE_EFFORT || "none").trim();
const SVC = ["fast", "priority"].includes((process.env.OPENAI_TRANSLATE_TIER || "").trim()) ? process.env.OPENAI_TRANSLATE_TIER.trim() : "";
let svcOff = false;                       // 이 계정·모델이 service_tier를 거부하면 그 뒤로는 보내지 않는다
const isReasoning = (m) => /^(gpt-5|o\d)/.test(m);
const effortsFor = (m) => (isReasoning(m) ? [...new Set([EFFORT, "minimal", "low", null])] : [null]);

const working = { std: null, pro: null };   // 따뜻한 상태에서는 통했던 조합부터 시도(등급마다 따로)

const systemPrompt = (from, to, glossBlock) =>
  `You are a professional interpreter working live in a family-counseling and family-ministry session.\n` +
  `Translate the message from ${from} into ${to}.\n` +
  `- When the source language is described as a choice, identify it from the text before translating. If the text is already in the target language, return it unchanged.\n` +
  `Rules:\n` +
  `- Keep the meaning, tone, register and emotion exactly. Do not add, omit, soften, judge or explain anything.\n` +
  `- Korean often drops the subject. Use the CONTEXT (earlier sentences) only to work out who or what is meant. Never translate or repeat the context.\n` +
  `- Translate kinship terms precisely (e.g. 외할머니 = maternal grandmother, 큰아버지 = father's elder brother, 시어머니 = husband's mother).\n` +
  `- Keep names, numbers, dates and line breaks as they are.\n` +
  `- If the target is Chinese, write Traditional Chinese (繁體中文) as used in Taiwan.\n` +
  (glossBlock ? `${glossBlock}\n` : "") +
  `Output only the translation of the text — no quotes, labels, notes or explanations.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callOnce(key, model, effort, messages, svc) {
  const body = { model, messages, max_completion_tokens: 2000 };
  if (isReasoning(model)) { if (effort) body.reasoning_effort = effort; }
  else body.temperature = 0.2;
  if (svc) body.service_tier = svc;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    return await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
  } finally { clearTimeout(timer); }
}
const errInfo = async (resp) => {
  const err = await resp.json().catch(() => ({}));
  return `${(err.error && err.error.code) || ""} ${(err.error && err.error.message) || ""}`;
};

/* 모델 목록을 차례로 시도해 번역 한 번을 얻는다. 못 쓰는 모델·옵션은 알아서 내려간다. */
async function translateWithPlan(key, tier, messages) {
  const plan = [];
  if (working[tier]) plan.push([working[tier].model, working[tier].effort]);
  CHAIN[tier].forEach((m) => effortsFor(m).forEach((e) => plan.push([m, e])));
  let last = 0;
  const skipModels = new Set();
  for (const [model, effort] of plan) {
    if (skipModels.has(model)) continue;
    try {
      const svc = SVC && !svcOff ? SVC : "";
      let resp = await callOnce(key, model, effort, messages, svc);
      let usedSvc = svc;
      let info = "";
      if (!resp.ok) info = await errInfo(resp);
      if (!resp.ok && svc && resp.status === 400 && /service_tier/i.test(info)) {      // 이 계정에서 Fast mode를 못 쓰면 빼고 다시
        svcOff = true; usedSvc = "";
        resp = await callOnce(key, model, effort, messages, "");
        info = resp.ok ? "" : await errInfo(resp);
      }
      if (!resp.ok && (resp.status === 429 || resp.status >= 500)) { await sleep(500); resp = await callOnce(key, model, effort, messages, usedSvc); info = resp.ok ? "" : await errInfo(resp); }
      if (resp.ok) {
        const data = await resp.json();
        const msg = data.choices && data.choices[0] && data.choices[0].message;
        const result = msg ? String(msg.content || "").trim() : "";
        if (result) { working[tier] = { model, effort }; return { result, model, effort, usedSvc }; }
        continue;
      }
      last = resp.status;
      console.error("OpenAI", tier, model, effort, resp.status, info.slice(0, 200));
      if (resp.status === 401 || resp.status === 403) return { fatal: 401, last };
      if (resp.status === 404 || /model_not_found|does not exist|do not have access/i.test(info)) skipModels.add(model);
      if (working[tier] && working[tier].model === model && working[tier].effort === effort) working[tier] = null;
    } catch (e) {
      console.error(e);
      last = 0;
    }
  }
  return { last };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  const body = parseBody(event);
  if (body && body.warm === true) return json(200, { warm: true });     // 예열 — OpenAI를 부르지 않는다(접근 코드도 묻지 않는다)
  const acc = resolveAccount(event, "openai");
  if (acc.error) return acc.error;
  const key = acc.openaiKey;

  const text = body && typeof body.text === "string" ? body.text.trim() : "";
  const from = (body && body.from) || "the source language";
  const to = (body && body.to) || "English";
  const context = body && typeof body.context === "string" ? body.context.trim().slice(0, 1500) : "";
  const tier = body && body.tier === "std" ? "std" : "pro";
  if (!text) return json(400, { error: "text is required" });
  if (text.length > 4000) return json(413, { error: "text too long" });

  const t0 = Date.now();
  const { pairs, block, inText } = termsFor(text, context, from, to, userTermsOf(body && body.glossary));
  const messages = [
    { role: "system", content: systemPrompt(from, to, block) },
    { role: "user", content: context ? `CONTEXT (do not translate):\n${context}\n\nTEXT TO TRANSLATE:\n${text}` : text },
  ];

  const r1 = await translateWithPlan(key, tier, messages);
  if (r1.fatal) return json(502, { error: "OpenAI key rejected", status: r1.fatal });
  if (!r1.result) return json(502, { error: "translate failed", status: r1.last });

  /* 용어 검사 — 지정한 용어가 번역에 빠졌으면 한 번만 다시 번역하게 한다.
     더 나은 쪽(빠진 용어가 적은 쪽)을 돌려주므로, 다시 번역해서 오히려 나빠지는 일은 없다. */
  let result = r1.result, retried = false;
  const must = enforceable(pairs.filter((p) => inText.has(p.id)));       // 앞 문장에만 있던 용어는 이번 문장에 없어도 되므로 검사하지 않는다
  let missing = must.length ? G.checkOutput(must, result) : [];
  /* 실시간 통역(live)은 기다림이 더 큰 문제이므로 다시 번역하지 않는다 */
  if (missing.length && body.live !== true) {
    retried = true;
    const again = [...messages,
      { role: "assistant", content: result },
      { role: "user", content: `Your translation left out these glossary terms: ${missing.map((p) => `${p.src} → ${p.tgt}`).join("; ")}. ` +
        `If the source uses a term in its counseling sense, translate it exactly as listed. Keep everything else the same. Output only the corrected translation.` }];
    try {
      const resp = await callOnce(key, r1.model, r1.effort, again, r1.usedSvc);
      if (resp.ok) {
        const data = await resp.json();
        const m2 = data.choices && data.choices[0] && data.choices[0].message;
        const r2 = m2 ? String(m2.content || "").trim() : "";
        if (r2) {
          const miss2 = G.checkOutput(must, r2);
          if (miss2.length < missing.length) { result = r2; missing = miss2; }
        }
      }
    } catch (e) { console.error(e); }
  }
  return json(200, { result, model: r1.model, tier, ms: Date.now() - t0, fast: !!r1.usedSvc, terms: pairs.length, retried, missing: missing.map((p) => p.id) });
};
