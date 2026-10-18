/* 강의 메모 실시간 공유 — 강사의 맥에서 쓰는 메모를 QR로 들어온 화면(아이폰·학생 휴대폰)에 보여 준다.

   이음(ieum) 앱의 자막 방과 같은 방식이다: Netlify Blobs에 방(room) 하나를 두고,
   강사 화면이 바뀔 때마다 통째로 올리고(push), 보는 화면은 1~3초마다 새 판이 있는지 묻는다(GET).

   · 방 열기(open)는 접근 코드(USER_ACCOUNTS 또는 ACCESS_CODE)가 있어야 한다 — 아무나 저장소를 쓰지 못하게.
     열면 방 코드와 함께 '쓰기 열쇠(token)'를 돌려준다. 그 뒤의 올리기·닫기는 이 열쇠로만 된다.
   · 보기(GET)는 방 코드만 알면 된다 — QR로 들어온 사람은 코드 입력 없이 본다.
   · OpenAI·DeepL을 부르지 않는다(비용 없음). 번역은 강사 화면에서 이미 끝난 것을 함께 싣는다.
   · 방은 24시간이 지나면 닫힌 것으로 본다. */
import { getStore } from "@netlify/blobs";
import { randomUUID, timingSafeEqual } from "node:crypto";
import util from "./_util.js";

const STORE = "lecture-live";
const ROOM_RE = /^[a-z0-9]{6}$/;
const ROOM_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";      // 헷갈리는 글자(0·o·1·l·i) 빼고
const MAX_BYTES = 1_800_000;
const TTL_MS = 24 * 3600 * 1000;

const reply = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Netlify-CDN-Cache-Control": "no-store" },
});
const sameToken = (a, b) => {
  const A = Buffer.from(String(a || "")), B = Buffer.from(String(b || ""));
  return A.length === B.length && A.length > 0 && timingSafeEqual(A, B);
};
const newRoom = () => { let s = ""; for (let i = 0; i < 6; i++) s += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)]; return s; };
const expired = (data) => !data || data.closed || Date.now() - (data.at || 0) > TTL_MS;

export default async (request) => {
  let store;
  try { store = getStore({ name: STORE, consistency: "strong" }); }
  catch (e) { console.error("blobs", e); return reply(503, { error: "storage unavailable" }); }

  /* ── 보기 ── */
  if (request.method === "GET") {
    const url = new URL(request.url);
    const room = String(url.searchParams.get("room") || "").toLowerCase();
    const after = Number(url.searchParams.get("after")) || 0;
    if (!ROOM_RE.test(room)) return reply(400, { error: "bad room" });
    let data;
    try { data = await store.get(room, { type: "json" }); } catch (e) { console.error("get", e); return reply(502, { error: "storage read failed" }); }
    if (!data) return reply(200, { gone: true });
    if (expired(data)) return reply(200, { closed: true, ver: data.ver || 0 });
    if ((data.ver || 0) <= after) return reply(200, { ver: data.ver || 0 });
    return reply(200, { ver: data.ver || 0, doc: data.doc || null });
  }
  if (request.method !== "POST") return reply(405, { error: "GET or POST only" });

  const raw = await request.text();
  if (raw.length > MAX_BYTES) return reply(413, { error: "memo too large" });
  let body;
  try { body = JSON.parse(raw || "{}"); } catch { return reply(400, { error: "bad json" }); }
  if (body && body.warm === true) return reply(200, { warm: true });

  /* ── 방 열기 — 접근 코드가 맞아야 한다 ── */
  if (body.action === "open") {
    const event = { headers: Object.fromEntries(request.headers) };
    const acc = util.resolveAccount(event, "none");
    if (acc.error) return new Response(acc.error.body, { status: acc.error.statusCode, headers: acc.error.headers });
    const token = randomUUID();
    for (let i = 0; i < 6; i++) {
      const room = newRoom();
      try {
        const r = await store.setJSON(room, { token, ver: 0, doc: null, at: Date.now(), closed: false }, { onlyIfNew: true });
        if (r && r.modified === false) continue;
        return reply(200, { room, token });
      } catch (e) { console.error("open", e); return reply(502, { error: "storage write failed" }); }
    }
    return reply(503, { error: "could not allocate a room" });
  }

  /* ── 올리기·닫기 — 쓰기 열쇠가 맞아야 한다 ── */
  const room = String(body.room || "").toLowerCase();
  if (!ROOM_RE.test(room)) return reply(400, { error: "bad room" });
  let data;
  try { data = await store.get(room, { type: "json" }); } catch (e) { console.error("get", e); return reply(502, { error: "storage read failed" }); }
  if (!data) return reply(404, { error: "gone" });
  if (!sameToken(body.token, data.token)) return reply(403, { error: "not the owner of this room" });

  if (body.action === "close") {
    try { await store.setJSON(room, { ...data, doc: null, closed: true, at: Date.now() }); } catch (e) { console.error("close", e); return reply(502, { error: "storage write failed" }); }
    return reply(200, { ok: true, closed: true });
  }
  if (body.action === "push") {
    if (!body.doc || typeof body.doc !== "object" || !Array.isArray(body.doc.cards)) return reply(400, { error: "bad memo" });
    const ver = (data.ver || 0) + 1;
    try { await store.setJSON(room, { token: data.token, ver, doc: body.doc, at: Date.now(), closed: false }); }
    catch (e) { console.error("push", e); return reply(502, { error: "storage write failed" }); }
    return reply(200, { ok: true, ver });
  }
  return reply(400, { error: "unknown action" });
};
