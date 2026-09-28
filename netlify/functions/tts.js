/* 음성 출력 — POST { text, lang, speed?, zh?, voice? } → audio/mpeg
   · 중국어: zh:"tw"(기본)는 ElevenLabs 대만 목소리, zh:"cn"은 OpenAI 북경 표준어(普通話).
   · 한국어·영어: voice:"eleven"(기본)이면 ElevenLabs 중년 남성 목소리, voice:"openai"면 OpenAI.
   · 프랑스어·태국어·크메르어: OpenAI.
   실패하면 다른 목소리로 바꾸지 않고 오류(reason)를 돌려준다 — 화면이 멈추고 까닭을 알린다.
   환경변수: OPENAI_API_KEY(필수) · OPENAI_TTS_MODEL · OPENAI_TTS_VOICE · ELEVENLABS_API_KEY · ELEVENLABS_MODEL
   목소리 ID: ELEVENLABS_KOREAN_VOICE_ID · ELEVENLABS_ENGLISH_VOICE_ID · ELEVENLABS_TAIWAN_VOICE_ID (Netlify 환경변수에서만 읽는다)
   USER_ACCOUNTS가 설정되어 있으면 OPENAI_API_KEY 대신 사용자 계정별 키를 쓴다(_util.resolveAccount).  */
const { json, parseBody, resolveAccount } = require("./_util");

const MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const VOICE = process.env.OPENAI_TTS_VOICE || "marin";
/* 앱의 설정에서 고를 수 있는 OpenAI 목소리. 목록에 없는 값이 오면 무시하고 기본값을 쓴다. */
const OPENAI_VOICES = new Set(["marin", "cedar", "coral", "nova", "alloy", "sage", "ash", "ballad", "echo", "fable", "onyx", "shimmer", "verse"]);

/* 언어마다 어떻게 읽을지 지시한다. 상담 자리이므로 차분하고 또렷하게. */
const STYLE = {
  en: "Speak in clear, natural English with a calm, warm and steady pace, as a counselor speaking to a client.",
  zh: "請用標準的北京普通話朗讀（大陸標準發音、清楚的捲舌音與兒化），語氣溫和、語速平穩，像諮商師對案主說話。",
  ko: "차분하고 따뜻하며 또렷한 한국어로, 상담자가 내담자에게 말하듯 일정한 속도로 읽어 주세요.",
  th: "Speak clearly and calmly in natural Thai, with a warm, steady pace suitable for a counseling session.",
  km: "Speak clearly and calmly in natural Khmer, with a warm, steady pace suitable for a counseling session.",
  fr: "Parlez en français naturel, clairement et avec calme, sur un ton chaleureux adapté à un entretien de conseil.",
};

/* 목소리 ID는 코드에 적지 않고 Netlify 환경변수에서 읽는다.
   (코드에 적으면 Netlify의 비밀값 검사가 빌드를 막는다.) 환경변수 이름은 대문자로 정확히 맞춘다. */
const EL_VOICES = {
  tw: { env: "ELEVENLABS_TAIWAN_VOICE_ID", lang: "zh", tag: "elevenlabs-tw" },   // 대만 중국어
  ko: { env: "ELEVENLABS_KOREAN_VOICE_ID", lang: "ko", tag: "elevenlabs-ko" },   // 한국 중년 남성
  en: { env: "ELEVENLABS_ENGLISH_VOICE_ID", lang: "en", tag: "elevenlabs-en" },  // 영어 중년 남성
};
/* flash는 첫 소리까지 가장 빠른 모델이다. 억양은 목소리가 정하므로 대만 목소리를 그대로 유지한다. */
const EL_MODEL = (process.env.ELEVENLABS_MODEL || "").trim() || "eleven_flash_v2_5";

async function elevenVoice(v, text, speed) {
  const key = (process.env.ELEVENLABS_API_KEY || "").trim();
  if (!key) return json(503, { error: "ELEVENLABS_API_KEY is not set", reason: "missing_key" });
  const voiceId = (process.env[v.env] || "").trim();
  if (!voiceId) return json(503, { error: `${v.env} is not set`, reason: "missing_voice_id" });
  try {
    const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_64`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: EL_MODEL, language_code: v.lang, voice_settings: { stability: 0.5, similarity_boost: 0.8, speed: Math.min(1.2, Math.max(0.7, speed)) } }),
      signal: AbortSignal.timeout(15000),
    });
    const type = (resp.headers.get("content-type") || "").toLowerCase();
    if (!resp.ok || !type.startsWith("audio/")) {
      console.error("ElevenLabs", resp.status);
      await resp.body?.cancel();
      return json(502, { error: "elevenlabs failed", reason: resp.ok ? "invalid_audio" : `http_${resp.status}` });
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    if (!buf.length) return json(502, { error: "elevenlabs failed", reason: "empty_audio" });
    return { statusCode: 200, headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Voice-Provider": v.tag }, body: buf.toString("base64"), isBase64Encoded: true };
  } catch (e) {
    return json(502, { error: "elevenlabs failed", reason: e.name === "TimeoutError" || e.name === "AbortError" ? "timeout" : "network" });
  }
}

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
  if (req && req.warm === true) return json(200, { warm: true });     // 예열 — 유료 API를 부르지 않는다
  const acc = resolveAccount(event, "openai");
  if (acc.error) return acc.error;
  const key = acc.openaiKey;
  const text = req && typeof req.text === "string" ? req.text.trim() : "";
  if (!text) return json(400, { error: "text is required" });
  const lang = req && STYLE[req.lang] ? req.lang : "en";
  const picked = req && typeof req.openaiVoice === "string" ? req.openaiVoice.trim().toLowerCase() : "";
  const oaVoice = OPENAI_VOICES.has(picked) ? picked : VOICE;
  const speed = req && Number(req.speed) >= 0.5 && Number(req.speed) <= 1.5 ? Number(req.speed) : 1;
  const input = text.slice(0, 4000);
  if (lang === "zh" && req.zh !== "cn") return elevenVoice(EL_VOICES.tw, input, speed);
  if ((lang === "ko" || lang === "en") && req.voice !== "openai") return elevenVoice(EL_VOICES[lang], input, speed);

  /* 목소리는 하나만 쓴다 — 실패해도 다른 목소리로 바꾸지 않는다 */
  const model = lang === "zh" && !/^gpt-4o-mini-tts/.test(MODEL) ? "gpt-4o-mini-tts" : MODEL;   // 발음 지시를 따르는 모델
  const tries = [{ model, voice: oaVoice, instructions: STYLE[lang] }];
  let status = 0;
  try {
    for (const t of tries) {
      const resp = await speak(key, { ...t, input, speed, response_format: "mp3" });
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        return { statusCode: 200, headers: { "Content-Type": "audio/mpeg", "X-TTS-Model": t.model, "X-Voice-Provider": lang === "zh" ? "openai-cn" : "openai" }, body: buf.toString("base64"), isBase64Encoded: true };
      }
      status = resp.status;
      const err = await resp.text().catch(() => "");
      console.error("TTS", t.model, t.voice, resp.status, err.slice(0, 200));
      if (resp.status === 401 || resp.status === 403) break;
    }
  } catch (e) { console.error(e); }
  return json(502, { error: "tts failed", status, reason: status ? `openai_${status}` : "openai_network" });
};
