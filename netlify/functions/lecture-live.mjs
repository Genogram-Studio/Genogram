/* 강의 메모 실시간 공유 — 강사의 맥에서 쓰는 메모를 QR로 들어온 화면(아이폰·학생 휴대폰)에 보여 준다.

   이음(ieum) 앱의 자막 방과 같은 방식이다: Netlify Blobs에 방(room) 하나를 두고,
   강사 화면이 바뀔 때마다 통째로 올리고(push), 보는 화면은 1~3초마다 새 판이 있는지 묻는다(GET).

   · 방 열기(open)는 접근 코드(USER_ACCOUNTS 또는 ACCESS_CODE)가 있어야 한다 — 아무나 저장소를 쓰지 못하게.
     열면 방 코드와 함께 '쓰기 열쇠(token)'를 돌려준다. 그 뒤의 올리기·닫기는 이 열쇠로만 된다.
   · 보기(GET)는 방 코드만 알면 된다 — QR로 들어온 사람은 코드 입력 없이 본다.
   · OpenAI·DeepL을 부르지 않는다(비용 없음). 번역은 강사 화면에서 이미 끝난 것을 함께 싣는다.
   · 방은 24시간이 지나면 닫힌 것으로 본다.

   보는 사람의 '보낸 메모'(submit)는 방과 따로 `subs-${room}`에 모은다 — 강사의 올리기와 겹쳐 쓰지 않게.
   · 보낼 때 쓰는 cid(보낸 사람 기기의 무작위 번호)는 비밀처럼 다룬다. 응답에는 싣지 않고, 번호(no)와 가명만 보인다.
     같은 cid로 다시 보내면 그 사람 메모가 새것으로 바뀌고, 거두기(unsubmit)도 cid로만 된다.
   · 보낸 메모는 그 방에 들어온 모든 사람이 본다. 강사는 쓰기 열쇠로 하나씩 내릴 수 있다(remove).
   · 여러 사람이 동시에 보내도 하나도 잃지 않도록 조건부 쓰기(etag)로 다시 시도한다. */
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
const MAX_SUBS = 200, MAX_SUB_CARDS = 60, MAX_SUB_INK = 400, MAX_SUB_BYTES = 350_000;
const SUBS = (room) => `subs-${room}`;
const cleanName = (v) => String(v || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 24);
/* 보낸 메모에서 그림에 필요한 것만 남긴다 */
function cleanSub(doc) {
  const cards = (Array.isArray(doc?.cards) ? doc.cards : []).slice(0, MAX_SUB_CARDS).map((c) => ({
    id: String(c.id || "").slice(0, 40), x: +c.x || 0, y: +c.y || 0, w: Math.min(800, Math.max(120, +c.w || 300)),
    size: Math.min(48, Math.max(8, +c.size || 18)), color: String(c.color || "#1F2937").slice(0, 16), text: String(c.text || "").slice(0, 2000),
  })).filter((c) => c.id && c.text.trim());
  const ids = new Set(cards.map((c) => c.id));
  const links = (Array.isArray(doc?.links) ? doc.links : []).slice(0, 200).map((l) => ({ id: String(l.id || "").slice(0, 40), a: String(l.a || "").slice(0, 40), b: String(l.b || "").slice(0, 40) })).filter((l) => l.id && l.a && l.b);
  const ink = (Array.isArray(doc?.ink) ? doc.ink : []).slice(0, MAX_SUB_INK).filter((st) => st && Array.isArray(st.pts)).map((st) => ({
    id: String(st.id || "").slice(0, 40), color: String(st.color || "#1F2937").slice(0, 16), w: Math.min(40, Math.max(1, +st.w || 2)), hi: !!st.hi,
    pts: st.pts.slice(0, 1500).map((p) => [+p[0] || 0, +p[1] || 0, +p[2] || 0.5]),
  }));
  return { cards, links: links.filter((l) => ids.has(l.a) || ids.has(l.b)), ink };
}
async function updateSubs(store, room, update) {
  for (let i = 0; i < 8; i++) {
    const prev = await store.getWithMetadata(SUBS(room), { type: "json" });
    const cur = prev?.data && typeof prev.data === "object" ? prev.data : { sv: 0, next: 1, items: {} };
    const next = update(cur);
    if (next === cur) return cur;
    const r = await store.setJSON(SUBS(room), next, prev ? { onlyIfMatch: prev.etag } : { onlyIfNew: true });
    if (r?.modified !== false) return next;
    await new Promise((res) => setTimeout(res, 40 + Math.random() * 120));
  }
  const e = new Error("busy"); e.name = "SubsConflict"; throw e;
}
const publicSubs = (subs) => Object.values(subs?.items || {}).sort((a, b) => a.no - b.no).map(({ cid, ...rest }) => rest);
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
    const out = { ver: data.ver || 0 };
    if ((data.ver || 0) > after) out.doc = data.doc || null;
    /* sa: 보는 쪽이 가진 '보낸 메모' 판 번호 — 주면 함께 확인한다 */
    if (url.searchParams.has("sa")) {
      const sa = Number(url.searchParams.get("sa")) || 0;
      let subs = null;
      try { subs = await store.get(SUBS(room), { type: "json" }); } catch (e) { console.error("subs get", e); }
      out.sv = subs?.sv || 0;
      if (out.sv > sa) out.subs = publicSubs(subs);
    }
    return reply(200, out);
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

  /* ── 보낸 메모 — 방 코드와 보낸 사람의 cid로 ── */
  if (body.action === "submit" || body.action === "unsubmit") {
    const room = String(body.room || "").toLowerCase();
    const cid = String(body.cid || "");
    if (!ROOM_RE.test(room) || !/^[A-Za-z0-9-]{16,64}$/.test(cid)) return reply(400, { error: "bad request" });
    let data;
    try { data = await store.get(room, { type: "json" }); } catch (e) { console.error("get", e); return reply(502, { error: "storage read failed" }); }
    if (!data) return reply(404, { error: "gone" });
    if (expired(data)) return reply(410, { error: "closed" });
    let memo = null;
    if (body.action === "submit") {
      memo = cleanSub(body.doc);
      if (!memo.cards.length && !memo.ink.length) return reply(400, { error: "empty" });
      if (JSON.stringify(memo).length > MAX_SUB_BYTES) return reply(413, { error: "memo too large" });
    }
    try {
      let mine = null;
      const subs = await updateSubs(store, room, (cur) => {
        const items = { ...(cur.items || {}) };
        if (body.action === "unsubmit") {
          if (!items[cid]) return cur;
          delete items[cid];
          return { ...cur, sv: (cur.sv || 0) + 1, items };
        }
        const had = items[cid];
        if (!had && Object.keys(items).length >= MAX_SUBS) { const e = new Error("full"); e.name = "SubsFull"; throw e; }
        const no = had ? had.no : cur.next || 1;
        items[cid] = { cid, no, name: cleanName(body.name), at: Date.now(), ...memo };
        mine = no;
        return { ...cur, sv: (cur.sv || 0) + 1, next: had ? cur.next : no + 1, items };
      });
      return reply(200, { ok: true, sv: subs.sv, no: mine });
    } catch (e) {
      if (e.name === "SubsFull") return reply(409, { error: "too many memos in this room" });
      console.error("submit", e); return reply(503, { error: "busy, try again" });
    }
  }

  /* ── 올리기·닫기 — 쓰기 열쇠가 맞아야 한다 ── */
  const room = String(body.room || "").toLowerCase();
  if (!ROOM_RE.test(room)) return reply(400, { error: "bad room" });
  let data;
  try { data = await store.get(room, { type: "json" }); } catch (e) { console.error("get", e); return reply(502, { error: "storage read failed" }); }
  if (!data) return reply(404, { error: "gone" });
  if (!sameToken(body.token, data.token)) return reply(403, { error: "not the owner of this room" });

  if (body.action === "close") {
    try {
      await store.setJSON(room, { ...data, doc: null, closed: true, at: Date.now() });
      await store.delete(SUBS(room));
    } catch (e) { console.error("close", e); return reply(502, { error: "storage write failed" }); }
    return reply(200, { ok: true, closed: true });
  }
  if (body.action === "push") {
    if (!body.doc || typeof body.doc !== "object" || !Array.isArray(body.doc.cards)) return reply(400, { error: "bad memo" });
    const ver = (data.ver || 0) + 1;
    try { await store.setJSON(room, { token: data.token, ver, doc: body.doc, at: Date.now(), closed: false }); }
    catch (e) { console.error("push", e); return reply(502, { error: "storage write failed" }); }
    return reply(200, { ok: true, ver });
  }
  if (body.action === "remove") {
    const no = Number(body.no);
    try {
      const subs = await updateSubs(store, room, (cur) => {
        const items = { ...(cur.items || {}) };
        const hit = Object.keys(items).find((k) => items[k].no === no);
        if (!hit) return cur;
        delete items[hit];
        return { ...cur, sv: (cur.sv || 0) + 1, items };
      });
      return reply(200, { ok: true, sv: subs.sv });
    } catch (e) { console.error("remove", e); return reply(503, { error: "busy, try again" }); }
  }
  return reply(400, { error: "unknown action" });
};
