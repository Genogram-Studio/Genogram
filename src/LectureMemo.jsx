/* ══ 강의 메모 ══════════════════════════════════════════════════════
   강의하다가 가계도 대신 강의안을 써야 할 때 쓰는 빈 화면.
   가계도의 설명 상자·필기·형광펜·연결을 떼어 와 단순하게 다시 짰다.

   · 메모 상자: 한글(또는 영어·중국어 등)로 적으면, 통역판에서는 고른 언어
     (영어·크메르어·태국어·중국어)로 번역해 상자 안에 함께 보여 준다.
     기본판에서는 번역 없이 필기 전용으로 쓴다(translate가 null).
   · 필기·형광펜·지우개: 애플 펜슬 손바닥 걸러내기와 필압은 가계도와 같은 규칙.
   · 연결: 상자와 상자를 화살표로 잇는다.
   · 메모는 강의별로 이 기기에 자동 저장되고, 파일로 내보내고 열 수 있다.
   가계도 문서와는 따로 보관하므로, 가계도 ⇄ 강의 메모를 오가도 서로 지워지지 않는다. */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BASE_LANG_COUNT, packText } from "./locales.js";
import { inkHit, stepFont } from "./drawingTools.js";

const C = {
  ink: "#14243A", ink2: "#2D435D", mute: "#3D5064", faint: "#A6B4C2",
  paper: "#EDF1F5", canvas: "#FBFCFD", grid: "#E2E9EF", rule: "#DCE4EB",
  pine: "#1B3350", pine2: "#2C4A6E", sage: "#5C7A96", sageSoft: "#E6EEF5",
  gold: "#A67C34", goldSoft: "#F6EFE0", red: "#A8412C",
};
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Noto Sans TC', 'PingFang TC', 'Noto Sans Khmer', 'Khmer Sangam MN', 'Khmer MN', 'Noto Sans Thai', 'Thonburi', sans-serif";

const COLORS = [
  { id: "ink", c: "#1F2937" }, { id: "blue", c: "#3B82C4" }, { id: "red", c: "#D14836" },
  { id: "green", c: "#3FA66B" }, { id: "pink", c: "#E4557F" }, { id: "yellow", c: "#F2C230" },
];
const PEN_W = [2, 3.5, 6];
const HI_W = [12, 20, 30];

/* 메모에 쓰는 언어. gpt는 번역 함수가 알아보는 이름(중국어는 앱 전체가 번체를 쓴다). */
export const MEMO_LANGS = [
  { id: "ko", label: "한국어", tag: "한", gpt: "한국어" },
  { id: "en", label: "English", tag: "EN", gpt: "English" },
  { id: "km", label: "ខ្មែរ", tag: "KM", gpt: "ភាសាខ្មែរ" },
  { id: "th", label: "ไทย", tag: "TH", gpt: "ภาษาไทย" },
  { id: "zh", label: "中文", tag: "中", gpt: "繁體中文" },
];
const LANG_BY_ID = Object.fromEntries(MEMO_LANGS.map((l) => [l.id, l]));
const DEFAULT_SHOW = { ko: false, en: true, km: true, th: true, zh: true };

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* 상자에 적은 글이 어느 언어인지 — 글자 수가 가장 많은 문자군으로 정한다 */
export function detectMemoLang(text) {
  const s = String(text || "");
  const n = (re) => (s.match(re) || []).length;
  const counts = {
    ko: n(/[ㄱ-ㆎ가-힣]/g),
    zh: n(/[㐀-鿿]/g),
    th: n(/[ก-ฺเ-๎]/g) / 2,
    km: n(/[ក-៓៝]/g) / 2,
    en: n(/[A-Za-z]/g) / 2,
  };
  let best = "ko", max = 0;
  for (const k of ["ko", "zh", "th", "km", "en"]) if (counts[k] > max) { max = counts[k]; best = k; }
  return best;
}

export function emptyMemo() {
  return { kind: "lecture-memo", version: 1, id: uid(), title: "", cards: [], links: [], ink: [], show: { ...DEFAULT_SHOW }, savedAt: "" };
}
export function normalizeMemo(d) {
  if (!d || typeof d !== "object") return emptyMemo();
  return {
    ...emptyMemo(), ...d,
    id: d.id || uid(),
    cards: Array.isArray(d.cards) ? d.cards.filter((c) => c && c.id).map((c) => ({ w: 300, size: 18, color: COLORS[0].c, text: "", tr: {}, ...c, x: +c.x || 0, y: +c.y || 0 })) : [],
    links: Array.isArray(d.links) ? d.links.filter((l) => l && l.a && l.b) : [],
    ink: Array.isArray(d.ink) ? d.ink.filter((s) => s && Array.isArray(s.pts)) : [],
    show: { ...DEFAULT_SHOW, ...(d.show || {}) },
  };
}
const hasContent = (d) => !!(d.title || d.cards.length || d.ink.length);

