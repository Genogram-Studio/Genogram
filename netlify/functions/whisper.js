/* 음성 인식 — POST { audio: base64, lang: "ko"|"zh"|"en"…, mime? } → { text, model }
   whisper-1과 gpt-4o-transcribe 계열은 2027년 2월 26일에 종료되므로(OpenAI 공지),
   후속 모델 gpt-transcribe를 먼저 쓰고 안 되면 이전 모델로 내려간다.
   환경변수: OPENAI_API_KEY(필수) · OPENAI_STT_MODEL(쉼표로 여러 개 가능)
   USER_ACCOUNTS가 설정되어 있으면 OPENAI_API_KEY 대신 사용자 계정별 키를 쓴다(_util.resolveAccount).  */
const { json, parseBody, resolveAccount } = require("./_util");

const preferred = (process.env.OPENAI_STT_MODEL || "").split(",").map((s) => s.trim()).filter(Boolean);
const MODELS = [...new Set([...preferred, "gpt-transcribe", "gpt-4o-transcribe", "whisper-1"])];

/* 상담 용어를 알려 주면 '가계도', '자기분화' 같은 낱말을 더 정확히 받아 적는다 */
const HINT = "Family counseling session. Terms: genogram, differentiation of self, triangle, cutoff, family of origin. 가계도, 자기분화, 삼각관계, 원가족, 단절.";

const extOf = (mime) => (/mp4|m4a|aac/.test(mime || "") ? "m4a" : /ogg/.test(mime || "") ? "ogg" : /wav/.test(mime || "") ? "wav" : "webm");

async function transcribe(key, model, bytes, mime, lang, withHint) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mime || "audio/webm" }), `audio.${extOf(mime)}`);
  form.append("model", model);
  if (lang) form.append("language", lang);
  if (withHint) form.append("prompt", HINT);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 50000);
  try {
    return await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form, signal: ctl.signal,
    });
  } finally { clearTimeout(timer); }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });

  const body = parseBody(event);
  if (body && body.warm === true) return json(200, { warm: true });     // 예열 — OpenAI를 부르지 않는다
  const acc = resolveAccount(event, "openai");
  if (acc.error) return acc.error;
  const key = acc.openaiKey;
  if (!body || !body.audio) return json(400, { error: "audio is required" });

  let bytes;
  try { bytes = Buffer.from(body.audio, "base64"); } catch { return json(400, { error: "bad audio" }); }
  let status = 0;
  for (const model of MODELS) {
    for (const withHint of [true, false]) {          // 안내 문구를 받지 않는 모델이면 빼고 다시
      try {
        const resp = await transcribe(key, model, bytes, body.mime, body.lang, withHint);
        if (resp.ok) {
          const data = await resp.json();
          return json(200, { text: data.text || "", model });
        }
        status = resp.status;
        const err = await resp.text().catch(() => "");
        console.error("STT", model, withHint, resp.status, err.slice(0, 200));
        if (resp.status === 401 || resp.status === 403) return json(502, { error: "OpenAI key rejected", status });
        if (resp.status === 404) break;                // 모델 자체가 없으면 다음 모델로
      } catch (e) { console.error(e); }
    }
  }
  return json(502, { error: "transcribe failed", status });
};
