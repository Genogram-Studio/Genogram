/* DeepL 번역 — POST { texts: [..], target_lang } → { translations: [..] }
   환경변수 DEEPL_API_KEY. 무료 키(":fx"로 끝남)는 api-free 주소를 쓴다.
   USER_ACCOUNTS가 설정되어 있으면 그 사용자 계정의 deeplKey를 쓴다 — 없는 사용자는 이 함수를 쓸 수 없다(403). */
const { json, parseBody, resolveAccount } = require("./_util");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });
  const acc = resolveAccount(event, "deepl");
  if (acc.error) return acc.error;
  const key = acc.deeplKey;

  const body = parseBody(event);
  const texts = body && Array.isArray(body.texts) ? body.texts.filter((t) => typeof t === "string") : [];
  if (!texts.length) return json(400, { error: "texts is required" });
  const target_lang = (body && body.target_lang) || "EN";

  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  try {
    const resp = await fetch(`https://${host}/v2/translate`, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: texts, target_lang }),
    });
    if (!resp.ok) return json(502, { error: "DeepL request failed", status: resp.status });
    const data = await resp.json();
    return json(200, { translations: (data.translations || []).map((t) => t.text) });
  } catch (e) {
    console.error(e);
    return json(500, { error: "translate failed" });
  }
};