/* 점을 부드러운 곡선으로 잇는다(가계도의 필기와 같은 방식) */
function inkPath(pts) {
  if (!pts.length) return "";
  if (pts.length < 3) return `M ${pts.map((q) => `${q[0]} ${q[1]}`).join(" L ")}`;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q ${pts[i][0]} ${pts[i][1]} ${mx} ${my}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L ${last[0]} ${last[1]}`;
}

/* 상자 가운데에서 다른 상자 쪽으로 뻗은 선이 상자 테두리와 만나는 점 */
function edgeToward(r, tx, ty, pad = 6) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2, dx = tx - cx, dy = ty - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  const sx = dx ? (r.w / 2 + pad) / Math.abs(dx) : Infinity, sy = dy ? (r.h / 2 + pad) / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

/* 번역 결과는 기기 메모리에 모아 둔다 — 되돌리기·다시 열기 때 같은 글을 다시 부르지 않게 */
const TR_CACHE = new Map();
const MAX_PARALLEL = 4;
/* 화면을 오가도(가계도 ⇄ 강의 메모) 그리던 메모가 그대로 남도록 */
let MEM = null;

const IDX_KEY = "gs:lec:index", LAST_KEY = "gs:lec:last", DOC_KEY = (id) => `gs:lec:${id}`;

export default function LectureMemo({ li = 1, storage = null, translate = null, flash = () => {} }) {
  const tx = (v) => (li < BASE_LANG_COUNT ? v[li] ?? v[0] : packText(v, li) ?? v[0]);

  /* ── 문서와 되돌리기 ─────────────────────────────── */
  const [hist, setHist] = useState(() => ({ past: [], present: MEM?.doc || emptyMemo(), future: [] }));
  const doc = hist.present;
  const apply = useCallback((updater, record = true) => {
    setHist((h) => {
      const next = typeof updater === "function" ? updater(h.present) : updater;
      if (!next || next === h.present) return h;
      return record ? { past: [...h.past, h.present].slice(-80), present: next, future: [] } : { ...h, present: next };
    });
  }, []);
  const undo = () => setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h));
  const redo = () => setHist((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h));
  const openDoc = (d) => { setHist({ past: [], present: normalizeMemo(d), future: [] }); setSel(null); setEditing(null); setPendingLink(null); setNeedFit(true); };

  /* ── 화면 상태 ─────────────────────────────── */
  const [view, setView] = useState(() => MEM?.view || { x: 40, y: 30, k: 1 });
  const viewRef = useRef(view); viewRef.current = view;
  const [mode, setMode] = useState("select");            // select | text | connect | pen | hi | erase
  const [color, setColor] = useState(COLORS[0].c);
  const [hiColor, setHiColor] = useState(COLORS[5].c);
  const [widthIdx, setWidthIdx] = useState(1);
  const [sel, setSel] = useState(null);                   // {kind:'card'|'link', id}
  const [editing, setEditing] = useState(null);           // {id, value}
  const [pendingLink, setPendingLink] = useState(null);   // 연결을 시작한 상자 id
  const [live, setLive] = useState(null);                 // 긋고 있는 획
  const [sizes, setSizes] = useState({});                 // 상자의 실제 크기(연결선·맞춤용)
  const [index, setIndex] = useState([]);                 // 저장된 강의 메모 목록
  const [drawer, setDrawer] = useState(false);
  const [present, setPresent] = useState(false);
  const [needFit, setNeedFit] = useState(false);
  const [tick, setTick] = useState(0);                    // 번역 진행 상태가 바뀔 때 다시 그린다
  const boardRef = useRef(null), rootRef = useRef(null), fileRef = useRef(null);
  const cardEls = useRef({});
  const gesture = useRef(null);
  const pointers = useRef(new Map());
  const penSeen = useRef(false);
  const inflight = useRef(new Set());
  const failed = useRef(new Set());
  const loadedRef = useRef(!!MEM);

  useEffect(() => { MEM = { doc, view }; }, [doc, view]);

  /* ── 불러오기와 자동 저장 ─────────────────────────────── */
  useEffect(() => {
    if (!storage) return;
    let alive = true;
    (async () => {
      try { const r = await storage.get(IDX_KEY); if (alive && r?.value) setIndex(JSON.parse(r.value) || []); } catch {}
      if (loadedRef.current) return;
      try {
        const last = await storage.get(LAST_KEY);
        const r = last?.value ? await storage.get(DOC_KEY(last.value)) : null;
        if (alive && r?.value && !loadedRef.current) openDoc(JSON.parse(r.value));
      } catch {}
      loadedRef.current = true;
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage]);

  useEffect(() => {
    if (!storage || !hasContent(doc)) return;
    const id = setTimeout(async () => {
      const savedAt = new Date().toISOString();
      try {
        await storage.set(DOC_KEY(doc.id), JSON.stringify({ ...doc, savedAt }));
        await storage.set(LAST_KEY, doc.id);
        setIndex((idx) => {
          const next = [{ id: doc.id, title: doc.title, savedAt }, ...idx.filter((m) => m.id !== doc.id)];
          storage.set(IDX_KEY, JSON.stringify(next)).catch?.(() => {});
          return next;
        });
      } catch {}
    }, 700);
    return () => clearTimeout(id);
  }, [doc, storage]);

  /* ── 좌표 ─────────────────────────────── */
  const toWorld = (cx, cy) => {
    const r = boardRef.current.getBoundingClientRect(), v = viewRef.current;
    return { x: (cx - r.left - v.x) / v.k, y: (cy - r.top - v.y) / v.k };
  };
  const rectOf = (c) => ({ x: c.x, y: c.y, w: sizes[c.id]?.w || c.w, h: sizes[c.id]?.h || 60 });

  /* 상자의 실제 크기를 재 둔다 — 글 길이와 번역 줄 수에 따라 높이가 달라진다 */
  useLayoutEffect(() => {
    let changed = false; const next = { ...sizes };
    for (const c of doc.cards) {
      const el = cardEls.current[c.id]; if (!el) continue;
      const w = el.offsetWidth, h = el.offsetHeight;
      if (Math.abs((next[c.id]?.w || 0) - w) > 0.5 || Math.abs((next[c.id]?.h || 0) - h) > 0.5) { next[c.id] = { w, h }; changed = true; }
    }
    if (changed) setSizes(next);
  });

  const fitView = useCallback(() => {
    const el = boardRef.current; if (!el) return;
    const boxes = doc.cards.map(rectOf);
    doc.ink.forEach((s) => { const xs = s.pts.map((p) => p[0]), ys = s.pts.map((p) => p[1]); boxes.push({ x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }); });
    if (!boxes.length) { setView({ x: 40, y: 30, k: 1 }); return; }
    const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y));
    const x1 = Math.max(...boxes.map((b) => b.x + b.w)), y1 = Math.max(...boxes.map((b) => b.y + b.h));
    const W = el.clientWidth, H = el.clientHeight, pad = 40;
    const k = clamp(Math.min((W - pad * 2) / Math.max(1, x1 - x0), (H - pad * 2) / Math.max(1, y1 - y0)), 0.25, 2.5);
    setView({ k, x: (W - (x1 - x0) * k) / 2 - x0 * k, y: (H - (y1 - y0) * k) / 2 - y0 * k });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, sizes]);
  useEffect(() => { if (needFit) { const t = setTimeout(() => { fitView(); setNeedFit(false); }, 60); return () => clearTimeout(t); } }, [needFit, fitView]);

  const zoomAt = (factor, cx, cy) => {
    const el = boardRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = cx ?? r.left + r.width / 2, py = cy ?? r.top + r.height / 2;
    setView((v) => {
      const k = clamp(v.k * factor, 0.25, 4);
      const wx = (px - r.left - v.x) / v.k, wy = (py - r.top - v.y) / v.k;
      return { k, x: px - r.left - wx * k, y: py - r.top - wy * k };
    });
  };

  /* ── 번역 ─────────────────────────────── */
  const targetsOf = (card) => {
    const src = detectMemoLang(card.text);
    return MEMO_LANGS.filter((l) => l.id !== src && doc.show[l.id]).map((l) => l.id);
  };
  const keyOf = (lang, text) => `${lang}\u0001${text}`;

  useEffect(() => {
    if (!translate) return;
    const fills = [];
    const wanted = [];
    for (const card of doc.cards) {
      const text = card.text.trim(); if (!text) continue;
      if (editing?.id === card.id) continue;
      const src = detectMemoLang(text);
      for (const lang of targetsOf(card)) {
        const key = keyOf(lang, text);
        if (card.tr?.[lang]?.key === key) continue;
        if (TR_CACHE.has(key)) { fills.push([card.id, lang, key, TR_CACHE.get(key)]); continue; }
        if (inflight.current.has(key) || failed.current.has(key)) continue;
        wanted.push({ key, text, src, lang });
      }
    }
    if (fills.length) {
      apply((d) => ({ ...d, cards: d.cards.map((c) => {
        const mine = fills.filter((f) => f[0] === c.id); if (!mine.length) return c;
        const tr = { ...(c.tr || {}) }; mine.forEach(([, lang, key, text]) => { tr[lang] = { key, text }; });
        return { ...c, tr };
      }) }), false);
    }
    const room = MAX_PARALLEL - inflight.current.size;
    wanted.filter((w, i, a) => a.findIndex((x) => x.key === w.key) === i).slice(0, Math.max(0, room)).forEach((w) => {
      inflight.current.add(w.key);
      Promise.resolve()
        .then(() => translate(w.text, LANG_BY_ID[w.src].gpt, LANG_BY_ID[w.lang].gpt))
        .then((out) => { if (!out || !String(out).trim()) throw new Error("empty"); TR_CACHE.set(w.key, String(out).trim()); })
        .catch(() => { failed.current.add(w.key); })
        .finally(() => { inflight.current.delete(w.key); setTick((t) => t + 1); });
    });
    if (wanted.length) setTick((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.cards, doc.show, translate, tick, editing?.id]);

  const retry = (key) => { failed.current.delete(key); setTick((t) => t + 1); };

  /* ── 상자 편집 ─────────────────────────────── */
  const editingRef = useRef(null); editingRef.current = editing;
  const commitEdit = useCallback(() => {
    const ed = editingRef.current;
    if (!ed) return;
    editingRef.current = null; setEditing(null);
    {
      const value = ed.value.replace(/\s+$/, "");
      apply((d) => {
        const exists = d.cards.find((c) => c.id === ed.id);
        if (!value.trim()) {
          if (!exists) return d;
          return { ...d, cards: d.cards.filter((c) => c.id !== ed.id), links: d.links.filter((l) => l.a !== ed.id && l.b !== ed.id) };
        }
        if (!exists) return { ...d, cards: [...d.cards, { ...ed.card, text: value }] };
        if (exists.text === value) return d;
        return { ...d, cards: d.cards.map((c) => (c.id === ed.id ? { ...c, text: value } : c)) };
      });
    }
  }, [apply]);
  const editCard = (c) => { if (editing?.id === c.id) return; if (editing) commitEdit(); setSel({ kind: "card", id: c.id }); setEditing({ id: c.id, value: c.text }); };
  const newCardAt = (w) => {
    if (editing) commitEdit();
    const card = { id: uid(), x: Math.round(w.x), y: Math.round(w.y), w: 300, size: 18, color, text: "", tr: {} };
    setSel({ kind: "card", id: card.id });
    setEditing({ id: card.id, value: "", card });
  };
  const updateCard = (id, patch) => apply((d) => ({ ...d, cards: d.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const deleteSel = () => {
    if (!sel) return;
    if (sel.kind === "card") apply((d) => ({ ...d, cards: d.cards.filter((c) => c.id !== sel.id), links: d.links.filter((l) => l.a !== sel.id && l.b !== sel.id) }));
    if (sel.kind === "link") apply((d) => ({ ...d, links: d.links.filter((l) => l.id !== sel.id) }));
    setSel(null); setEditing(null);
  };

  /* ── 펜 ─────────────────────────────── */
  const inkMode = mode === "pen" || mode === "hi" || mode === "erase";
  /* 펜슬을 한 번이라도 본 기기에서는 손가락·손바닥으로 긋지 않는다(손가락은 화면 이동) */
  const acceptsInk = (e) => {
    if (!inkMode) return false;
    if (e.pointerType === "pen") { penSeen.current = true; return true; }
    if (e.pointerType === "mouse") return true;
    return !penSeen.current;
  };
  const inkPoint = (e) => {
    const w = toWorld(e.clientX, e.clientY);
    const pr = e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.5;
    return [Math.round(w.x * 10) / 10, Math.round(w.y * 10) / 10, Math.round(pr * 100) / 100];
  };
  const eraseAt = (e, record) => {
    const w = toWorld(e.clientX, e.clientY), r = 12 / viewRef.current.k;
    apply((d) => { const ink = d.ink.filter((s) => !inkHit(s, w.x, w.y, r)); return ink.length === d.ink.length ? d : { ...d, ink }; }, record);
  };

  /* ── 포인터 ─────────────────────────────── */
  const startPinch = () => {
    const pts = [...pointers.current.values()].slice(0, 2);
    const v = viewRef.current;
    gesture.current = { kind: "pinch", d0: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, m0: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }, v0: v };
  };
  const onDown = (e) => {
    if (e.button && e.button !== 0) return;
    if (e.target.closest?.("[data-lm-ui]")) return;           // 상자 위의 단추·글칸은 제 일을 한다
    const board = boardRef.current;
    try { board.setPointerCapture(e.pointerId); } catch {}
    const ink = acceptsInk(e);
    if (!ink) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!ink && pointers.current.size >= 2) { if (gesture.current?.kind === "stroke") { setLive(null); } startPinch(); return; }

    if (ink) {
      if (editing) commitEdit();
      if (mode === "erase") { gesture.current = { kind: "erase", id: e.pointerId }; eraseAt(e, true); return; }
      const hi = mode === "hi";
      const st = { id: uid(), color: hi ? hiColor : color, w: hi ? HI_W[widthIdx] : PEN_W[widthIdx], hi, pts: [inkPoint(e)] };
      gesture.current = { kind: "stroke", id: e.pointerId, st };
      setLive(st);
      return;
    }

    const cardEl = e.target.closest?.("[data-card-id]");
    const linkEl = e.target.closest?.("[data-link-id]");
    const w = toWorld(e.clientX, e.clientY);
    const base = { id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false };

    if (cardEl && !inkMode) {
      const card = doc.cards.find((c) => c.id === cardEl.dataset.cardId);
      if (!card) return;
      if (editing && editing.id !== card.id) commitEdit();
      gesture.current = { ...base, kind: "card", card, dx: card.x - w.x, dy: card.y - w.y, wasSelected: sel?.kind === "card" && sel.id === card.id };
      return;
    }
    if (linkEl && mode === "select") {
      if (editing) commitEdit();
      setSel({ kind: "link", id: linkEl.dataset.linkId });
      gesture.current = { ...base, kind: "none" };
      return;
    }
    if (editing) commitEdit();
    gesture.current = { ...base, kind: "pan", v0: viewRef.current, w };
  };
  const onMove = (e) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current; if (!g) return;
    if (g.kind === "pinch") {
      const pts = [...pointers.current.values()].slice(0, 2); if (pts.length < 2) return;
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), m = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const k = clamp(g.v0.k * d / g.d0, 0.25, 4);
      const r = boardRef.current.getBoundingClientRect();
      const wx = (g.m0.x - r.left - g.v0.x) / g.v0.k, wy = (g.m0.y - r.top - g.v0.y) / g.v0.k;
      setView({ k, x: m.x - r.left - wx * k, y: m.y - r.top - wy * k });
      return;
    }
    if (g.id !== e.pointerId) return;
    if (g.kind === "stroke") {
      const pt = inkPoint(e), pts = g.st.pts, last = pts[pts.length - 1];
      if (Math.hypot(pt[0] - last[0], pt[1] - last[1]) * viewRef.current.k < 1.5) return;
      g.st = { ...g.st, pts: [...pts, pt] }; setLive(g.st); return;
    }
    if (g.kind === "erase") { eraseAt(e, false); return; }
    const dist = Math.hypot(e.clientX - g.sx, e.clientY - g.sy);
    if (!g.moved && dist < 6) return;
    const first = !g.moved; g.moved = true;
    if (g.kind === "card" && mode !== "connect") {
      const w = toWorld(e.clientX, e.clientY);
      const x = Math.round(w.x + g.dx), y = Math.round(w.y + g.dy);
      apply((d) => ({ ...d, cards: d.cards.map((c) => (c.id === g.card.id ? { ...c, x, y } : c)) }), first);
      return;
    }
    if (g.kind === "pan" || (g.kind === "card" && mode === "connect")) {
      if (g.kind === "card") return;
      setView({ ...g.v0, x: g.v0.x + e.clientX - g.sx, y: g.v0.y + e.clientY - g.sy });
    }
  };
  const onUp = (e) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current; if (!g) return;
    if (g.kind === "pinch") { if (pointers.current.size < 2) gesture.current = null; return; }
    if (g.id !== e.pointerId) return;
    gesture.current = null;
    if (g.kind === "stroke") {
      setLive(null);
      const st = g.st; if (st.pts.length < 2) return;
      const avg = st.pts.reduce((n, q) => n + q[2], 0) / st.pts.length;
      apply((d) => ({ ...d, ink: [...d.ink, { ...st, w: st.hi ? st.w : +(st.w * (0.55 + avg)).toFixed(1) }] }));
      return;
    }
    if (g.kind === "erase" || g.kind === "none") return;
    if (g.moved) return;
    /* 누르고 바로 뗀 경우 — 모드에 따라 고르기·만들기·잇기 */
    if (g.kind === "card") {
      const card = g.card;
      if (mode === "connect") {
        if (!pendingLink) { setPendingLink(card.id); setSel({ kind: "card", id: card.id }); return; }
        if (pendingLink === card.id) { setPendingLink(null); return; }
        const exists = doc.links.some((l) => (l.a === pendingLink && l.b === card.id) || (l.a === card.id && l.b === pendingLink));
        if (!exists) apply((d) => ({ ...d, links: [...d.links, { id: uid(), a: pendingLink, b: card.id }] }));
        setPendingLink(null); setSel({ kind: "card", id: card.id });
        return;
      }
      if (mode === "text" || g.wasSelected) { editCard(card); return; }
      setSel({ kind: "card", id: card.id });
      return;
    }
    if (g.kind === "pan") {
      if (mode === "text") { newCardAt(g.w); return; }
      if (mode === "connect") { setPendingLink(null); return; }
      setSel(null);
    }
  };
  const onWheel = (e) => {
    if (e.ctrlKey || e.metaKey) { zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY); return; }
    setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
  };
  useEffect(() => {
    const el = boardRef.current; if (!el) return;
    const stop = (ev) => ev.preventDefault();
    el.addEventListener("wheel", stop, { passive: false });
    el.addEventListener("gesturestart", stop);
    return () => { el.removeEventListener("wheel", stop); el.removeEventListener("gesturestart", stop); };
  }, []);

  /* ── 단축키 ─────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || e.target?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (typing) return;
      if ((e.key === "Delete" || e.key === "Backspace") && sel) { e.preventDefault(); deleteSel(); }
      if (e.key === "Escape") { setPendingLink(null); setSel(null); if (present) setPresent(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ── 발표 보기 ─────────────────────────────── */
  const togglePresent = () => {
    const el = rootRef.current;
    if (!present) {
      setPresent(true);
      try { (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)?.catch?.(() => {}); } catch {}
    } else {
      setPresent(false);
      try { if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {}); } catch {}
    }
  };
  useEffect(() => {
    const f = () => { if (!document.fullscreenElement && !document.webkitFullscreenElement) setPresent(false); };
    document.addEventListener("fullscreenchange", f); document.addEventListener("webkitfullscreenchange", f);
    return () => { document.removeEventListener("fullscreenchange", f); document.removeEventListener("webkitfullscreenchange", f); };
  }, []);

  /* ── 메모 목록·파일 ─────────────────────────────── */
  const newMemo = () => { if (editing) commitEdit(); openDoc(emptyMemo()); setDrawer(false); setView({ x: 40, y: 30, k: 1 }); setNeedFit(false); };
  const openMemo = async (id) => {
    if (!storage) return;
    try { const r = await storage.get(DOC_KEY(id)); if (r?.value) { openDoc(JSON.parse(r.value)); setDrawer(false); storage.set(LAST_KEY, id); } } catch {}
  };
  const deleteMemo = async (m) => {
    if (!window.confirm(tx([`Delete “${m.title || "Untitled"}”?`, `“${m.title || "제목 없음"}”을(를) 지울까요?`, `要刪除「${m.title || "未命名"}」嗎？`]))) return;
    try {
      await storage?.delete(DOC_KEY(m.id));
      const next = index.filter((x) => x.id !== m.id);
      setIndex(next); await storage?.set(IDX_KEY, JSON.stringify(next));
    } catch {}
    if (m.id === doc.id) openDoc(emptyMemo());
  };
  const exportFile = () => {
    const blob = new Blob([JSON.stringify({ ...doc, savedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${(doc.title || "lecture-memo").replace(/[\\/:*?"<>|]/g, "_")}.lecture.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const importFile = (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const d = JSON.parse(fr.result);
        if (!d || !Array.isArray(d.cards)) throw new Error("not a memo");
        openDoc(index.some((m) => m.id === d.id) && d.id !== doc.id ? { ...d, id: uid() } : d);
        setDrawer(false);
        flash(tx(["Memo opened", "메모를 열었습니다", "已開啟筆記"]));
      } catch { flash(tx(["This is not a lecture memo file.", "강의 메모 파일이 아닙니다.", "這不是講課筆記檔案。"])); }
    };
    fr.readAsText(f);
  };

  /* ── 그리기 ─────────────────────────────── */
  const selCard = sel?.kind === "card" ? doc.cards.find((c) => c.id === sel.id) : null;
  const selLink = sel?.kind === "link" ? doc.links.find((l) => l.id === sel.id) : null;
  const cardById = useMemo(() => Object.fromEntries(doc.cards.map((c) => [c.id, c])), [doc.cards]);
  const editingNew = editing && !cardById[editing.id] ? editing.card : null;
  const cardsToDraw = editingNew ? [...doc.cards, editingNew] : doc.cards;

  const linkGeom = (l) => {
    const a = cardById[l.a], b = cardById[l.b]; if (!a || !b) return null;
    const ra = rectOf(a), rb = rectOf(b);
    const p = edgeToward(ra, rb.x + rb.w / 2, rb.y + rb.h / 2, 4), q = edgeToward(rb, ra.x + ra.w / 2, ra.y + ra.h / 2, 10);
    return { p, q, mid: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 } };
  };

  const toolBtn = (id, label, icon) => (
    <button type="button" key={id} aria-pressed={mode === id} title={label}
      onClick={() => { if (editing) commitEdit(); setMode(id); setPendingLink(null); if (id === "pen" || id === "hi" || id === "erase") setSel(null); }}
      style={{ ...S.tool, ...(mode === id ? S.toolOn : null) }}>
      <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span><span className="lm-tool-label">{label}</span>
    </button>
  );
  const curInkColor = mode === "hi" ? hiColor : color;
  const pickColor = (c) => {
    if (mode === "hi") setHiColor(c); else setColor(c);
    if (selCard && !inkMode) updateCard(selCard.id, { color: c });
  };

  const hint = mode === "text" ? tx(["Tap an empty spot to add a memo box. Tap a box to edit it.", "빈 곳을 누르면 메모 상자가 생깁니다. 상자를 누르면 고칩니다.", "點選空白處新增筆記框；點選筆記框可編輯。"])
    : mode === "connect" ? (pendingLink ? tx(["Now tap the box to connect to.", "이어 줄 상자를 누르세요.", "請點選要連接的筆記框。"]) : tx(["Tap the first box, then the second.", "첫 상자를 누르고, 이어서 둘째 상자를 누르세요.", "先點第一個筆記框，再點第二個。"]))
    : null;

  return (
    <div ref={rootRef} className="lm-root" data-notrans="" style={{ ...S.root, ...(present ? S.rootPresent : null) }}>
      <style>{CSS}</style>

      {!present && (
        <div className="lm-toolbar" style={S.toolbar}>
          <div style={S.group}>
            <button type="button" style={S.tool} onClick={() => setDrawer((v) => !v)} title={tx(["My lecture memos", "내 강의 메모", "我的講課筆記"])}>
              <span style={{ fontSize: 15 }}>📂</span><span className="lm-tool-label">{tx(["Memos", "메모 목록", "筆記列表"])}</span>
            </button>
            <input value={doc.title} onChange={(e) => apply((d) => ({ ...d, title: e.target.value }), false)}
              placeholder={tx(["Lecture title", "강의 제목", "講課標題"])} style={S.title} />
          </div>
          <div style={S.group}>
            {toolBtn("select", tx(["Select", "선택", "選取"]), "↖")}
            {toolBtn("text", tx(["Memo box", "메모 상자", "筆記框"]), "▭")}
            {toolBtn("connect", tx(["Connect", "연결", "連接"]), "↗")}
          </div>
          <div style={S.group}>
            {toolBtn("pen", tx(["Pen", "펜", "筆"]), "✎")}
            {toolBtn("hi", tx(["Highlighter", "형광펜", "螢光筆"]), "▮")}
            {toolBtn("erase", tx(["Eraser", "지우개", "橡皮擦"]), "⌫")}
          </div>
          <div style={S.group}>
            {COLORS.map((c) => (
              <button type="button" key={c.id} aria-label={c.id} onClick={() => pickColor(c.c)}
                style={{ ...S.dot, background: c.c, boxShadow: (selCard && !inkMode ? selCard.color : curInkColor) === c.c ? `0 0 0 2px #fff, 0 0 0 4px ${C.ink}` : "none" }} />
            ))}
            {inkMode && mode !== "erase" && [0, 1, 2].map((i) => (
              <button type="button" key={i} aria-pressed={widthIdx === i} onClick={() => setWidthIdx(i)} title={tx([["Thin", "Medium", "Thick"][i], ["얇게", "보통", "굵게"][i], ["細", "中", "粗"][i]])}
                style={{ ...S.tool, ...(widthIdx === i ? S.toolOn : null), padding: "0 8px" }}>
                <span style={{ display: "inline-block", width: 18, height: Math.max(2, (mode === "hi" ? HI_W : PEN_W)[i] / (mode === "hi" ? 3 : 1)), borderRadius: 3, background: widthIdx === i ? "#fff" : C.ink2 }} />
              </button>
            ))}
          </div>
          <div style={S.group}>
            <button type="button" style={S.tool} onClick={undo} disabled={!hist.past.length} title={tx(["Undo", "되돌리기", "復原"])}>↶</button>
            <button type="button" style={S.tool} onClick={redo} disabled={!hist.future.length} title={tx(["Redo", "다시 하기", "重做"])}>↷</button>
          </div>
          <div style={S.group}>
            <button type="button" style={S.tool} onClick={() => zoomAt(1 / 1.2)}>−</button>
            <button type="button" style={{ ...S.tool, minWidth: 52 }} onClick={() => setView((v) => ({ ...v, k: 1 }))}>{Math.round(view.k * 100)}%</button>
            <button type="button" style={S.tool} onClick={() => zoomAt(1.2)}>＋</button>
            <button type="button" style={S.tool} onClick={fitView} title={tx(["Fit to screen", "화면에 맞추기", "符合畫面"])}>⤢<span className="lm-tool-label">{tx(["Fit", "맞춤", "符合"])}</span></button>
            <button type="button" style={S.tool} onClick={togglePresent} title={tx(["Presentation view", "발표 보기", "簡報檢視"])}>⛶<span className="lm-tool-label">{tx(["Present", "발표 보기", "簡報"])}</span></button>
          </div>
          {translate ? (
            <div style={S.group} title={tx(["Languages shown under each memo box", "메모 상자 아래 보여 줄 번역 언어", "筆記框下方顯示的翻譯語言"])}>
              <span style={S.groupLabel}>🌐 {tx(["Translate", "번역", "翻譯"])}</span>
              {MEMO_LANGS.map((l) => (
                <button type="button" key={l.id} aria-pressed={!!doc.show[l.id]}
                  onClick={() => apply((d) => ({ ...d, show: { ...d.show, [l.id]: !d.show[l.id] } }))}
                  style={{ ...S.chip, ...(doc.show[l.id] ? S.chipOn : null) }}>{l.label}</button>
              ))}
            </div>
          ) : (
            <div style={{ ...S.group, borderStyle: "dashed", color: C.faint, fontSize: 12, padding: "0 10px" }}>
              🌐 {tx(["Translation is in the interpreter edition", "번역은 통역판에서 쓸 수 있습니다", "翻譯功能在口譯版中提供"])}
            </div>
          )}
        </div>
      )}

      <div ref={boardRef} className="lm-board" style={{ ...S.board, cursor: mode === "text" ? "copy" : inkMode ? "crosshair" : "default" }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
        <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
          {/* 연결선 — 상자 아래에 깐다 */}
          <svg style={S.svg}>
            <g transform={`translate(${SVG_HALF} ${SVG_HALF})`}>
            <defs>
              <marker id="lm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={C.sage} />
              </marker>
              <marker id="lm-arrow-on" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={C.gold} />
              </marker>
            </defs>
            {doc.links.map((l) => {
              const g = linkGeom(l); if (!g) return null;
              const on = selLink?.id === l.id;
              return <g key={l.id} data-link-id={l.id} style={{ cursor: "pointer" }}>
                <line x1={g.p.x} y1={g.p.y} x2={g.q.x} y2={g.q.y} stroke="transparent" strokeWidth={18} pointerEvents="stroke" />
                <line x1={g.p.x} y1={g.p.y} x2={g.q.x} y2={g.q.y} stroke={on ? C.gold : C.sage} strokeWidth={on ? 2.6 : 2} markerEnd={`url(#${on ? "lm-arrow-on" : "lm-arrow"})`} />
              </g>;
            })}
            </g>
          </svg>

          {cardsToDraw.map((c) => {
            const isSel = sel?.kind === "card" && sel.id === c.id, isEdit = editing?.id === c.id;
            const lines = translate && c.text.trim() && !isEdit ? targetsOf(c) : [];
            return (
              <div key={c.id} data-card-id={c.id} ref={(el) => { if (el) cardEls.current[c.id] = el; else delete cardEls.current[c.id]; }}
                className="lm-card"
                style={{ ...S.card, left: c.x, top: c.y, width: c.w, borderLeftColor: c.color,
                  outline: pendingLink === c.id ? `2.5px dashed ${C.gold}` : isSel ? `2px solid ${C.pine2}` : "none", outlineOffset: 2 }}
                onDoubleClick={() => { if (!inkMode) editCard(c); }}>
                {isEdit ? (
                  <textarea data-lm-ui="" autoFocus value={editing.value} rows={Math.max(2, editing.value.split("\n").length)}
                    placeholder={tx(["Type here (Korean, English, …)", "여기에 적으세요", "在此輸入"])}
                    onChange={(e) => { const value = e.target.value; if (editingRef.current) editingRef.current = { ...editingRef.current, value }; setEditing((ed) => (ed ? { ...ed, value } : ed)); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commitEdit(); } if (e.key === "Escape") { e.preventDefault(); commitEdit(); } }}
                    style={{ ...S.textarea, fontSize: c.size, color: c.color }} />
                ) : (
                  <div style={{ fontSize: c.size, fontWeight: 600, color: c.color, whiteSpace: "pre-wrap", lineHeight: 1.4, wordBreak: "break-word" }}>{c.text}</div>
                )}
                {isEdit && (
                  <div data-lm-ui="" style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
                    <button type="button" style={S.small} onClick={commitEdit}>✓ {tx(["Done", "완료", "完成"])}</button>
                  </div>
                )}
                {lines.length > 0 && (
                  <div style={{ marginTop: 6, borderTop: `1px solid ${C.rule}`, paddingTop: 5, display: "grid", gap: 4 }}>
                    {lines.map((lang) => {
                      const key = keyOf(lang, c.text.trim()), entry = c.tr?.[lang];
                      const ok = entry?.key === key, bad = !ok && failed.current.has(key);
                      return (
                        <div key={lang} style={{ display: "flex", gap: 7, alignItems: "baseline", fontSize: Math.round(c.size * 0.8), lineHeight: lang === "th" || lang === "km" ? 1.65 : 1.4 }}>
                          <span style={S.tag}>{LANG_BY_ID[lang].tag}</span>
                          {ok ? <span style={{ color: C.ink2, whiteSpace: "pre-wrap", wordBreak: "break-word", flex: 1 }}>{entry.text}</span>
                            : bad ? <span style={{ color: C.red, fontSize: 12 }}>{tx(["Translation failed", "번역 실패", "翻譯失敗"])} <button type="button" data-lm-ui="" style={S.small} onClick={() => retry(key)}>↻ {tx(["Retry", "다시", "重試"])}</button></span>
                            : <span className="lm-wait" style={{ color: C.faint }}>{entry?.text ? <span style={{ opacity: 0.55 }}>{entry.text} </span> : null}…</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* 필기 — 맨 위에 얹는다(형광펜이 글자 위에 칠해지도록) */}
          {[true, false].map((hiLayer) => (
            <svg key={hiLayer ? "hi" : "pen"} style={{ ...S.svg, ...(hiLayer ? { mixBlendMode: "multiply" } : null) }}>
              <g transform={`translate(${SVG_HALF} ${SVG_HALF})`}>
                {[...doc.ink, ...(live ? [live] : [])].filter((s) => !!s.hi === hiLayer).map((s) => (
                  <path key={s.id} d={inkPath(s.pts)} fill="none" stroke={s.color} strokeWidth={s.w}
                    strokeLinecap={s.hi ? "butt" : "round"} strokeLinejoin="round" opacity={s.hi ? 0.4 : 0.95} />
                ))}
              </g>
            </svg>
          ))}
        </div>

        {/* 고른 상자의 작은 도구 막대 */}
        {selCard && !editing && !inkMode && mode !== "connect" && (
          <div data-lm-ui="" style={{ ...S.float, left: Math.max(6, view.x + selCard.x * view.k), top: Math.max(6, view.y + selCard.y * view.k - 46) }}>
            <button type="button" style={S.small} onClick={() => editCard(selCard)}>✎ {tx(["Edit", "고치기", "編輯"])}</button>
            <button type="button" style={S.small} onClick={() => updateCard(selCard.id, { size: stepFont(selCard.size, -1) })}>A−</button>
            <button type="button" style={S.small} onClick={() => updateCard(selCard.id, { size: stepFont(selCard.size, 1) })}>A+</button>
            <button type="button" style={S.small} title={tx(["Narrower", "좁게", "變窄"])} onClick={() => updateCard(selCard.id, { w: Math.max(160, selCard.w - 40) })}>⟷−</button>
            <button type="button" style={S.small} title={tx(["Wider", "넓게", "變寬"])} onClick={() => updateCard(selCard.id, { w: Math.min(760, selCard.w + 40) })}>⟷+</button>
            <button type="button" style={S.small} onClick={() => { setMode("connect"); setPendingLink(selCard.id); }}>↗ {tx(["Connect", "연결", "連接"])}</button>
            <button type="button" style={{ ...S.small, color: C.red }} onClick={deleteSel}>🗑</button>
          </div>
        )}
        {selLink && (() => { const g = linkGeom(selLink); if (!g) return null; return (
          <div data-lm-ui="" style={{ ...S.float, left: view.x + g.mid.x * view.k - 40, top: view.y + g.mid.y * view.k - 44 }}>
            <button type="button" style={{ ...S.small, color: C.red }} onClick={deleteSel}>🗑 {tx(["Remove line", "연결 지우기", "刪除連線"])}</button>
          </div>); })()}

        {hint && !present && <div style={S.hint}>{hint}</div>}
        {!doc.cards.length && !doc.ink.length && !editing && (
          <div style={S.empty}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
            <div style={{ fontWeight: 700, color: C.ink2, marginBottom: 6 }}>{tx(["Lecture memo", "강의 메모", "講課筆記"])}</div>
            <div>{translate
              ? tx(["Choose ▭ Memo box and tap the page. Type in Korean — the languages chosen under 🌐 appear below.", "▭ 메모 상자를 고르고 화면을 누르세요. 한글로 적으면 🌐에서 고른 언어 번역이 아래에 붙습니다.", "選擇 ▭ 筆記框後點選畫面。以韓文輸入，🌐 所選語言的翻譯會顯示在下方。"])
              : tx(["Choose ▭ Memo box and tap the page, or write with ✎ Pen and ▮ Highlighter.", "▭ 메모 상자를 고르고 화면을 누르거나, ✎ 펜과 ▮ 형광펜으로 적으세요.", "選擇 ▭ 筆記框後點選畫面，或用 ✎ 筆與 ▮ 螢光筆書寫。"])}</div>
          </div>
        )}

        {present && (
          <div data-lm-ui="" style={S.presentBar}>
            {[["select", "↖"], ["text", "▭"], ["pen", "✎"], ["hi", "▮"], ["erase", "⌫"]].map(([id, icon]) => (
              <button type="button" key={id} aria-pressed={mode === id} onClick={() => { if (editing) commitEdit(); setMode(id); }} style={{ ...S.tool, ...(mode === id ? S.toolOn : null) }}>{icon}</button>
            ))}
            <button type="button" style={S.tool} onClick={undo}>↶</button>
            <button type="button" style={S.tool} onClick={fitView}>⤢</button>
            <button type="button" style={{ ...S.tool, fontWeight: 700 }} onClick={togglePresent}>✕ {tx(["Exit", "나가기", "離開"])}</button>
          </div>
        )}
      </div>

      {drawer && !present && (
        <div style={S.drawer}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <strong style={{ color: C.ink }}>{tx(["My lecture memos", "내 강의 메모", "我的講課筆記"])}</strong>
            <button type="button" style={S.small} onClick={() => setDrawer(false)}>✕</button>
          </div>
          <button type="button" style={{ ...S.wide, background: C.pine, color: "#fff", borderColor: C.pine }} onClick={newMemo}>＋ {tx(["New memo", "새 메모", "新增筆記"])}</button>
          <div style={{ fontSize: 11.5, color: C.mute, margin: "8px 2px 10px", lineHeight: 1.5 }}>
            {storage ? tx(["Memos save automatically on this device.", "메모는 이 기기에 자동으로 저장됩니다.", "筆記會自動儲存在此裝置。"]) : tx(["This browser cannot keep memos. Use “Save as file”.", "이 브라우저에서는 메모를 보관할 수 없습니다. ‘파일로 저장’을 쓰세요.", "此瀏覽器無法保存筆記，請使用「存成檔案」。"])}
          </div>
          <div style={{ display: "grid", gap: 6, maxHeight: "50vh", overflow: "auto" }}>
            {index.length ? index.map((m) => (
              <div key={m.id} style={{ ...S.memoRow, ...(m.id === doc.id ? { borderColor: C.pine2, background: C.sageSoft } : null) }}>
                <button type="button" onClick={() => openMemo(m.id)} style={{ flex: 1, textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: FONT, color: C.ink }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{m.title || tx(["Untitled", "제목 없음", "未命名"])}</div>
                  <div style={{ fontSize: 11, color: C.mute }}>{(m.savedAt || "").slice(0, 16).replace("T", " ")}</div>
                </button>
                <button type="button" style={{ ...S.small, color: C.red }} onClick={() => deleteMemo(m)}>🗑</button>
              </div>
            )) : <div style={{ fontSize: 12.5, color: C.mute }}>{tx(["No saved memos yet.", "저장된 메모가 아직 없습니다.", "尚無已儲存的筆記。"])}</div>}
          </div>
          <div style={{ height: 1, background: C.rule, margin: "12px 0" }} />
          <button type="button" style={S.wide} onClick={exportFile}>⬇ {tx(["Save as file", "파일로 저장", "存成檔案"])}</button>
          <button type="button" style={S.wide} onClick={() => fileRef.current?.click()}>📄 {tx(["Open a memo file", "메모 파일 열기", "開啟筆記檔案"])}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={importFile} style={{ display: "none" }} />
        </div>
      )}
    </div>
  );
}

const SVG_HALF = 20000;
const S = {
  root: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative", background: C.paper, fontFamily: FONT, color: C.ink },
  rootPresent: { position: "fixed", inset: 0, zIndex: 80 },
  toolbar: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "8px 10px", background: "#fff", borderBottom: `1px solid ${C.rule}`, flexShrink: 0 },
  group: { display: "flex", alignItems: "center", gap: 4, border: `1px solid ${C.rule}`, borderRadius: 10, padding: 3, background: "#fff", minHeight: 40 },
  groupLabel: { fontSize: 12, color: C.mute, padding: "0 4px 0 6px", whiteSpace: "nowrap" },
  tool: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, minWidth: 34, height: 32, padding: "0 9px", border: "1px solid transparent", borderRadius: 8, background: "transparent", color: C.ink2, fontSize: 13, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" },
  toolOn: { background: C.pine, color: "#fff", borderColor: C.pine },
  dot: { width: 22, height: 22, borderRadius: "50%", border: "1px solid rgba(0,0,0,.15)", cursor: "pointer", margin: "0 2px", padding: 0 },
  title: { border: `1px solid ${C.rule}`, borderRadius: 8, padding: "6px 10px", fontSize: 14, fontFamily: FONT, width: 200, minWidth: 0, color: C.ink, background: "#fff" },
  chip: { border: `1px solid ${C.rule}`, borderRadius: 14, padding: "4px 9px", background: "#fff", color: C.mute, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" },
  chipOn: { background: C.sageSoft, color: C.pine, borderColor: C.sage, fontWeight: 700 },
  board: { flex: 1, minHeight: 0, position: "relative", overflow: "hidden", touchAction: "none", background: C.canvas,
    backgroundImage: `radial-gradient(${C.grid} 1.2px, transparent 1.2px)`, backgroundSize: "22px 22px", userSelect: "none", WebkitUserSelect: "none" },
  svg: { position: "absolute", left: -SVG_HALF, top: -SVG_HALF, width: SVG_HALF * 2, height: SVG_HALF * 2, overflow: "visible", pointerEvents: "none" },
  card: { position: "absolute", background: "#fff", border: "1px solid #C9D6E3", borderLeft: "5px solid", borderRadius: 10, padding: "9px 12px 10px", boxShadow: "0 2px 8px rgba(22,32,42,.08)", cursor: "grab", boxSizing: "border-box" },
  textarea: { width: "100%", border: `1px solid ${C.sage}`, borderRadius: 6, padding: "6px 8px", fontFamily: FONT, fontWeight: 600, lineHeight: 1.4, resize: "vertical", boxSizing: "border-box", background: "#FCFEFF", userSelect: "text", WebkitUserSelect: "text" },
  tag: { flexShrink: 0, minWidth: 22, textAlign: "center", fontSize: 10.5, fontWeight: 700, color: C.sage, background: C.sageSoft, borderRadius: 5, padding: "1px 5px", lineHeight: 1.5 },
  small: { border: `1px solid ${C.rule}`, borderRadius: 7, background: "#fff", color: C.ink2, padding: "4px 8px", fontSize: 12.5, fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap" },
  float: { position: "absolute", display: "flex", gap: 4, padding: 4, background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 10, boxShadow: "0 6px 18px rgba(22,32,42,.16)", zIndex: 5 },
  hint: { position: "absolute", left: "50%", top: 10, transform: "translateX(-50%)", background: C.pine, color: "#fff", padding: "6px 14px", borderRadius: 16, fontSize: 12.5, pointerEvents: "none", whiteSpace: "nowrap", maxWidth: "92%", overflow: "hidden", textOverflow: "ellipsis" },
  empty: { position: "absolute", left: "50%", top: "40%", transform: "translate(-50%,-50%)", textAlign: "center", color: C.mute, fontSize: 13.5, lineHeight: 1.6, maxWidth: 420, padding: "0 20px", pointerEvents: "none" },
  presentBar: { position: "absolute", right: 12, bottom: 12, display: "flex", gap: 4, padding: 5, background: "rgba(255,255,255,.95)", border: `1px solid ${C.rule}`, borderRadius: 12, boxShadow: "0 6px 18px rgba(22,32,42,.18)", zIndex: 6 },
  drawer: { position: "absolute", left: 10, top: 64, width: 300, maxWidth: "calc(100% - 20px)", background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 12, boxShadow: "0 12px 30px rgba(22,32,42,.22)", padding: 14, zIndex: 20 },
  wide: { display: "block", width: "100%", textAlign: "left", border: `1px solid ${C.rule}`, borderRadius: 8, background: "#fff", color: C.ink2, padding: "8px 10px", fontSize: 13, fontFamily: FONT, cursor: "pointer", marginBottom: 6 },
  memoRow: { display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.rule}`, borderRadius: 8, padding: "7px 9px" },
};
const CSS = `
.lm-root button:disabled{opacity:.35;cursor:default}
.lm-root button:focus:not(:focus-visible){outline:none}
.lm-root button[aria-pressed="true"].lm-chip{font-weight:700}
.lm-card:hover{box-shadow:0 4px 14px rgba(22,32,42,.14)}
.lm-wait{animation:lmPulse 1.2s ease-in-out infinite}
@keyframes lmPulse{0%,100%{opacity:.4}50%{opacity:1}}
@media (max-width: 900px){ .lm-tool-label{display:none} }
`;
