/* 음성 출력 — POST { text, lang, speed? } → audio/mpeg
   품질 우선: gpt-4o-mini-tts(말투·억양을 지시문으로 조절할 수 있는 가장 새 모델)와,
   OpenAI가 최고 품질로 권하는 marin 음성을 쓴다. 쓸 수 없으면 차례로 내려간다.
   환경변수: OPENAI_API_KEY(필수) · OPENAI_TTS_MODEL · OPENAI_TTS_VOICE 
   USER_ACCOUNTS가 설정되어 있으면 OPENAI_API_KEY 대신 사용자 계정별 키를 쓴다(_util.resolveAccount).  */
const { json, parseBody, resolveAccount } = require("./_util");

const MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const VOICE = process.env.OPENAI_TTS_VOICE || "marin";

/* 언어마다 어떻게 읽을지 지시한다. 상담 자리이므로 차분하고 또렷하게. */
const STYLE = {
  en: "Speak in clear, natural English with a calm, warm and steady pace, as a counselor speaking to a client.",
  zh: "請用自然、清晰的台灣華語（國語）朗讀，語氣溫和、語速平穩，像諮商師對案主說話。",
  ko: "차분하고 따뜻하며 또렷한 한국어로, 상담자가 내담자에게 말하듯 일정한 속도로 읽어 주세요.",
  th: "Speak clearly and calmly in natural Thai, with a warm, steady pace suitable for a counseling session.",
  km: "Speak clearly and calmly in natural Khmer, with a warm, steady pace suitable for a counseling session.",
  fr: "Parlez en français naturel, clairement et avec calme, sur un ton chaleureux adapté à un entretien de conseil.",
};

async function speak(key, body) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    return await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
  } finally { clearTimeout(timer); }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "POST only" });

  const req = parseBody(event);
  if (req && req.warm === true) return json(200, { warm: true });     // 예열 — OpenAI를 부르지 않는다
  const acc = resolveAccount(event, "openai");
  if (acc.error) return acc.error;
  const key = acc.openaiKey;
  const text = req && typeof req.text === "string" ? req.text.trim() : "";
  if (!text) return json(400, { error: "text is required" });
  const lang = req && STYLE[req.lang] ? req.lang : "en";
  const speed = req && Number(req.speed) >= 0.5 && Number(req.speed) <= 1.5 ? Number(req.speed) : 1;
  const input = text.slice(0, 4000);

  /* 1) 최고 품질  2) 음성이 안 맞으면 다른 음성  3) 모델을 쓸 수 없으면 tts-1-hd */
  const tries = [
    { model: MODEL, voice: VOICE, instructions: STYLE[lang] },
    { model: MODEL, voice: "coral", instructions: STYLE[lang] },
    { model: "tts-1-hd", voice: "nova" },
  ];
  let status = 0;
  try {
    for (const t of tries) {
      const resp = await speak(key, { ...t, input, speed, response_format: "mp3" });
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        return { statusCode: 200, headers: { "Content-Type": "audio/mpeg", "X-TTS-Model": t.model }, body: buf.toString("base64"), isBase64Encoded: true };
      }
      status = resp.status;
      const err = await resp.text().catch(() => "");
      console.error("TTS", t.model, t.voice, resp.status, err.slice(0, 200));
      if (resp.status === 401 || resp.status === 403) break;
    }
  } catch (e) { console.error(e); }
  return json(502, { error: "tts failed", status });
};
