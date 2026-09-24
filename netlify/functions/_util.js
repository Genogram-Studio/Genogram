/* 네 함수가 함께 쓰는 작은 도우미. 파일 이름이 _로 시작하므로 함수로 배포되지 않는다. */
const crypto = require("crypto");

exports.json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

exports.parseBody = (event) => {
  try { return JSON.parse(event.body || "{}"); } catch { return null; }
};

const timingSafeEq = (a, b) => {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  return A.length === B.length && A.length > 0 && crypto.timingSafeEqual(A, B);
};
const codeOf = (event) => {
  const h = event.headers || {};
  return String(h["x-access-code"] || h["X-Access-Code"] || "");
};

/* 접근 코드 — 함수 주소는 공개라서, 코드를 아는 사람만 부를 수 있게 한다(요청은 내 API 키로 청구된다).
   Netlify 환경변수 ACCESS_CODE를 설정하면 요청 머리글 x-access-code가 같아야 통과한다.
   설정하지 않으면 열려 있다(예전 배포가 갑자기 멈추지 않도록) — 통역판에서는 반드시 설정할 것.
   USER_ACCOUNTS가 설정된 배포에서는 이 함수를 쓰지 않는다(resolveAccount를 쓴다). */
exports.denied = (event) => {
  const need = process.env.ACCESS_CODE;
  if (!need) { console.warn("ACCESS_CODE is not set — this function is open to anyone who knows its URL"); return null; }
  const got = codeOf(event);
  return timingSafeEq(got, need) ? null : exports.json(401, { error: "access code required" });
};

/* ── 사용자별 계정(USER_ACCOUNTS) ──────────────────────────────────────────
   여러 사람이 한 통역판을 쓰되, 사람마다 자기 OpenAI 프로젝트 키로 청구되게 한다.
   Netlify 환경변수 USER_ACCOUNTS 에 다음 형태의 JSON 배열을 한 줄로 넣는다:
     [{"id":"counselor_a","code":"길고 무작위인 코드 A","openaiKey":"sk-proj-...","deeplKey":"..."(선택)}, …]
   · code는 사용자에게 알려 주는 비밀 코드(12자 이상 권장). openaiKey/deeplKey는 알려 주지 않는다.
   · 이 환경변수가 있으면 예전 ACCESS_CODE·공용 OPENAI_API_KEY·DEEPL_API_KEY로는 이 함수들을 부를 수 없다
     (한 사람의 사용량이 다른 사람 계정으로 잡히는 사고를 막기 위해).
   · 설정이 잘못돼 있으면(JSON이 깨졌거나, 코드가 중복되거나, openaiKey가 빠지면) 요청을 막는다 — 비용이
     엉뚱한 계정에 잡히는 것보다 잠깐 막히는 쪽이 안전하다.
   상담 내용은 여기서 저장하지 않는다. 사용자 식별(userId)은 로그에만 남고 응답에는 포함하지 않는다. */
let _accountsCache = null; // { list, byCode: Map, error } — 콜드 스타트 동안 재사용
const loadAccounts = () => {
  const raw = process.env.USER_ACCOUNTS;
  if (!raw) return null;
  if (_accountsCache && _accountsCache.raw === raw) return _accountsCache;
  let list, error = null;
  try {
    list = JSON.parse(raw);
    if (!Array.isArray(list) || !list.length) throw new Error("USER_ACCOUNTS must be a non-empty JSON array");
  } catch (e) {
    error = `USER_ACCOUNTS is not valid JSON: ${e.message}`;
    _accountsCache = { raw, list: [], byCode: new Map(), error };
    return _accountsCache;
  }
  const byCode = new Map();
  const seenCode = new Set(), seenId = new Set();
  for (const a of list) {
    const id = String((a && a.id) || "").trim();
    const code = String((a && a.code) || "").trim();
    const openaiKey = String((a && a.openaiKey) || "").trim();
    const deeplKey = String((a && a.deeplKey) || "").trim();
    if (!id || !code || !openaiKey) { error = `USER_ACCOUNTS entry is missing id/code/openaiKey (id=${id || "?"})`; break; }
    if (code.length < 8) { error = `USER_ACCOUNTS code for "${id}" is too short (min 8 chars)`; break; }
    if (seenCode.has(code)) { error = `USER_ACCOUNTS has a duplicate code`; break; }
    if (seenId.has(id)) { error = `USER_ACCOUNTS has a duplicate id "${id}"`; break; }
    seenCode.add(code); seenId.add(id);
    byCode.set(code, { id, openaiKey, deeplKey: deeplKey || null });
  }
  _accountsCache = { raw, list, byCode, error };
  return _accountsCache;
};

/** need: "openai" | "deepl". 성공하면 { userId, openaiKey?, deeplKey? }, 실패하면 { error: <json 응답> }를 돌려준다.
    사용자마다 자기 계정으로 청구되도록, 이 함수가 돌려준 키만 써야 한다 — process.env.OPENAI_API_KEY를
    USER_ACCOUNTS가 설정된 뒤에 직접 읽으면 안 된다. */
exports.resolveAccount = (event, need) => {
  const accounts = loadAccounts();
  if (accounts) {
    if (accounts.error) { console.error("USER_ACCOUNTS misconfigured:", accounts.error); return { error: exports.json(500, { error: "server account configuration error — ask the administrator" }) }; }
    const got = codeOf(event);
    if (!got) return { error: exports.json(401, { error: "access code required" }) };
    let match = null;
    for (const [code, acc] of accounts.byCode) if (timingSafeEq(got, code)) { match = acc; break; }
    if (!match) return { error: exports.json(401, { error: "access code required" }) };
    if (need === "deepl" && !match.deeplKey) return { error: exports.json(403, { error: "DeepL is not enabled for this user" }) };
    console.log(`request for account ${match.id}`); // 사용량을 앱에 저장하지 않는다 — 비용은 OpenAI 프로젝트별 Usage 화면에서 본다
    return { userId: match.id, openaiKey: match.openaiKey, deeplKey: match.deeplKey || null };
  }
  // USER_ACCOUNTS가 없으면 예전 방식(공용 ACCESS_CODE + 공용 키)으로 동작한다
  const no = exports.denied(event);
  if (no) return { error: no };
  const openaiKey = process.env.OPENAI_API_KEY || null;
  const deeplKey = process.env.DEEPL_API_KEY || null;
  if (need === "openai" && !openaiKey) return { error: exports.json(500, { error: "OPENAI_API_KEY is not set" }) };
  if (need === "deepl" && !deeplKey) return { error: exports.json(500, { error: "DEEPL_API_KEY is not set" }) };
  return { userId: null, openaiKey, deeplKey };
};
