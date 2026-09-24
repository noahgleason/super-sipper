// Epcot Sips — front end (vanilla JS, no build step)

import { icon, flag, flagBody, TYPE_ICON, LANDMARKS, spaceshipEarth, AVATARS, avatar } from "/icons.js";

const TYPE_LABEL = {
  beer: "Beer", cider: "Cider", wine: "Wine", sparkling: "Bubbly", cocktail: "Cocktail",
  frozen: "Frozen", flight: "Flight", na: "Non-alcoholic", coffee: "Coffee",
};
const TYPE_GROUPS = [
  ["all", "All", null, "glass"],
  ["cocktail", "Cocktails", ["cocktail"], "cocktail"],
  ["frozen", "Frozen", ["frozen"], "frozen"],
  ["beer", "Beer & cider", ["beer", "cider"], "beer"],
  ["wine", "Wine & bubbly", ["wine", "sparkling"], "wine"],
  ["na", "Kid-friendly", ["na"], "na"],
  ["coffee", "Coffee", ["coffee"], "coffee"],
  ["flight", "Flights", ["flight"], "flight"],
];
const ONLY = [["all", "Anything", null], ["open", "Open now", "clock"], ["new", "New this week", "sparkle"], ["untried", "Haven't tried", "check"], ["want", "Wishlist", "heart"]];
const typeChip = (t) => `${icon(TYPE_ICON[t] || "glass")}${TYPE_LABEL[t] || t}`;
const LS = { me: "sips.me", code: "sips.code", rcode: "sips.refreshCode", cache: "sips.cache2", tab: "sips.tab", fopen: "sips.filtersOpen" };

// Walking order used by the List ("walk the loop") and to order spots.
const WALK = [
  "spaceship-earth", "creations", "connections", "communicore", "guardians", "mission-space", "test-track", "odyssey", "east-walkway",
  "plaza-mexico-side", "port-of-entry", "mexico", "mexico-norway", "norway", "norway-china", "china", "china-germany", "germany",
  "germany-italy", "italy", "italy-america", "america", "america-japan", "japan", "japan-morocco", "morocco", "morocco-france",
  "france", "france-uk", "uk", "uk-canada", "canada", "plaza-canada-side", "disney-traders", "showcase-plaza",
  "culinary-corridor", "imagination", "the-land", "seas",
];

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ls = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const state = {
  data: null,
  me: ls.get(LS.me),
  code: ls.get(LS.code, ""),
  tab: ls.get(LS.tab, "map"),
  offline: false,
  sel: null,                 // selected map anchor
  drawer: "peek",
  me_pos: null,              // {x, y, lat, lng}
  watching: false,
  filters: { group: "all", only: "all", fest: true, yr: true, q: "", sort: "walk" },
  filtersOpen: false,
};

// ── API ────────────────────────────────────────────────────────────────────
async function api(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: { "content-type": "application/json", "x-family-code": state.code || "", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const out = await res.json().catch(() => ({}));
  if (res.status === 401) { askForCode(); throw new Error(out.error || "Family code needed"); }
  if (!res.ok) { const e = new Error(out.error || out.why || `Request failed (${res.status})`); e.body = out; throw e; }
  return out;
}

let mapBuiltFor = null;
async function load({ quiet = false } = {}) {
  try {
    const data = await api("state");
    state.data = data;
    state.offline = false;
    ls.set(LS.cache, data);
  } catch (e) {
    state.offline = true;
    if (!state.data) state.data = ls.get(LS.cache);
    if (!state.data) {
      $("#view").innerHTML = `<div class="empty"><div class="e">${icon("alert")}</div><p>Couldn't reach the server.</p><button class="btn accent" onclick="location.reload()">Try again</button></div>`;
      document.body.dataset.tab = "list";
      return;
    }
  }
  render();
}

// ── Helpers ───────────────────────────────────────────────────────────────
const D = () => state.data;
const fmtDate = (iso) => iso ? new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
const shortFest = (name) => String(name || "").replace(/^EPCOT\s+International\s+/i, "").replace(/^EPCOT\s+/i, "");
const priceNum = (p) => { const m = String(p || "").match(/\$?(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : Infinity; };
const members = () => D()?.members || [];
const myRec = () => members().find((m) => state.me && m.name.toLowerCase() === state.me.name.toLowerCase());
const myItem = (id) => myRec()?.items?.[id] || {};
const countryOf = (id) => D().countries.find((c) => c.id === id) || { id, name: id };
const pavCountry = (anchor) => (anchor === "america" ? "usa" : anchor);
const anchorOf = (id) => D().anchors[id];
const drinkById = (id) => D().drinks.find((d) => d.id === id);

function opensOn(d) {
  const f = D().festival;
  if (d.source === "festival" && f && !f.active && f.starts) return d.opens && d.opens > f.starts ? d.opens : f.starts;
  return d.opens;
}
function isOpen(d) {
  const t = D().today, o = opensOn(d);
  if (d.source === "festival" && !D().festival?.active) return false;
  return (!o || o <= t) && (!d.closes || d.closes >= t) && !d.status?.soldOut;
}
function familyOn(id) {
  const out = [];
  for (const m of members()) { const it = m.items?.[id]; if (it) out.push({ m, it }); }
  return out;
}
function avgRating(id) {
  const r = familyOn(id).map((x) => x.it.rating).filter((n) => n > 0);
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : 0;
}
// A member's check-ins resolved against today's menu, falling back to the saved snapshot.
function memberItems(rec) {
  return Object.entries(rec?.items || {}).map(([id, it]) => {
    const d = drinkById(id);
    const snap = it.snap || {};
    return {
      id, it, current: !!d,
      name: d?.name || snap.name || "A drink", booth: d?.booth || snap.booth || "", price: d?.price || snap.price || "",
      type: d?.type || snap.type || "cocktail", country: d?.country || snap.country || "park",
      festival: d ? (d.yearRound ? "Year-round" : festLabel()) : snap.festival || "Earlier visit",
      d,
    };
  });
}
const festLabel = () => { const f = D().festival; return f?.name ? `${shortFest(f.name)} ${f.year || ""}`.trim() : "Year-round"; };
const stampsFor = (rec) => new Set(memberItems(rec).filter((x) => x.it.tried && x.country !== "park").map((x) => x.country));

function passesFilters(d) {
  const f = state.filters;
  if (!f.fest && (d.source === "festival" || (d.source === "family" && !d.yearRound))) return false;
  if (!f.yr && (d.source === "yearround" || (d.source === "family" && d.yearRound))) return false;
  const g = TYPE_GROUPS.find((x) => x[0] === f.group);
  if (g?.[2] && !g[2].includes(d.type)) return false;
  if (f.only === "open" && !isOpen(d)) return false;
  if (f.only === "new" && !d.isNew) return false;
  if (f.only === "untried" && myItem(d.id).tried) return false;
  if (f.only === "want" && !myItem(d.id).want) return false;
  if (f.q) {
    const hay = `${d.name} ${d.desc} ${d.booth} ${countryOf(d.country).name} ${d.where}`.toLowerCase();
    if (!hay.includes(f.q.trim().toLowerCase())) return false;
  }
  return true;
}
const visibleDrinks = () => D().drinks.filter(passesFilters);

// ── Festival theming & header ─────────────────────────────────────────────
function applyTheme() {
  const n = (D().festival?.active ? D().festival.name : D().nextFestival?.name || "").toLowerCase();
  let a = "#1f5fa8", b = "#c9982e";
  if (n.includes("food")) { a = "#a3263a"; b = "#c9982e"; }
  else if (n.includes("holiday")) { a = "#b3202f"; b = "#2f8a5a"; }
  else if (n.includes("art")) { a = "#6b3fa0"; b = "#d9a11f"; }
  else if (n.includes("flower")) { a = "#c2446e"; b = "#5a9a3a"; }
  document.documentElement.style.setProperty("--accent", a);
  document.documentElement.style.setProperty("--accent-2", b);
}

function ago(iso) {
  if (!iso) return "never";
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  const d = Math.round(s / 86400);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

function renderHeader() {
  const { festival: f, nextFestival: nf, today, menu, refresh } = D();
  let name, meta;
  if (f?.active) {
    const day = Math.round((Date.parse(today) - Date.parse(f.starts)) / 864e5) + 1;
    const len = Math.round((Date.parse(f.ends) - Date.parse(f.starts)) / 864e5) + 1;
    name = shortFest(f.name);
    meta = `Day ${day} of ${len} · ends ${fmtDate(f.ends)}`;
  } else if (f?.name && f.starts > today) {
    name = `Coming: ${shortFest(f.name)}`;
    meta = `Starts ${fmtDate(f.starts)} · year-round drinks now`;
  } else {
    name = "EPCOT World Showcase";
    meta = nf?.name ? `Next: ${shortFest(nf.name)}${nf.starts ? ` · ${fmtDate(nf.starts)}` : ""}` : "Year-round drinks";
  }
  const busy = refresh?.state === "running" || refresh?.state === "queued";
  const stale = !menu?.checkedAt || (Date.now() - Date.parse(menu.checkedAt)) / 864e5 > (refresh?.everyDays || 3) + 1;
  $("#festName").textContent = name;
  $("#festMeta").innerHTML = `<span>${esc(meta)}</span><span class="fresh ${busy ? "busy" : stale ? "stale" : ""}">${busy ? "updating menu…" : `menu ${ago(menu?.checkedAt)}`}</span>`;
  $("#meAvatar").innerHTML = state.me ? avatar(state.me.emoji) : `<span class="avatar">${icon("user")}</span>`;
  $("#meName").textContent = state.me?.name || "Join";
}

// ── Render root ───────────────────────────────────────────────────────────
function render() {
  if (!D()) return;
  applyTheme();
  document.body.dataset.tab = state.tab;
  document.body.dataset.drawer = state.drawer;
  renderHeader();
  if (state.tab === "map") {
    const sig = D().menu.checkedAt + "|" + D().menu.yearRoundCheckedAt;
    const was = { ...stageSize };
    measureStage();
    if (mapBuiltFor !== sig) { buildMap(); mapBuiltFor = sig; }
    else if (was.W !== stageSize.W || was.H !== stageSize.H) fitMap();
    renderLayers();
    renderMarkers();
    renderDrawer();
    return;
  }
  const view = $("#view");
  const banner = state.offline ? `<div class="offline">Offline — showing the last menu we loaded</div>` : "";
  let html = "";
  if (state.tab === "list") html = renderList();
  else if (state.tab === "family") html = renderFamily();
  else html = renderPassport();
  view.innerHTML = banner + html;
}

// ══════════════════════════════════════════════════════════════════════════
//  MAP
// ══════════════════════════════════════════════════════════════════════════
const NS = "http://www.w3.org/2000/svg";
let geo = null;          // projection + shapes
let vb = null;           // current viewBox {x, y, w, h}
let fitVB = null;
let view = null;          // what is on screen right now (may differ from vb mid-gesture)

function project(lat, lng) {
  return { x: -(lng - geo.lng0) * Math.cos(geo.lat0 * Math.PI / 180) * 111320, y: (lat - geo.lat0) * 110540 };
}
function smooth(pts, closed) {
  // Catmull-Rom → cubic Bézier
  const n = pts.length, P = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  const end = closed ? n : n - 1;
  for (let i = 0; i < end; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += `C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return closed ? d + "Z" : d;
}
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent?.appendChild(e);
  return e;
};
// Deterministic randomness so trees don't jump around between renders.
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6d2b79f5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const circ = (x, y, r) => `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
function hull(pts) {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function inPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function segDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

function buildMap() {
  const A = D().anchors;
  const ring = D().ring;
  const lat0 = ring.reduce((s, id) => s + A[id].lat, 0) / ring.length;
  const lng0 = ring.reduce((s, id) => s + A[id].lng, 0) / ring.length;
  geo = { lat0, lng0, pts: {} };
  for (const [id, a] of Object.entries(A)) geo.pts[id] = project(a.lat, a.lng);
  const P = geo.pts;
  const C = { x: 0, y: 0 };
  ring.forEach((id) => { C.x += P[id].x / ring.length; C.y += P[id].y / ring.length; });
  geo.center = C;
  const loopIds = ["plaza-mexico-side", ...ring, "plaza-canada-side"];
  // Polar-smoothed loop so the lagoon reads as a lagoon, not a polygon.
  const polar = loopIds.map((id) => { const p = P[id]; return { a: Math.atan2(p.y - C.y, p.x - C.x), r: Math.hypot(p.x - C.x, p.y - C.y) }; });
  const sm = polar.map((p, i) => {
    const n = polar.length, w = [0.2, 0.6, 0.2];
    return { a: p.a, r: w[0] * polar[(i - 1 + n) % n].r + w[1] * p.r + w[2] * polar[(i + 1) % n].r };
  });
  const loop = (k, dense = 4) => {
    const pts = [];
    for (let i = 0; i < sm.length; i++) {
      const p = sm[i], q = sm[(i + 1) % sm.length];
      let da = q.a - p.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      for (let j = 0; j < dense; j++) {
        const t = j / dense, a = p.a + da * t, r = (p.r + (q.r - p.r) * t) * k;
        pts.push({ x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r });
      }
    }
    return pts;
  };
  const unit = loop(1, 10);
  const Rat = (x, y) => {           // loop radius in the direction of (x, y)
    const a = Math.atan2(y - C.y, x - C.x);
    let best = unit[0], bd = 9;
    for (const q of unit) { let d = Math.abs(Math.atan2(q.y - C.y, q.x - C.x) - a); if (d > Math.PI) d = 2 * Math.PI - d; if (d < bd) { bd = d; best = q; } }
    return Math.hypot(best.x - C.x, best.y - C.y);
  };
  const out = (p, dist) => { const d = Math.hypot(p.x - C.x, p.y - C.y) || 1; return { x: p.x + (p.x - C.x) / d * dist, y: p.y + (p.y - C.y) / d * dist }; };
  const prom = loop(0.8);
  const lag = loop(0.69);
  const deep = loop(0.63);
  const se = P["spaceship-earth"];
  const entrance = { x: se.x, y: se.y + 120 };
  const gateMid = { x: (P.france.x + P.uk.x) / 2, y: (P.france.y + P.uk.y) / 2 };
  const gateIn = out(gateMid, -Math.hypot(gateMid.x - C.x, gateMid.y - C.y) * 0.18);
  const gate = out(gateMid, 95);
  geo.gate = gate; geo.entrance = entrance;

  // Park boundary: hull around the loop, Future World, the entrance and the Gateway.
  const land = hull([...loop(1.2, 2), ...Object.values(P).map((p) => out(p, 60)), { x: entrance.x - 90, y: entrance.y + 40 }, { x: entrance.x + 90, y: entrance.y + 40 }, out(gate, 30)]);
  const landD = smooth(land, true);

  const svg = $("#map");
  svg.innerHTML = "";
  const defs = el("defs", {}, svg);
  defs.innerHTML = `
    <radialGradient id="lagoonG" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="var(--water-deep)"/><stop offset=".75" stop-color="var(--water)"/><stop offset="1" stop-color="var(--water)"/></radialGradient>
    <pattern id="forestP" width="46" height="40" patternUnits="userSpaceOnUse">
      <rect width="46" height="40" fill="var(--forest)"/>
      <g fill="var(--forest-2)"><circle cx="8" cy="9" r="9"/><circle cx="30" cy="6" r="8"/><circle cx="20" cy="26" r="10"/><circle cx="42" cy="28" r="8"/><circle cx="2" cy="34" r="7"/></g>
      <g fill="#5d8a50"><circle cx="6" cy="7" r="5"/><circle cx="28" cy="4" r="4.5"/><circle cx="18" cy="23" r="6"/><circle cx="40" cy="25" r="4.5"/></g>
    </pattern>
    <pattern id="grassP" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M3 5l1-2M13 15l1-2M19 4l1-2M8 20l1-2" stroke="var(--grass-2)" stroke-width="1.2"/></pattern>
    <pattern id="paveP" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="var(--pave)"/><path d="M0 8h8M8 0v8" stroke="var(--pave-edge)" stroke-width=".35" opacity=".7"/></pattern>
    <radialGradient id="seG" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fbfdff"/><stop offset=".45" stop-color="#c6ccd3"/><stop offset="1" stop-color="#6f7780"/></radialGradient>
    <radialGradient id="seShine" cx="30%" cy="25%" r="35%"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <clipPath id="seClip"><circle r="16"/></clipPath>
    <clipPath id="landClip"><path d="${landD}"/></clipPath>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>`;

  const world = el("g", { id: "world" }, svg);
  el("rect", { x: C.x - 1600, y: C.y - 1600, width: 3200, height: 3200, fill: "url(#forestP)" }, world);
  // Land + berm
  el("path", { d: landD, fill: "#2f5528", opacity: .5, transform: "translate(5 7)", filter: "url(#soft)" }, world);
  el("path", { d: landD, fill: "var(--grass)", stroke: "#3d6634", "stroke-width": 5 }, world);
  el("path", { d: landD, fill: "url(#grassP)" }, world);

  // Walkways (Future World + entrance + Gateway)
  const walks = [
    ["plaza-mexico-side", "east-walkway", "odyssey", "test-track", "mission-space", "guardians", "creations", "spaceship-earth"],
    ["plaza-canada-side", "culinary-corridor", "imagination", "the-land", "seas", "spaceship-earth"],
    ["showcase-plaza", "communicore", "connections", "spaceship-earth"],
  ].map((w) => w.map((id) => P[id]));
  walks.push([se, { x: se.x, y: se.y + 60 }, entrance]);
  walks.push([gateIn, gateMid, gate]);
  geo.walks = walks;
  const walkG = el("g", {}, world);
  const paveStroke = (d, w) => {
    el("path", { d, fill: "none", stroke: "var(--pave-edge)", "stroke-width": w + 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, walkG);
    el("path", { d, fill: "none", stroke: "var(--pave)", "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" }, walkG);
  };
  for (const w of walks) paveStroke(smooth(w, false), 18);
  // Plazas
  const plaza = (cx, cy, rx, ry) => {
    el("ellipse", { cx, cy, rx: rx + 2.5, ry: ry + 2.5, fill: "var(--pave-edge)" }, walkG);
    el("ellipse", { cx, cy, rx, ry, fill: "url(#paveP)" }, walkG);
  };
  plaza(P.communicore.x, P.communicore.y, 40, 40);
  plaza((P["plaza-mexico-side"].x + P["plaza-canada-side"].x) / 2, P["showcase-plaza"].y, 118, 26);
  plaza(se.x, se.y, 44, 44);
  plaza(entrance.x, entrance.y, 70, 26);
  // Entrance flower beds + CommuniCore fountain
  const beds = rng(7);
  for (let i = 0; i < 26; i++) {
    const a = beds() * Math.PI * 2, r = 30 + beds() * 8;
    el("circle", { cx: se.x + Math.cos(a) * 48 * (i % 2 ? 1 : 1.12), cy: se.y + Math.sin(a) * 48 * (i % 2 ? 1 : 1.12), r: 2.4, fill: ["#e05a8a", "#f2c94c", "#ffffff", "#c8405a"][i % 4] }, walkG);
  }
  el("circle", { cx: P.communicore.x, cy: P.communicore.y, r: 13, fill: "var(--water)", stroke: "#fff", "stroke-width": 2 }, walkG);
  el("circle", { cx: P.communicore.x, cy: P.communicore.y, r: 5, fill: "var(--water-shallow)" }, walkG);

  // Promenade
  const promD = smooth(prom, true);
  el("path", { d: promD, fill: "none", stroke: "var(--pave-edge)", "stroke-width": 40, "stroke-linejoin": "round" }, world);
  el("path", { d: promD, fill: "none", stroke: "url(#paveP)", "stroke-width": 35, "stroke-linejoin": "round" }, world);
  el("path", { d: promD, fill: "none", stroke: "var(--pave-edge)", "stroke-width": 1, "stroke-dasharray": "6 5", opacity: .8 }, world);

  // Pavilion courtyards, facing the lagoon
  const padG = el("g", {}, world);
  for (const id of ring) {
    const p = out(P[id], 12), ang = Math.atan2(p.y - C.y, p.x - C.x) * 180 / Math.PI + 90;
    const g = el("g", { transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${ang.toFixed(1)})` }, padG);
    el("rect", { x: -40, y: -22, width: 80, height: 44, fill: "var(--pave-edge)" }, g);
    el("rect", { x: -38, y: -20, width: 76, height: 40, fill: "url(#paveP)" }, g);
    el("rect", { x: -26, y: -34, width: 52, height: 16, fill: "#d9cfb8", stroke: "#b9aa88", "stroke-width": 1 }, g);
  }

  // Lagoon: shore, shallows, deep water, waves, a couple of FriendShip boats
  const lagD = smooth(lag, true);
  el("path", { d: lagD, fill: "none", stroke: "var(--shore)", "stroke-width": 9, "stroke-linejoin": "round" }, world);
  el("path", { d: lagD, fill: "var(--water-shallow)" }, world);
  el("path", { d: smooth(deep, true), fill: "url(#lagoonG)" }, world);
  const wr = rng(42);
  let waves = "";
  for (let i = 0; i < 90; i++) {
    const x = C.x + (wr() - .5) * 700, y = C.y + (wr() - .5) * 560;
    if (Math.hypot(x - C.x, y - C.y) > Rat(x, y) * 0.58) continue;
    waves += `M${x.toFixed(1)} ${y.toFixed(1)}q3.5-3 7 0t7 0`;
  }
  el("path", { d: waves, fill: "none", stroke: "#fff", "stroke-width": 1.3, opacity: .45, "stroke-linecap": "round" }, world);
  const boat = (x, y, rot) => {
    const g = el("g", { transform: `translate(${x} ${y}) rotate(${rot})` }, world);
    el("path", { d: "M-14 0 0-2l0 0M-26 6q16 8 52 0", fill: "none", stroke: "#fff", "stroke-width": 1, opacity: .7 }, g);
    el("path", { d: "M-12-4h22l4 4-4 4h-22z", fill: "#fff", stroke: "#2a241e", "stroke-width": .8 }, g);
    el("rect", { x: -8, y: -3, width: 14, height: 6, fill: "#2d6aa8" }, g);
  };
  boat(C.x - 60, C.y + 70, -20); boat(C.x + 90, C.y - 40, 160);

  // Future World / World Celebration buildings (map-scale footprints)
  const fw = el("g", {}, world);
  const bld = (id, fn) => { const p = P[id]; if (!p) return; const g = el("g", { transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})` }, fw); fn(g); };
  const shadowed = (g, tag, attrs) => { el(tag, { ...attrs, fill: "#1d2a17", opacity: .22, transform: "translate(4 5)" }, g); el(tag, attrs, g); };
  bld("the-land", (g) => { shadowed(g, "rect", { x: -60, y: -34, width: 120, height: 68, fill: "#dcd8c8", stroke: "#8e8870", "stroke-width": 1.2 });
    el("path", { d: "M-50-24l20 20-20 20M-20-24 0-4-20 16M10-24l20 20-20 20M40-24 55-4 40 16", fill: "none", stroke: "#8fb9bf", "stroke-width": 7, "stroke-linejoin": "round", opacity: .9 }, g); });
  bld("imagination", (g) => { [[-20, 6, 26], [16, -4, 34]].forEach(([x, y, s]) => { shadowed(g, "path", { d: `M${x - s / 2} ${y + s / 2}L${x} ${y - s / 2}L${x + s / 2} ${y + s / 2}z`, fill: "#b8dbe8", stroke: "#4f8aa3", "stroke-width": 1.2 });
    el("path", { d: `M${x} ${y - s / 2}V${y + s / 2}`, stroke: "#4f8aa3", "stroke-width": .8 }, g); }); });
  bld("seas", (g) => { shadowed(g, "path", { d: "M-55 20C-55-10-30-30 0-26S55-6 55 20z", fill: "#c9e3ea", stroke: "#5f96a8", "stroke-width": 1.2 });
    el("path", { d: "M-44 8q11-10 22 0t22 0 22 0 22 0", fill: "none", stroke: "#3f8fb0", "stroke-width": 3 }, g); });
  bld("mission-space", (g) => { shadowed(g, "circle", { r: 26, fill: "#c9653f", stroke: "#7d3a24", "stroke-width": 1.2 });
    el("ellipse", { rx: 38, ry: 9, fill: "none", stroke: "#e9c9a2", "stroke-width": 3, transform: "rotate(-18)" }, g);
    el("circle", { cx: 34, cy: -22, r: 7, fill: "#8a9aa6", stroke: "#4a5058" }, g); el("circle", { cx: -30, cy: 24, r: 5, fill: "#d9a441", stroke: "#7d5a24" }, g); });
  bld("test-track", (g) => { el("rect", { x: -80, y: -34, width: 110, height: 68, rx: 34, fill: "none", stroke: "#6b737b", "stroke-width": 7 }, g);
    el("rect", { x: -80, y: -34, width: 110, height: 68, rx: 34, fill: "none", stroke: "#e8e8e8", "stroke-width": 1, "stroke-dasharray": "5 5" }, g);
    shadowed(g, "rect", { x: -44, y: -18, width: 54, height: 36, fill: "#d8dbe0", stroke: "#6b737b", "stroke-width": 1.2 }); el("path", { d: "M-44-6h54", stroke: "#c4302a", "stroke-width": 3 }, g); });
  bld("guardians", (g) => { shadowed(g, "rect", { x: -44, y: -28, width: 88, height: 56, fill: "#5d4f86", stroke: "#2f2745", "stroke-width": 1.2 });
    el("path", { d: "M-44 0h88M-22-28v56M22-28v56", stroke: "#8573b8", "stroke-width": 1 }, g); el("circle", { r: 9, fill: "#e5b93f", stroke: "#2f2745" }, g); });
  bld("odyssey", (g) => shadowed(g, "path", { d: "M-18-10 0-20 18-10v20L0 20-18 10z", fill: "#e2dccd", stroke: "#8e8870", "stroke-width": 1.2 }));
  bld("communicore", (g) => { ["M-62-18A64 64 0 0 1-18-62", "M18-62A64 64 0 0 1 62-18", "M62 18A64 64 0 0 1 18 62", "M-18 62A64 64 0 0 1-62 18"].forEach((d) => {
    el("path", { d, fill: "none", stroke: "#1d2a17", "stroke-width": 16, opacity: .2, transform: "translate(4 5)" }, g);
    el("path", { d, fill: "none", stroke: "#ece6d6", "stroke-width": 16 }, g); el("path", { d, fill: "none", stroke: "#a9a28c", "stroke-width": 1, transform: "scale(1.13)" }, g); }); });

  // Trees: seeded scatter across open grass, clear of water, paths and buildings.
  const rt = rng(1234);
  const avoid = [...ring.map((id) => [out(P[id], 12), 46]), ...["the-land", "imagination", "seas", "mission-space", "test-track", "guardians", "odyssey", "communicore", "spaceship-earth", "creations", "connections"].map((id) => [P[id], 72]), [entrance, 80]];
  const bb = land.reduce((b, p) => ({ x0: Math.min(b.x0, p.x), x1: Math.max(b.x1, p.x), y0: Math.min(b.y0, p.y), y1: Math.max(b.y1, p.y) }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
  const shade = ["", "", ""], hi = [], lo = [];
  let placed = 0;
  for (let i = 0; i < 2600 && placed < 520; i++) {
    const p = { x: bb.x0 + rt() * (bb.x1 - bb.x0), y: bb.y0 + rt() * (bb.y1 - bb.y0) };
    if (!inPoly(p, land)) continue;
    const rr = Math.hypot(p.x - C.x, p.y - C.y), R = Rat(p.x, p.y);
    if (rr < R * 0.69 + 8) continue;                               // lagoon + shore
    if (Math.abs(rr - R * 0.8) < 26) continue;                      // promenade
    if (avoid.some(([q, d]) => Math.hypot(p.x - q.x, p.y - q.y) < d)) continue;
    if (walks.some((w) => w.some((q, k) => k && segDist(p, w[k - 1], q) < 18))) continue;
    if (Math.abs(p.y - P["showcase-plaza"].y) < 34 && Math.abs(p.x - (P["plaza-mexico-side"].x + P["plaza-canada-side"].x) / 2) < 130) continue;
    const r = 5 + rt() * 5;
    lo.push(circ(p.x + 2.5, p.y + 3, r));
    shade[placed % 3] += circ(p.x, p.y, r);
    hi.push(circ(p.x - r * .3, p.y - r * .3, r * .45));
    placed++;
  }
  const treeG = el("g", {}, world);
  el("path", { d: lo.join(""), fill: "#1d2a17", opacity: .28 }, treeG);
  ["var(--tree)", "var(--tree-lo)", "#6fa352"].forEach((c, k) => el("path", { d: shade[k], fill: c, stroke: "#2f5226", "stroke-width": .6 }, treeG));
  el("path", { d: hi.join(""), fill: "var(--tree-hi)", opacity: .75 }, treeG);

  // Spaceship Earth, drawn to scale
  const sg = el("g", { transform: `translate(${se.x} ${se.y}) scale(1.9)` }, world);
  sg.innerHTML = spaceshipEarth();

  // Bounds → initial fit
  const ids = [...ring, "spaceship-earth", "the-land", "mission-space"];
  const xs = ids.map((i) => P[i].x), ys = ids.map((i) => P[i].y);
  geo.bounds = { x0: Math.min(...xs) - 40, x1: Math.max(...xs) + 40, y0: Math.min(...ys) - 60, y1: Math.max(...ys) + 50 };
  fitMap();
  initPanZoom();
}

// Map name labels, as an HTML overlay (they stay crisp and never scale).
function areaLabelsHTML(S) {
  const P = geo.pts, C = geo.center;
  let html = "";
  const add = (p, text, cls) => { html += `<div class="mlabel ${cls}" data-wx="${p.x.toFixed(1)}" data-wy="${p.y.toFixed(1)}"><span>${esc(text)}</span></div>`; };
  add({ x: C.x, y: C.y - 8 }, "World Showcase", "water");
  add({ x: C.x, y: C.y + 10 }, "Lagoon", "water sm");
  add({ x: P.communicore.x, y: P.communicore.y + 62 }, "World Celebration", "land");
  const mid = (a, b) => ({ x: (P[a].x + P[b].x) / 2, y: (P[a].y + P[b].y) / 2 });
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  add(lerp(P.communicore, mid("test-track", "mission-space"), 0.55), "World Discovery", "land");
  add(lerp(P.communicore, mid("the-land", "imagination"), 0.55), "World Nature", "land");
  add({ x: geo.entrance.x, y: geo.entrance.y }, "Main Entrance", "gate");
  add({ x: geo.gate.x, y: geo.gate.y + 12 }, "Int'l Gateway", "gate");
  const small = [["test-track", "Test Track"], ["the-land", "The Land"], ["imagination", "Imagination!"], ["seas", "The Seas"], ["guardians", "Cosmic Rewind"], ["mission-space", "Mission: SPACE"], ["spaceship-earth", "Spaceship Earth"]];
  for (const [id, name] of small) {
    if (S[id] && id !== "spaceship-earth") continue;
    add({ x: P[id].x, y: P[id].y + (id === "spaceship-earth" ? 40 : 0) }, name, "fw");
  }
  return html;
}

// Group the visible drinks by anchor → map markers.
function spots() {
  const by = {};
  for (const d of D().drinks) {
    const a = d.anchor && anchorOf(d.anchor) ? d.anchor : "showcase-plaza";
    (by[a] ||= { id: a, all: [], vis: [] }).all.push(d);
  }
  for (const d of visibleDrinks()) {
    const a = d.anchor && anchorOf(d.anchor) ? d.anchor : "showcase-plaza";
    by[a].vis.push(d);
  }
  return by;
}

// Markers grow a little as you zoom in, so the map feels like a map and not a sticker sheet.
const zoomK = () => (fitVB && view ? fitVB.w / view.w : 1);
const growPav = () => Math.max(0.9, Math.min(2.1, Math.pow(zoomK(), 0.55)));
const growPin = () => Math.max(0.9, Math.min(1.5, Math.pow(zoomK(), 0.35)));

function renderMarkers() {
  const ov = $("#overlay");
  if (!ov || !geo || !view) return;
  updateScale();
  const pxPerM = stageSize.W / view.w;
  const S = spots();
  const rec = myRec();
  const ordered = Object.keys(D().anchors).sort((a, b) => (D().anchors[a].kind === "pavilion") - (D().anchors[b].kind === "pavilion"));
  const shown = ordered.filter((id) => S[id] || D().anchors[id].kind === "pavilion");
  const gp = growPav(), gn = growPin();
  // Spread overlapping markers apart in screen space; the offsets ride along with zoom.
  const base = shown.map((id) => { const p = geo.pts[id], pav = D().anchors[id].kind === "pavilion"; return { id, x: (p.x - view.x) * pxPerM, y: (p.y - view.y) * pxPerM, r: pav ? 25 * gp : 14 * gn, g: pav ? gp : gn }; });
  const disp = spread(base);
  const off = Object.fromEntries(base.map((b) => [b.id, { dx: (disp[b.id].x - b.x) / b.g, dy: (disp[b.id].y - b.y) / b.g }]));
  let html = areaLabelsHTML(S);
  for (const id of shown) {
    const a = D().anchors[id];
    const s = S[id];
    const isPav = a.kind === "pavilion";
    if (!s && !isPav) continue;
    const p = geo.pts[id], o = off[id];
    const vis = s?.vis || [];
    const tried = rec && s?.all.some((d) => rec.items[d.id]?.tried);
    const allSoon = vis.length && vis.every((d) => !isOpen(d) && !d.status?.soldOut);
    const cls = `marker ${!vis.length ? "dim" : ""} ${state.sel === id ? "sel" : ""} ${tried ? "tried" : ""}`;
    const pos = `data-wx="${p.x.toFixed(1)}" data-wy="${p.y.toFixed(1)}" data-dx="${o.dx.toFixed(1)}" data-dy="${o.dy.toFixed(1)}"`;
    if (isPav) {
      const name = a.name.replace("The American Adventure", "America").replace("United Kingdom", "U.K.");
      const w = name.length * 5.6 + 14;
      html += `<div class="${cls}" data-anchor="${id}" data-kind="pav" ${pos} data-ox="40" data-oy="36" style="transform-origin:40px 36px">
        <svg width="80" height="66" viewBox="-40 -36 80 66">
        <circle r="30" cy="-4" class="hit"/>
        <circle r="25" cy="-6" class="sel-ring"/>
        <g class="art">${LANDMARKS[id] || ""}</g>
        <rect class="plate-bg" x="${-w / 2}" y="11" width="${w}" height="14"/>
        <text class="plate-t" y="18.3">${esc(name)}</text>
        ${vis.length ? `<rect class="tag ${allSoon ? "soon" : ""}" x="11" y="-30" width="17" height="15"/><text class="tag-t" x="19.5" y="-22.3">${vis.length}</text>` : ""}
        ${tried ? `<rect class="tried-tag" x="-26" y="-30" width="14" height="14"/><path d="M-23.5-23 -20.5-20l5-5.5" fill="none" stroke="#fff" stroke-width="2"/>` : ""}
        </svg></div>`;
    } else {
      const first = vis[0] || s.all[0];
      const inner = first.country !== "park"
        ? `<svg class="pin-flag" x="-9" y="-25" width="18" height="12" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice">${flagBody(first.country)}</svg>`
        : `<svg class="pin-flag" x="-7.5" y="-26.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="${iconPath(typeIcon(s.all))}"/></svg>`;
      const names = [...new Set(s.all.map((d) => d.booth))];
      html += `<div class="${cls}" data-anchor="${id}" data-kind="pin" ${pos} data-ox="40" data-oy="44" style="transform-origin:40px 44px">
        <svg width="80" height="64" viewBox="-40 -44 80 64">
        <circle r="20" cy="-16" class="hit"/>
        <ellipse cx="0" cy="0" rx="5" ry="2" fill="#000" opacity=".3"/>
        <path class="pin-body" d="M0 0C-3-6-12-10-12-19A12 12 0 1 1 12-19C12-10 3-6 0 0Z"/>
        ${inner}
        ${vis.length ? `<rect class="tag ${allSoon ? "soon" : ""}" x="6" y="-38" width="15" height="13"/><text class="tag-t" x="13.5" y="-31.3">${vis.length}</text>` : ""}
        ${pxPerM > 1.1 || state.sel === id ? `<text class="booth-t" y="12">${esc(names[0] + (names.length > 1 ? ` +${names.length - 1}` : ""))}</text>` : ""}
        </svg></div>`;
    }
  }
  if (state.me_pos) html += `<div class="me" data-kind="me" data-wx="${state.me_pos.x.toFixed(1)}" data-wy="${state.me_pos.y.toFixed(1)}" data-ox="12" data-oy="12"><span class="me-pulse"></span><span class="me-dot"></span></div>`;
  ov.innerHTML = html;
  overlayItems.length = 0;
  for (const el of ov.children) {
    const d = el.dataset;
    overlayItems.push({ el, x: +d.wx, y: +d.wy, dx: +d.dx || 0, dy: +d.dy || 0, ox: +d.ox || 0, oy: +d.oy || 0, kind: d.kind || "label" });
  }
  placeOverlay();
  hideCrowdedLabels();
}
const renderMe = () => renderMarkers();

// Land and building names give way to drink markers when they'd overlap.
function hideCrowdedLabels() {
  const boxes = [...document.querySelectorAll("#overlay .marker .hit")].map((m) => m.getBoundingClientRect());
  const hit = (a, b) => a.left < b.right - 4 && a.right > b.left + 4 && a.top < b.bottom - 4 && a.bottom > b.top + 4;
  document.querySelectorAll("#overlay .mlabel:not(.water) span").forEach((t) => {
    t.style.visibility = boxes.some((b) => hit(t.getBoundingClientRect(), b)) ? "hidden" : "";
  });
}

function typeIcon(ds) {
  const n = {};
  for (const d of ds) n[d.type] = (n[d.type] || 0) + 1;
  const top = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  return TYPE_ICON[top?.[0]] || "glass";
}
const iconPath = (name) => (icon(name).match(/ d="([^"]+)"/) || [])[1] || "";

// Push overlapping markers apart so neighbours like Norway & China stay tappable.
function spread(items) {
  const pos = items.map((i) => ({ ...i }));
  for (let it = 0; it < 40; it++) {
    let movedAny = false;
    for (let a = 0; a < pos.length; a++) for (let b = a + 1; b < pos.length; b++) {
      const A = pos[a], B = pos[b];
      let dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
      const min = A.r + B.r;
      if (d >= min) continue;
      if (d < 0.01) { dx = 1; dy = 0.3; d = 1.04; }
      const push = (min - d) / 2;
      A.x -= dx / d * push; A.y -= dy / d * push; B.x += dx / d * push; B.y += dy / d * push;
      movedAny = true;
    }
    if (!movedAny) break;
  }
  return Object.fromEntries(pos.map((p) => [p.id, { x: p.x, y: p.y }]));
}

// Scale bar in feet, plus rough walking time (≈80 m per minute).
function updateScale() {
  const bar = $("#scaleBar");
  if (!bar || !view) return;
  const pxPerM = stageSize.W / view.w;
  const ft = [50, 100, 200, 300, 500, 1000, 2000].find((f) => f * 0.3048 * pxPerM >= 56) || 2000;
  const m = ft * 0.3048;
  bar.style.width = `${Math.round(m * pxPerM)}px`;
  const mins = Math.round(m / 80);
  const txt = `${ft.toLocaleString()} FT${mins >= 1 ? ` · ${mins} MIN WALK` : ""}`;
  if ($("#scaleT").textContent !== txt) $("#scaleT").textContent = txt;
}

// ── Viewport ──────────────────────────────────────────────────────────────
// Smooth pan/zoom: while you're moving, the heavy map is slid/scaled as one GPU layer and the
// markers/labels (an HTML overlay) glide on top. The SVG itself is only re-drawn once the map
// settles — the same trick real map apps use.
const stageSize = { W: 390, H: 700 };
const overlayItems = [];
let anim = null, commitT = null;

function measureStage() {
  const r = $("#mapStage")?.getBoundingClientRect();
  if (r?.width) { stageSize.W = r.width; stageSize.H = r.height; }
}
const clampW = (w) => { const b = geo.bounds; return Math.max(110, Math.min((b.x1 - b.x0) * 2.2, w)); };
function clampView(v) {
  const { W, H } = stageSize, b = geo.bounds;
  const cx0 = v.x + v.w / 2, cy0 = v.y + (v.w * H / W) / 2;
  const w = clampW(v.w), h = w * H / W;
  const cx = Math.max(b.x0, Math.min(b.x1, cx0)), cy = Math.max(b.y0 - 60, Math.min(b.y1 + 60, cy0));
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
// Zoom by f keeping the world point under screen point (sx, sy) fixed.
function zoomAbout(v, sx, sy, f) {
  const { W, H } = stageSize, h = v.w * H / W;
  const wx = v.x + sx / W * v.w, wy = v.y + sy / H * h;
  const nw = clampW(v.w / f), nh = nw * H / W;
  return clampView({ x: wx - sx / W * nw, y: wy - sy / H * nh, w: nw });
}

let drawQueued = false;
function requestDraw() { if (!drawQueued) { drawQueued = true; requestAnimationFrame(draw); } }
function draw() {
  drawQueued = false;
  if (!view || !vb) return;
  const s = vb.w / view.w, k = stageSize.W / vb.w;
  const tx = (vb.x - view.x) * k * s, ty = (vb.y - view.y) * k * s;
  $("#map").style.transform = Math.abs(s - 1) < 1e-6 && Math.abs(tx) < 0.01 && Math.abs(ty) < 0.01 ? "" : `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${s.toFixed(5)})`;
  placeOverlay();
  updateScale();
}
function placeOverlay() {
  const pxPerM = stageSize.W / view.w, gp = growPav(), gn = growPin();
  for (const it of overlayItems) {
    const g = it.kind === "pav" ? gp : it.kind === "pin" ? gn : 1;
    const sx = (it.x - view.x) * pxPerM + it.dx * g - it.ox, sy = (it.y - view.y) * pxPerM + it.dy * g - it.oy;
    it.el.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0)${g !== 1 ? ` scale(${g.toFixed(3)})` : ""}`;
  }
}
// Re-draw the SVG crisply at the settled position.
function commit() {
  clearTimeout(commitT);
  if (!view) return;
  vb = { ...view };
  const svg = $("#map");
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  svg.style.transform = "";
  renderMarkers();
}
const commitSoon = (ms = 160) => { clearTimeout(commitT); commitT = setTimeout(commit, ms); };
function stopAnim() { if (anim) { cancelAnimationFrame(anim); anim = null; } }

function flyTo(target, ms = 340) {
  stopAnim(); clearTimeout(commitT);
  const from = { ...view }, to = clampView(target), { W, H } = stageSize;
  const fc = { x: from.x + from.w / 2, y: from.y + from.h / 2 }, tc = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3);
    const w = from.w * Math.pow(to.w / from.w, e), h = w * H / W;
    view = { x: fc.x + (tc.x - fc.x) * e - w / 2, y: fc.y + (tc.y - fc.y) * e - h / 2, w, h };
    draw();
    if (t < 1) anim = requestAnimationFrame(step); else { anim = null; commit(); }
  };
  anim = requestAnimationFrame(step);
}
// Momentum after a flick.
function glide(vx, vy) {
  stopAnim();
  let last = performance.now();
  const step = (now) => {
    const dt = Math.min(34, now - last); last = now;
    const f = Math.pow(0.9955, dt);
    vx *= f; vy *= f;
    const m = view.w / stageSize.W;
    const next = clampView({ x: view.x - vx * dt * m, y: view.y - vy * dt * m, w: view.w });
    if (Math.abs(next.x - (view.x - vx * dt * m)) > 0.01) vx = 0;   // hit the edge
    if (Math.abs(next.y - (view.y - vy * dt * m)) > 0.01) vy = 0;
    view = next;
    draw();
    if (Math.hypot(vx, vy) > 0.02) anim = requestAnimationFrame(step); else { anim = null; commit(); }
  };
  anim = requestAnimationFrame(step);
}

function computeFit() {
  const { W, H } = stageSize, b = geo.bounds;
  const top = 118, bottom = 138; // header + filter bar, drawer peek
  const left = 22, right = 56;   // clear of the zoom tools
  const usableH = Math.max(200, H - top - bottom), usableW = Math.max(200, W - left - right);
  const k = Math.min(usableW / (b.x1 - b.x0), usableH / (b.y1 - b.y0)); // px per meter
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  return { x: cx - (left + usableW / 2) / k, y: cy - (top + usableH / 2) / k, w: W / k, h: H / k };
}
function fitMap() {
  measureStage();
  stopAnim();
  fitVB = computeFit();
  view = { ...fitVB };
  vb = { ...fitVB };
  const svg = $("#map");
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  svg.style.transform = "";
  updateScale();
}

let pzReady = false;
function initPanZoom() {
  if (pzReady) return;
  pzReady = true;
  const stage = $("#mapStage");
  const pts = new Map();
  let g = null, lastTap = { t: 0, x: 0, y: 0 };
  const local = (e) => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  // (Re)start the gesture from the current fingers, so adding/lifting a finger never jumps.
  const rebase = () => {
    const ps = [...pts.values()];
    g.view0 = { ...view };
    if (ps.length >= 2) {
      g.mid0 = { x: (ps[0].x + ps[1].x) / 2, y: (ps[0].y + ps[1].y) / 2 };
      g.d0 = Math.max(10, Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y));
    } else g.p0 = { ...ps[0] };
    g.samples = [];
  };

  stage.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    stopAnim(); clearTimeout(commitT);
    stage.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, local(e));
    if (pts.size === 1) g = { moved: 0, pinched: false, start: local(e), marker: e.target.closest?.(".marker")?.dataset.anchor || null };
    if (pts.size === 2) g.pinched = true;
    rebase();
  });
  stage.addEventListener("pointermove", (e) => {
    if (!pts.has(e.pointerId) || !g) return;
    pts.set(e.pointerId, local(e));
    const ps = [...pts.values()];
    const { W, H } = stageSize;
    if (ps.length >= 2) {
      const mid = { x: (ps[0].x + ps[1].x) / 2, y: (ps[0].y + ps[1].y) / 2 };
      const d = Math.max(10, Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y));
      const v0 = g.view0, h0 = v0.w * H / W;
      const wx = v0.x + g.mid0.x / W * v0.w, wy = v0.y + g.mid0.y / H * h0;   // world point that started under the fingers
      const nw = clampW(v0.w * g.d0 / d), nh = nw * H / W;
      view = clampView({ x: wx - mid.x / W * nw, y: wy - mid.y / H * nh, w: nw });
      g.moved = 99;
    } else {
      const p = ps[0];
      g.moved = Math.max(g.moved, Math.hypot(p.x - g.start.x, p.y - g.start.y));
      if (g.moved < 4 && !g.pinched) return;   // don't twitch on a tap
      const m = g.view0.w / W;
      view = clampView({ x: g.view0.x - (p.x - g.p0.x) * m, y: g.view0.y - (p.y - g.p0.y) * m, w: g.view0.w });
      g.samples.push({ x: p.x, y: p.y, t: e.timeStamp });
      if (g.samples.length > 6) g.samples.shift();
    }
    requestDraw();
  });
  const up = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size) { rebase(); return; }
    const gest = g; g = null;
    if (!gest) return;
    const p = local(e);
    if (gest.moved < 8 && !gest.pinched) {
      const dbl = e.timeStamp - lastTap.t < 300 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30;
      lastTap = { t: dbl ? 0 : e.timeStamp, x: p.x, y: p.y };
      if (gest.marker) return selectSpot(gest.marker);
      if (dbl) return flyTo(zoomAbout(view, p.x, p.y, 2));
      if (state.filtersOpen) setFiltersOpen(false);
      else if (state.drawer !== "peek") { state.sel = null; state.drawer = "peek"; render(); }
      return;
    }
    const s = gest.samples || [];
    const a = s[0], b = s[s.length - 1];
    if (!gest.pinched && a && b && b.t - a.t > 8 && e.timeStamp - b.t < 60) {
      const vx = (b.x - a.x) / (b.t - a.t), vy = (b.y - a.y) / (b.t - a.t);
      if (Math.hypot(vx, vy) > 0.25) return glide(Math.max(-4, Math.min(4, vx)), Math.max(-4, Math.min(4, vy)));
    }
    commit();
  };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  // Mouse wheel zooms; trackpad pinch zooms; two-finger trackpad scroll pans.
  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    stopAnim();
    const p = local(e);
    const px = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? stageSize.H : 1;
    const mouseWheel = e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
    if (e.ctrlKey || mouseWheel) view = zoomAbout(view, p.x, p.y, Math.exp(-e.deltaY * px * (e.ctrlKey ? 0.01 : 0.002)));
    else { const m = view.w / stageSize.W; view = clampView({ x: view.x + e.deltaX * px * m, y: view.y + e.deltaY * px * m, w: view.w }); }
    requestDraw();
    commitSoon();
  }, { passive: false });
  window.addEventListener("resize", () => { if (state.tab === "map" && geo) { fitMap(); renderMarkers(); } });
}

function zoomBy(f) { if (view) flyTo(zoomAbout(view, stageSize.W / 2, stageSize.H * 0.42, f), 280); }

function selectSpot(id) {
  state.sel = id;
  state.drawer = "half";
  render();
  // glide the spot into view above the drawer, zooming in a little if we're zoomed out
  const p = geo.pts[id], { W, H } = stageSize;
  const w = Math.min(view.w, fitVB.w / 1.5), h = w * H / W;
  flyTo({ x: p.x - w / 2, y: p.y - 0.26 * h, w }, 420);
}

// ── Filters (collapsible; shared by the map and the menu list) ────────────
const activeFilterCount = () => { const f = state.filters; return (f.group !== "all") + (f.only !== "all") + !f.fest + !f.yr; };
function filterSummary() {
  const f = state.filters, fest = D().festival;
  const menus = [f.fest && fest?.name ? shortFest(fest.name).replace(/ Festival$/, "") : null, f.yr ? "Year-round" : null].filter(Boolean).join(" + ") || "No menus";
  const g = TYPE_GROUPS.find((x) => x[0] === f.group), o = ONLY.find((x) => x[0] === f.only);
  return `<b>${esc(menus)}</b> · ${esc(f.group === "all" ? "All drinks" : g[1])}${f.only !== "all" ? ` · ${esc(o[1])}` : ""}`;
}
function filterPanel() {
  const f = state.filters, fest = D().festival, n = activeFilterCount(), open = state.filtersOpen;
  return `<div class="filterbar" data-open="${open}">
      <button class="fb-toggle" data-ftoggle aria-expanded="${open}">${icon("filter")}Filters${n ? `<span class="count">${n}</span>` : ""}${icon("chevron", "chev")}</button>
      <div class="fb-sum">${filterSummary()}</div>
    </div>
    <div class="filter-panel" ${open ? "" : "hidden"}><div class="fp-inner">
      <div class="fp-sec"><h5>Menus ${n ? `<button data-freset>Reset all</button>` : ""}</h5><div class="switches">
        ${fest?.name ? `<button class="switch ${f.fest ? "on" : ""}" data-layer="fest"><span>${esc(shortFest(fest.name))}<small>${fest.active ? `Festival booths · through ${fmtDate(fest.ends)}` : `Festival booths · starts ${fmtDate(fest.starts)}`}</small></span><span class="track"></span></button>` : ""}
        <button class="switch ${f.yr ? "on" : ""}" data-layer="yr"><span>Year-round drinks<small>Pavilion bars, carts &amp; restaurants</small></span><span class="track"></span></button>
      </div></div>
      <div class="fp-sec"><h5>Drink type</h5><div class="fp-grid">${TYPE_GROUPS.map(([k, l, , ic]) => `<button class="fp-type ${f.group === k ? "on" : ""}" data-group="${k}">${icon(ic)}${l}</button>`).join("")}</div></div>
      <div class="fp-sec"><h5>Show</h5><div class="seg">${ONLY.map(([k, l, ic]) => `<button class="${f.only === k ? "on" : ""}" data-only="${k}">${ic ? icon(ic) : ""}${l}</button>`).join("")}</div></div>
    </div></div>`;
}
function setFiltersOpen(open) {
  state.filtersOpen = open;
  ls.set(LS.fopen, open);
  document.querySelectorAll(".filterbar").forEach((b) => { b.dataset.open = open; b.querySelector("[data-ftoggle]")?.setAttribute("aria-expanded", open); });
  document.querySelectorAll(".filter-panel").forEach((p) => { p.hidden = !open; });
}
function renderLayers() { $("#mapFilters").innerHTML = filterPanel(); }

function spotArt(id, ds) {
  const a = anchorOf(id);
  if (a?.kind === "pavilion" && LANDMARKS[id]) return `<span class="spot-art"><svg viewBox="-25 -29 50 41" aria-hidden="true">${LANDMARKS[id]}</svg></span>`;
  const first = ds?.[0];
  if (first && first.country !== "park") return `<span class="spot-art">${flag(first.country)}</span>`;
  return `<span class="spot-art">${icon(ds?.length ? typeIcon(ds) : "pin")}</span>`;
}
const walkMins = (id) => (state.me_pos && geo ? Math.max(1, Math.round(Math.hypot(geo.pts[id].x - state.me_pos.x, geo.pts[id].y - state.me_pos.y) / 80)) : null);

function renderDrawer() {
  const body = $("#drawerBody");
  const dr = $("#drawer");
  dr.dataset.state = state.drawer;
  if (!state.sel) {
    const vis = visibleDrinks();
    const open = vis.filter(isOpen).length;
    const fresh = vis.filter((d) => d.isNew).length;
    const top = [...vis].map((d) => ({ d, r: avgRating(d.id) })).filter((x) => x.r).sort((a, b) => b.r - a.r)[0];
    const soon = D().festival && !D().festival.active && D().festival.starts > D().today;
    body.innerHTML = `
      <div class="spot-head"><span class="spot-art">${icon("compass")}</span><div><h2>Explore the park</h2><p>${vis.length} drinks shown · ${open} open now${soon ? ` · festival starts ${fmtDate(D().festival.starts)}` : ""}</p></div></div>
      <div class="peek-row">
        ${state.me_pos ? `<button class="peek-card" data-nearest>${icon("locate")}<span><b>Closest drink</b>to where you are</span></button>` : ""}
        ${fresh ? `<button class="peek-card" data-only-jump="new">${icon("sparkle")}<span><b>${fresh} new</b>this week</span></button>` : ""}
        ${top ? `<button class="peek-card" data-jump="${esc(top.d.anchor)}">${icon("star")}<span><b>${top.r.toFixed(1)} family pick</b>${esc(top.d.name)}</span></button>` : ""}
        <button class="peek-card" data-tabjump="list">${icon("walk")}<span><b>Walk the loop</b>drinks in walking order</span></button>
      </div>`;
    return;
  }
  const a = anchorOf(state.sel);
  const S = spots()[state.sel] || { all: [], vis: [] };
  const list = S.vis.length ? S.vis : [];
  const hidden = S.all.length - S.vis.length;
  const booths = [];
  for (const d of list) {
    let b = booths.find((x) => x.name === d.booth);
    if (!b) booths.push((b = { name: d.booth, where: d.where, note: d.note, yr: d.yearRound, drinks: [] }));
    b.drinks.push(d);
  }
  const mins = walkMins(state.sel);
  body.innerHTML = `
    <div class="spot-head">${spotArt(state.sel, list.length ? list : S.all)}<div><h2>${esc(a.name)}</h2>
      <p>${list.length} drink${list.length === 1 ? "" : "s"}${hidden > 0 ? ` · ${hidden} hidden by filters` : ""}${mins ? ` · ${icon("walk")} ~${mins} min` : ""}</p></div>
      <button class="x" data-closespot aria-label="Close">${icon("close")}</button></div>
    ${booths.map((b) => `
      <p class="booth-name">${esc(b.name)}${b.yr ? ' <span class="chip">Year-round</span>' : ""}</p>
      ${b.where ? `<p class="booth-where">${icon("pin")}${esc(b.where)}</p>` : ""}
      ${b.note ? `<div class="note">${esc(b.note)}</div>` : ""}
      <div class="drinks">${b.drinks.map((d) => drinkCard(d)).join("")}</div>`).join("")
    || `<div class="empty"><div class="e">${icon("glass")}</div><p>${hidden ? "Nothing here matches your filters." : "No drinks listed here right now."}</p></div>`}`;
}

// ── Geolocation ───────────────────────────────────────────────────────────
function toggleLocate() {
  if (state.watching) {
    navigator.geolocation.clearWatch(state.watching);
    state.watching = false; state.me_pos = null;
    $("#locBtn").classList.remove("on"); renderMarkers(); renderDrawer(); return;
  }
  if (!navigator.geolocation) return toast("Location isn't available on this device");
  let first = true;
  state.watching = navigator.geolocation.watchPosition((pos) => {
    const { latitude: lat, longitude: lng } = pos.coords;
    const p = project(lat, lng);
    const far = Math.hypot(p.x - geo.center.x, p.y - geo.center.y);
    if (far > 1500) {
      if (first) toast(`You're about ${(far / 1609).toFixed(far > 16000 ? 0 : 1)} mi from EPCOT — the dot will appear once you're in the park`);
      state.me_pos = null;
    } else {
      state.me_pos = { ...p, lat, lng };
      if (first) flyTo({ x: p.x - view.w / 2, y: p.y - view.h * 0.35, w: view.w });
    }
    first = false;
    $("#locBtn").classList.add("on");
    renderMarkers(); if (!state.sel) renderDrawer();
  }, () => { toast("Couldn't get your location — check location permissions"); state.watching = false; }, { enableHighAccuracy: true, maximumAge: 10000 });
}

// ══════════════════════════════════════════════════════════════════════════
//  CARDS & VIEWS
// ══════════════════════════════════════════════════════════════════════════
function drinkCard(d, { showWhere = false } = {}) {
  const mine = myItem(d.id);
  const fam = familyOn(d.id).filter((x) => x.it.tried);
  const avg = avgRating(d.id);
  const t = D().today;
  const o = opensOn(d);
  const chips = [`<span class="chip">${TYPE_LABEL[d.type] || d.type}</span>`];
  if (d.isNew) chips.push(`<span class="chip new">${icon("sparkle")}New</span>`);
  if (o && o > t) chips.push(`<span class="chip soon">${icon("clock")}Opens ${fmtDate(o)}</span>`);
  if (d.closes && d.closes < t) chips.push(`<span class="chip warn">Ended ${fmtDate(d.closes)}</span>`);
  else if (d.closes) chips.push(`<span class="chip">Until ${fmtDate(d.closes)}</span>`);
  if (d.status?.soldOut) chips.push(`<span class="chip warn">${icon("ban")}Sold out today · ${esc(d.status.by || "family")}</span>`);
  if (d.source === "family") chips.push(`<span class="chip fam">${icon("user")}Found by ${esc(d.addedBy || "family")}</span>`);
  if (avg) chips.push(`<span class="chip star">${icon("star")}${avg.toFixed(1)} family</span>`);
  const stars = [1, 2, 3, 4, 5].map((n) => `<button data-rate="${n}" aria-label="Rate ${n}" class="${(mine.rating || 0) >= n ? "lit" : ""}">${icon("star")}</button>`).join("");
  return `<article class="drink ${mine.tried ? "tried" : ""} ${d.status?.soldOut ? "soldout" : ""}" data-id="${esc(d.id)}">
    <div class="drink-top">
      <span class="drink-type" title="${esc(TYPE_LABEL[d.type] || d.type)}">${icon(TYPE_ICON[d.type] || "glass")}</span>
      <div class="drink-title"><h4>${esc(d.name)}</h4>${d.desc ? `<p class="desc">${esc(d.desc)}</p>` : ""}</div>
      <span class="price">${d.price ? esc(d.price) : '<span class="muted">—</span>'}</span>
    </div>
    ${showWhere ? `<p class="where">${flag(d.country)}${esc(d.booth)}${d.where ? ` · ${esc(d.where)}` : ""}<button class="linkbtn" data-jump="${esc(d.anchor)}">${icon("map")}Map</button></p>` : ""}
    <div class="chips">${chips.join("")}</div>
    ${fam.length ? `<div class="fam-row"><span style="display:inline-flex">${fam.map((x) => avatar(x.m.emoji)).join("")}</span>
      <span>${fam.map((x) => esc(x.m.name) + (x.it.rating ? ` ${x.it.rating}★` : "")).join(", ")}</span></div>` : ""}
    ${mine.note ? `<p class="my-note">“${esc(mine.note)}”</p>` : ""}
    <div class="actions">
      <button class="btn ${mine.tried ? "on-tried" : ""}" data-act="tried">${icon("check")}${mine.tried ? "Tried" : "Tried it"}</button>
      <span class="stars">${stars}</span>
      <button class="btn icon push ${mine.want ? "on-want" : ""}" data-act="want" aria-label="Want to try">${icon("heart")}</button>
      <button class="btn icon ghost" data-act="more" aria-label="More">${icon("more")}</button>
    </div>
  </article>`;
}

function renderList() {
  const f = state.filters;
  const list = visibleDrinks();
  const order = (a) => { const i = WALK.indexOf(a); return i < 0 ? 999 : i; };
  let body = "";
  if (f.sort === "walk" || f.sort === "near") {
    const groups = {};
    for (const d of list) (groups[d.anchor] ||= []).push(d);
    let keys = Object.keys(groups).sort((a, b) => order(a) - order(b));
    if (f.sort === "near" && state.me_pos && geo) {
      const dist = (id) => Math.hypot(geo.pts[id].x - state.me_pos.x, geo.pts[id].y - state.me_pos.y);
      keys = keys.sort((a, b) => dist(a) - dist(b));
    }
    body = `<div class="stop">${keys.map((k) => {
      const a = anchorOf(k) || { name: k };
      const ds = groups[k];
      const mins = walkMins(k);
      return `<div class="stop-head">${spotArt(k, ds)}<div><h3>${esc(a.name)}</h3><small>${ds.length} drink${ds.length > 1 ? "s" : ""}${mins ? ` · ${icon("walk")} ~${mins} min` : ""}</small></div>
        <button class="btn icon ghost push" data-jump="${esc(k)}" aria-label="Show on map">${icon("map")}</button></div>
        <div class="drinks">${ds.map((d) => drinkCard(d)).join("")}</div>`;
    }).join("")}</div>`;
  } else {
    const sorted = [...list];
    if (f.sort === "price") sorted.sort((a, b) => priceNum(a.price) - priceNum(b.price));
    if (f.sort === "rating") sorted.sort((a, b) => avgRating(b.id) - avgRating(a.id));
    if (f.sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    body = `<div class="drinks">${sorted.map((d) => drinkCard(d, { showWhere: true })).join("")}</div>`;
  }
  return `
    <h2 class="section-title">The menu</h2>
    <p class="section-sub">${esc(festLabel())} plus year-round pavilion drinks</p>
    <div class="search-wrap">${icon("search")}<input class="search" id="q" type="search" placeholder="Search drinks, booths, ingredients…" value="${esc(f.q)}" autocomplete="off" /></div>
    <div class="list-filters">${filterPanel()}</div>
    <div class="count-row">
      <p class="count-line">${list.length} drink${list.length === 1 ? "" : "s"}</p>
      <select class="sort" id="sort" aria-label="Sort">
        <option value="walk" ${f.sort === "walk" ? "selected" : ""}>Walk the loop</option>
        ${state.me_pos ? `<option value="near" ${f.sort === "near" ? "selected" : ""}>Closest to me</option>` : ""}
        <option value="price" ${f.sort === "price" ? "selected" : ""}>Cheapest first</option>
        <option value="rating" ${f.sort === "rating" ? "selected" : ""}>Family favorites</option>
        <option value="name" ${f.sort === "name" ? "selected" : ""}>A–Z</option>
      </select>
    </div>
    ${list.length ? body : `<div class="empty"><div class="e">${icon("search")}</div><p>No drinks match.</p></div>`}`;
}

function renderFamily() {
  const ms = members().map((m) => {
    const items = memberItems(m);
    return { m, tried: items.filter((x) => x.it.tried).length, stamps: stampsFor(m).size, now: items.filter((x) => x.it.tried && x.current).length };
  }).sort((a, b) => b.now - a.now || b.tried - a.tried);
  if (!ms.length) return `<div class="empty"><div class="e">${icon("family")}</div><p>No one has checked in yet.<br/>Text this site's link to the family — everyone picks their name on their own phone.</p></div>`;

  const rated = D().drinks.map((d) => {
    const rs = familyOn(d.id).map((x) => x.it.rating).filter(Boolean);
    return { d, n: rs.length, avg: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0 };
  }).filter((x) => x.n).sort((a, b) => b.avg - a.avg || b.n - a.n).slice(0, 8);
  const wanted = D().drinks.map((d) => ({ d, n: familyOn(d.id).filter((x) => x.it.want && !x.it.tried).length })).filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 6);
  const feed = [];
  for (const m of members()) for (const x of memberItems(m)) if (x.it.at) feed.push({ m, x });
  feed.sort((a, b) => b.x.it.at.localeCompare(a.x.it.at));
  const starRow = (n) => `<span class="feed-stars">${Array.from({ length: n }, () => icon("star")).join("")}</span>`;

  return `
    <h2 class="section-title">Family</h2>
    <p class="section-sub">${esc(festLabel())} · updates live from everyone's phones</p>
    <div class="card"><h3>${icon("trophy")}Leaderboard</h3><div class="rows">${ms.map((x, i) => `
      <div class="leader"><span class="rank">${i + 1}</span>${avatar(x.m.emoji)}
        <div class="who"><b>${esc(x.m.name)}</b><small>${x.stamps} countr${x.stamps === 1 ? "y" : "ies"} stamped · ${x.tried} all-time</small></div>
        <div class="score">${x.now}<small>this menu</small></div></div>`).join("")}</div></div>
    ${rated.length ? `<div class="card"><h3>${icon("star")}Family favorites</h3><div class="rows">${rated.map((x) => `
      <div class="leader">${flag(x.d.country)}
        <div class="who"><b>${esc(x.d.name)}</b><small>${esc(x.d.booth)} · ${x.n} rating${x.n > 1 ? "s" : ""}</small></div>
        <div class="score">${x.avg.toFixed(1)}<small>avg stars</small></div></div>`).join("")}</div></div>` : ""}
    ${wanted.length ? `<div class="card"><h3>${icon("heart")}Most wanted</h3><div class="rows">${wanted.map((x) => `
      <div class="leader">${flag(x.d.country)}
        <div class="who"><b>${esc(x.d.name)}</b><small>${esc(x.d.booth)}${x.d.price ? ` · ${esc(x.d.price)}` : ""}</small></div>
        <div class="score">${x.n}<small>want it</small></div></div>`).join("")}</div></div>` : ""}
    <div class="card"><h3>${icon("clock")}Recent check-ins</h3><div class="rows">${feed.slice(0, 25).map(({ m, x }) => `
      <div class="feed-item">${avatar(m.emoji)}<div>
        <b>${esc(m.name)}</b> ${x.it.tried ? "tried" : "wants"} <b>${esc(x.name)}</b> ${flag(x.country)}
        ${x.it.rating ? ` ${starRow(x.it.rating)}` : ""}
        ${x.it.note ? `<div class="my-note">“${esc(x.it.note)}”</div>` : ""}
        <time>${ago(x.it.at)}${x.current ? "" : ` · ${esc(x.festival)}`}</time></div></div>`).join("") || `<p class="muted" style="padding:12px 0">Nothing yet.</p>`}</div></div>`;
}

const STAMP_INK = ["#f2c46a", "#f59a86", "#a9d4f2", "#b9e3a0", "#e3b5f0"];
function stampSVG(c, got, i) {
  const ink = got ? STAMP_INK[i % STAMP_INK.length] : "#efe6cf";
  const rot = got ? ((i * 37) % 26) - 13 : 0;
  const name = c.name.replace("United Kingdom", "U.K.").replace("United States", "U.S.A.").toUpperCase();
  return `<div class="stamp ${got ? "" : "empty-s"}" title="${esc(c.name)}">
    <svg class="st" viewBox="-40 -40 80 80" style="transform:rotate(${rot}deg)" aria-hidden="true">
      <defs><path id="stT-${c.id}" d="M-26 0a26 26 0 1 1 52 0"/><path id="stB-${c.id}" d="M-29 0a29 29 0 1 0 58 0"/></defs>
      <circle r="37" fill="none" stroke="${ink}" stroke-width="2.4" ${got ? "" : 'stroke-dasharray="3 3"'}/>
      <circle r="21" fill="none" stroke="${ink}" stroke-width=".8"/>
      <text fill="${ink}" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="${name.length > 11 ? 7.5 : 9}" letter-spacing="1.2"><textPath href="#stT-${c.id}" startOffset="50%" text-anchor="middle">${esc(name)}</textPath></text>
      <text fill="${ink}" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="6.5" letter-spacing="2.4" dominant-baseline="hanging"><textPath href="#stB-${c.id}" startOffset="50%" text-anchor="middle">★ EPCOT ★</textPath></text>
      <svg x="-13.5" y="-9" width="27" height="18" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" style="${got ? "" : "filter:grayscale(1)"}">${flagBody(c.id)}</svg>
    </svg></div>`;
}

function renderPassport() {
  if (!state.me) return `<div class="empty"><div class="e">${icon("passport")}</div><p>Pick your name to start your passport.</p><button class="btn accent" data-join>Join the family</button></div>`;
  const rec = myRec();
  const items = memberItems(rec);
  const tried = items.filter((x) => x.it.tried);
  const want = items.filter((x) => x.it.want && !x.it.tried && x.current);
  const got = stampsFor(rec);
  const cs = D().countries.filter((c) => c.pavilion || got.has(c.id) || D().drinks.some((d) => d.country === c.id)).filter((c) => c.id !== "park");
  const byFest = {};
  for (const x of tried) (byFest[x.festival] ||= []).push(x);
  const spent = tried.filter((x) => x.current).reduce((s, x) => s + (Number.isFinite(priceNum(x.price)) ? priceNum(x.price) : 0), 0);

  return `
    <div class="passport">
      <span class="seal">${icon("globe")}</span>
      <div class="passport-head">${avatar(state.me.emoji)}<div><div class="eyebrow">World Showcase Passport</div><h2>${esc(state.me.name)}</h2></div></div>
      <div class="meta"><span><b>${tried.length}</b>drinks</span><span><b>${got.size}/${cs.length}</b>stamps</span>${spent ? `<span><b>$${spent.toFixed(0)}</b>this menu</span>` : ""}</div>
      <div class="stamps">${cs.map((c, i) => stampSVG(c, got.has(c.id), i)).join("")}</div>
    </div>
    ${want.length ? `<p class="group-label">${icon("heart")}Want to try (${want.length})</p><div class="drinks">${want.map((x) => drinkCard(x.d, { showWhere: true })).join("")}</div>` : ""}
    ${Object.entries(byFest).map(([fest, xs]) => `
      <p class="group-label">${icon("check")}${esc(fest)} (${xs.length})</p>
      <div class="drinks">${xs.sort((a, b) => (b.it.rating || 0) - (a.it.rating || 0)).map((x) => x.d ? drinkCard(x.d, { showWhere: true }) : `
        <article class="drink tried"><div class="drink-top"><span class="drink-type">${icon(TYPE_ICON[x.type] || "glass")}</span><div class="drink-title"><h4>${esc(x.name)}</h4></div><span class="price">${esc(x.price)}</span></div>
          <p class="where">${flag(x.country)}${esc(x.booth)} · no longer on the menu</p>
          <div class="chips">${x.it.rating ? `<span class="chip star">${icon("star")}${x.it.rating}</span>` : ""}</div>
          ${x.it.note ? `<p class="my-note">“${esc(x.it.note)}”</p>` : ""}</article>`).join("")}</div>`).join("")
    || `<div class="empty"><div class="e">${icon("glass")}</div><p>Nothing yet — pick a pavilion on the map and start sipping.</p></div>`}`;
}

// ══════════════════════════════════════════════════════════════════════════
//  SHEETS
// ══════════════════════════════════════════════════════════════════════════
function openSheet(html, onMount) { $("#sheetBody").innerHTML = html; $("#sheet").hidden = false; onMount?.($("#sheetBody")); }
function closeSheet() { $("#sheet").hidden = true; $("#sheetBody").innerHTML = ""; }
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2600); }

function joinSheet() {
  let emoji = state.me?.emoji || "@" + AVATARS[0][0];
  const existing = members();
  openSheet(`
    <h2>Who's sipping?</h2>
    <p class="muted">Pick your name so your check-ins show up for the whole family.</p>
    ${existing.length ? `<div class="member-list">${existing.map((m) => `<button class="btn" data-pick="${esc(m.name)}" data-emoji="${esc(m.emoji || "")}">${avatar(m.emoji)} ${esc(m.name)}</button>`).join("")}</div><p class="muted" style="margin-top:14px">…or add yourself:</p>` : ""}
    <label class="field"><span>Your name</span><input id="joinName" maxlength="24" placeholder="e.g. Mom, Jake, Grandpa" value="${esc(state.me?.name || "")}" /></label>
    <div class="field"><span>Pick a badge</span><div class="av-pick">${AVATARS.map(([k]) => `<button type="button" data-emo="@${k}" aria-label="${k}" class="${"@" + k === emoji ? "on" : ""}">${avatar("@" + k)}</button>`).join("")}</div></div>
    ${D()?.requiresCode ? `<label class="field"><span>Family code</span><input id="joinCode" autocomplete="off" value="${esc(state.code)}" placeholder="Ask whoever set up the site" /></label>` : ""}
    <button class="btn accent block" id="joinGo">Save</button>
    ${state.me ? `<button class="btn ghost block" id="logout" style="margin-top:6px">Switch person on this phone</button>` : ""}
  `, (el) => {
    const saveCode = () => { const c = $("#joinCode")?.value.trim(); if (c != null) { state.code = c; ls.set(LS.code, c); } };
    el.querySelectorAll("[data-emo]").forEach((b) => b.onclick = () => { emoji = b.dataset.emo; el.querySelectorAll("[data-emo]").forEach((x) => x.classList.toggle("on", x === b)); });
    el.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => {
      saveCode(); state.me = { name: b.dataset.pick, emoji: b.dataset.emoji }; ls.set(LS.me, state.me);
      closeSheet(); render(); toast(`Welcome back, ${state.me.name}!`);
    });
    $("#logout", el)?.addEventListener("click", () => { state.me = null; ls.set(LS.me, null); closeSheet(); render(); });
    $("#joinGo", el).onclick = async () => {
      const name = $("#joinName").value.trim();
      if (!name) return toast("Type your name first");
      saveCode();
      try { await api("profile", { method: "POST", body: { member: name, emoji } }); state.me = { name, emoji }; ls.set(LS.me, state.me); closeSheet(); await load(); toast(`Hi ${name}! Tap a pavilion to start.`); }
      catch (e) { toast(e.message); }
    };
  });
}

function askForCode() {
  openSheet(`<h2>Family code</h2><p class="muted">Enter the family code to save changes.</p>
    <label class="field"><span>Code</span><input id="codeIn" autocomplete="off" value="${esc(state.code)}" /></label>
    <button class="btn accent block" id="codeGo">Unlock</button>`, (el) => {
    $("#codeGo", el).onclick = async () => {
      state.code = $("#codeIn").value.trim(); ls.set(LS.code, state.code);
      try { await api("verify", { method: "POST", body: {} }); closeSheet(); toast("Unlocked"); } catch {}
    };
  });
}

function addSheet() {
  if (!state.me) return joinSheet();
  const A = D().anchors;
  const opts = WALK.filter((id) => A[id]).map((id) => `<option value="${id}" ${id === state.sel ? "selected" : ""}>${esc(A[id].name)}</option>`).join("");
  const guessCountry = state.sel && A[state.sel]?.kind === "pavilion" ? (state.sel === "america" ? "usa" : state.sel) : "park";
  openSheet(`
    <h2>Add a drink</h2>
    <p class="muted">Spotted something that isn't listed? Add it and everyone sees it on the map.</p>
    <label class="field"><span>Drink name *</span><input id="aName" maxlength="90" placeholder="e.g. Frozen Grey Goose Orange Slush" /></label>
    <label class="field"><span>Where is it? (map spot)</span><select id="aAnchor">${opts}</select></label>
    <label class="field"><span>Booth / bar name</span><input id="aBooth" maxlength="60" placeholder="e.g. Les Vins des Chefs de France" /></label>
    <label class="field"><span>Country</span><select id="aCountry">${D().countries.map((c) => `<option value="${c.id}" ${c.id === guessCountry ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
    <label class="field"><span>Type</span><select id="aType">${D().types.map((t) => `<option value="${t}">${TYPE_LABEL[t]}</option>`).join("")}</select></label>
    <label class="field"><span>Price</span><input id="aPrice" maxlength="30" placeholder="$14.00" /></label>
    <label class="field"><span>What's in it?</span><textarea id="aDesc" rows="2" maxlength="240"></textarea></label>
    <label class="check-field"><input type="checkbox" id="aYr" /> <span>It's on the year-round menu (not just this festival)</span></label>
    <button class="btn accent block" id="aGo">Add for everyone</button>`, (el) => {
    $("#aGo", el).onclick = async () => {
      const body = { member: state.me.name, name: $("#aName").value, anchor: $("#aAnchor").value, country: $("#aCountry").value, booth: $("#aBooth").value, type: $("#aType").value, price: $("#aPrice").value, desc: $("#aDesc").value, yearRound: $("#aYr").checked };
      if (!body.name.trim()) return toast("Give it a name");
      try { await api("drinks", { method: "POST", body }); closeSheet(); await load(); toast("Added for everyone"); } catch (e) { toast(e.message); }
    };
  });
}

function moreSheet(d) {
  const mine = myItem(d.id);
  openSheet(`
    <h2>${esc(d.name)}</h2>
    <p class="muted" style="display:flex;align-items:center;gap:8px">${flag(d.country)} ${esc(d.booth)}${d.price ? ` · ${esc(d.price)}` : ""}</p>
    <label class="field"><span>Your tasting note</span><textarea id="noteIn" rows="3" maxlength="280" placeholder="Too sweet? Worth it? Get the big one?">${esc(mine.note || "")}</textarea></label>
    <button class="btn accent block" id="saveNote">Save note</button>
    <div style="height:10px"></div>
    <button class="btn block" id="soldOut">${d.status?.soldOut ? `${icon("check")}It's back — clear sold out` : `${icon("ban")}Sold out today`}</button>
    <button class="btn ghost block" id="toMap" style="margin-top:6px">${icon("map")}Show on map</button>
    ${d.source === "family" ? `<button class="btn ghost danger block" id="del" style="margin-top:6px">${icon("trash")}Delete this family-added drink</button>` : ""}
  `, (el) => {
    $("#saveNote", el).onclick = async () => { await checkin(d.id, { note: $("#noteIn").value }); closeSheet(); toast("Note saved"); };
    $("#toMap", el).onclick = () => { closeSheet(); jumpTo(d.anchor); };
    $("#soldOut", el).onclick = async () => {
      try { await api("status", { method: "POST", body: { drinkId: d.id, soldOut: !d.status?.soldOut, member: state.me?.name } }); closeSheet(); await load(); toast("Updated for everyone"); } catch (e) { toast(e.message); }
    };
    $("#del", el)?.addEventListener("click", async () => {
      if (!confirm("Delete this drink for everyone?")) return;
      try { await api(`drinks/${encodeURIComponent(d.id)}`, { method: "DELETE" }); closeSheet(); await load(); toast("Deleted"); } catch (e) { toast(e.message); }
    });
  });
}

// Settings: menu status, manual update via claude.ai (no API key), optional API refresh.
const admin = { code: null, prompt: null, text: null };

function infoSheet() {
  const { festival: f, nextFestival: nf, menu, refresh } = D();
  const st = refresh || {};
  const busy = st.state === "running" || st.state === "queued";
  const src = (menu.sources || []).slice(0, 8).map((u) => `<div class="src">• <a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, ""))}</a></div>`).join("");
  const origin = { seed: " (starter menu)", manual: " (uploaded)", claude: "" }[menu.origin] || "";
  const unlocked = !!admin.prompt;
  openSheet(`
    <h2>Settings</h2>
    <p class="group-label">${icon("info")}Current menu</p>
    <dl class="kv">
      <dt>Festival</dt><dd>${f?.name ? `${esc(f.name)}<br><span class="muted">${fmtDate(f.starts)} – ${fmtDate(f.ends)}${f.active ? "" : " (not running today)"}</span>` : "None running today"}</dd>
      ${nf?.name ? `<dt>Next up</dt><dd>${esc(nf.name)}${nf.starts ? ` · ${fmtDate(nf.starts)}` : ""}</dd>` : ""}
      <dt>Festival menu</dt><dd>updated ${ago(menu.checkedAt)}${origin}</dd>
      <dt>Year-round</dt><dd>${menu.yearRoundCheckedAt ? `updated ${ago(menu.yearRoundCheckedAt)}` : "starter list"}</dd>
      <dt>Last update</dt><dd>${st.state === "never" ? "—" : `${esc(st.state)} ${ago(st.finishedAt || st.startedAt)}${st.message ? `<br><span class="muted">${esc(st.message)}</span>` : ""}`}</dd>
    </dl>
    ${src ? `<details class="srcs"><summary>Sources (${(menu.sources || []).length})</summary>${src}</details>` : ""}

    <p class="group-label">${icon("refresh")}Update the menu</p>
    ${unlocked ? `
      <ol class="steps">
        <li><b>Copy the prompt</b><p>It already knows today's date and every map spot and field the app needs.</p>
          <div class="btn-row"><button class="btn accent" id="copyPrompt">${icon("copy")}Copy prompt</button></div>
          <details class="prompt-peek"><summary>Show the prompt</summary><textarea class="mono" id="promptText" readonly>${esc(admin.prompt)}</textarea></details></li>
        <li><b>Run it in Claude</b><p>Paste it into a new chat at claude.ai with <b style="display:inline;font:inherit;text-transform:none;letter-spacing:0">web search</b> turned on. It replies with one block of JSON; this can take a few minutes. If the reply stops early, tell it "continue".</p>
          <div class="btn-row"><a class="btn" href="https://claude.ai/new" target="_blank" rel="noopener">${icon("external")}Open claude.ai</a></div></li>
        <li><b>Upload the reply</b><p>Save the JSON as a file and drop it here, or copy Claude's whole reply and paste it below.</p>
          <label class="drop" id="drop">${icon("upload")}<b>Choose or drop a file</b><span>.json or .txt</span><input type="file" id="importFile" accept=".json,.txt,application/json,text/plain" /></label>
          <textarea class="mono" id="importText" placeholder="…or paste Claude's reply here" style="min-height:90px">${esc(admin.text || "")}</textarea>
          <div class="btn-row" style="margin-top:8px"><button class="btn primary" id="checkImport">${icon("check")}Check it</button></div>
          <div id="importPreview" style="margin-top:12px"></div></li>
      </ol>` : `
      <p class="muted" style="font-size:.88rem">Get a ready-made prompt for claude.ai, then upload its reply to update the map for everyone. No API key needed.</p>
      <label class="field"><span>Password</span><input id="adminCode" type="password" autocomplete="off" value="${esc(ls.get(LS.rcode, ""))}" placeholder="Menu password" /></label>
      <button class="btn accent block" id="unlock">${icon("lock")}Unlock</button>`}

    ${st.enabled ? `
      <p class="group-label">${icon("bolt")}Automatic research</p>
      <p class="muted" style="font-size:.84rem">${st.auto ? `On — re-checks every ${st.everyDays} days, plus the day a festival starts or ends.` : "Uses the API key set in Netlify. Only runs when you tap the button."}</p>
      ${unlocked ? `<button class="btn block" id="refreshNow" ${busy ? "disabled" : ""}>${busy ? "Updating… (takes a few minutes)" : `${icon("refresh")}Research the menu with the API now`}</button>` : `<p class="muted" style="font-size:.8rem">Unlock above to use it.</p>`}` : ""}
    <p class="muted" style="font-size:.78rem;margin-top:14px">Prices can change at the booth — if something's off, fix it from the drink's ••• menu or add it with ＋.</p>
  `, (el) => {
    const unlock = async (code, quiet) => {
      try {
        const out = await api("unlock", { method: "POST", body: {}, headers: { "x-refresh-code": code } });
        admin.code = code; admin.prompt = out.prompt; ls.set(LS.rcode, code);
        $("#toast").hidden = true;
        infoSheet();
      } catch (e) { if (!quiet) toast(e.message); }
    };
    $("#unlock", el)?.addEventListener("click", () => {
      const code = $("#adminCode", el).value.trim();
      if (!code) return toast("Enter the password");
      unlock(code);
    });
    $("#adminCode", el)?.addEventListener("keydown", (e) => { if (e.key === "Enter") $("#unlock", el).click(); });
    if (!unlocked && ls.get(LS.rcode, "")) unlock(ls.get(LS.rcode, ""), true);

    $("#copyPrompt", el)?.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(admin.prompt); }
      catch { const t = $("#promptText", el); t.closest("details").open = true; t.select(); document.execCommand("copy"); }
      toast("Prompt copied — paste it into claude.ai");
    });

    const drop = $("#drop", el);
    const readFile = (file) => {
      if (!file) return;
      if (file.size > 2_000_000) return toast("That file is too big (2 MB max)");
      file.text().then((t) => { $("#importText", el).value = t; admin.text = t; check(); });
    };
    $("#importFile", el)?.addEventListener("change", (e) => readFile(e.target.files[0]));
    drop?.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
    drop?.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop?.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); readFile(e.dataTransfer.files[0]); });

    const send = (dryRun) => api("import", { method: "POST", body: { text: admin.text, dryRun, member: state.me?.name }, headers: { "x-refresh-code": admin.code } });
    const check = async () => {
      admin.text = $("#importText", el).value;
      if (!admin.text.trim()) return toast("Upload a file or paste Claude's reply first");
      const box = $("#importPreview", el);
      box.innerHTML = `<p class="muted">Checking…</p>`;
      try {
        const out = await send(true);
        box.innerHTML = importPreview(out.preview, out.ok);
        box.scrollIntoView({ behavior: "smooth", block: "nearest" });
        $("#applyImport", el)?.addEventListener("click", async (ev) => {
          ev.target.disabled = true;
          try {
            await send(false);
            admin.text = null;
            closeSheet(); mapBuiltFor = null; await load();
            toast("Menu updated for everyone");
          } catch (e) { ev.target.disabled = false; toast(e.message); }
        });
      } catch (e) { box.innerHTML = ""; toast(e.message); }
    };
    $("#checkImport", el)?.addEventListener("click", check);

    $("#refreshNow", el)?.addEventListener("click", async () => {
      try { await api("refresh", { method: "POST", body: { member: state.me?.name }, headers: { "x-refresh-code": admin.code } }); toast("Researching the latest menus… check back in a few minutes"); closeSheet(); setTimeout(() => load({ quiet: true }), 3000); }
      catch (e) { toast(e.message); }
    });
  });
}

function importPreview(p, ok) {
  const f = p.festival, y = p.yearRound;
  const rows = [];
  if (f) rows.push(`<div class="imp-row">${icon("ticket")}<div><b>${f.name ? esc(f.name) : "No festival running"}</b><small>${f.name ? `${fmtDate(f.starts) || "?"} – ${fmtDate(f.ends) || "?"} · ${f.active ? "running now" : "not running today"} · ` : ""}${f.booths} booths · ${f.drinks} drinks${f.nextFestival?.name ? `<br>Next: ${esc(f.nextFestival.name)}${f.nextFestival.starts ? ` · ${fmtDate(f.nextFestival.starts)}` : ""}` : ""}</small></div></div>`);
  if (y) rows.push(`<div class="imp-row">${icon("globe")}<div><b>Year-round pavilion drinks</b><small>${y.booths} spots · ${y.drinks} drinks</small></div></div>`);
  if (p.sources) rows.push(`<div class="imp-row">${icon("info")}<div><b>${p.sources} source link${p.sources > 1 ? "s" : ""}</b><small>shown under Settings → Sources</small></div></div>`);
  return `<div class="card import-card">
    <h3 class="${ok ? "" : "bad"}">${icon(ok ? "check" : "alert")}${ok ? "Ready to update" : "Can't use this upload"}</h3>
    <div class="rows">
      ${rows.join("")}
      ${p.errors.length ? `<ul class="errs">${p.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}
      ${p.warnings.length ? `<ul>${p.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
      ${ok ? `<p class="muted" style="font-size:.8rem;margin:10px 0">This replaces ${f && y ? "the festival and year-round menus" : f ? "the festival menu" : "the year-round list"} for everyone. Family ratings stay in each person's passport.</p>
        <button class="btn accent block" id="applyImport">${icon("upload")}Update the map</button>` : ""}
    </div></div>`;
}

// ── Mutations ─────────────────────────────────────────────────────────────
async function checkin(drinkId, patch) {
  if (!state.me) { joinSheet(); return; }
  const d = drinkById(drinkId);
  let rec = myRec();
  if (!rec) { rec = { name: state.me.name, emoji: state.me.emoji, items: {} }; D().members.push(rec); }
  const cur = { ...(rec.items[drinkId] || {}), ...patch, at: new Date().toISOString() };
  if (cur.rating > 0) cur.tried = true;
  rec.items[drinkId] = cur;
  if (patch.tried && !myItem(drinkId).rating) {} // noop
  render();
  const snapshot = d ? { name: d.name, booth: d.booth, price: d.price, type: d.type, country: d.country, festival: d.yearRound ? "Year-round" : festLabel() } : undefined;
  try {
    const out = await api("checkin", { method: "POST", body: { member: state.me.name, emoji: state.me.emoji, drinkId, snapshot, ...patch } });
    Object.assign(rec, out.member);
    render();
  } catch (e) { toast(e.message); load({ quiet: true }); }
}

function jumpTo(anchor) {
  state.tab = "map"; ls.set(LS.tab, "map");
  render();
  requestAnimationFrame(() => selectSpot(anchor));
}

// ── Events ────────────────────────────────────────────────────────────────
document.addEventListener("click", (ev) => {
  const t = ev.target.closest("button, [data-close]");
  if (!t) return;
  if (t.matches("[data-close]")) return closeSheet();
  if (t.closest("#map")) return; // map taps handled by pan/zoom
  if (t.dataset.tab) { state.tab = t.dataset.tab; ls.set(LS.tab, state.tab); render(); window.scrollTo({ top: 0 }); return; }
  if (t.dataset.tabjump) { state.tab = t.dataset.tabjump; render(); return; }
  if (t.dataset.jump) return jumpTo(t.dataset.jump);
  if (t.dataset.onlyJump) { state.filters.only = t.dataset.onlyJump; render(); return; }
  if (t.hasAttribute("data-nearest")) {
    const best = visibleDrinks().filter(isOpen).sort((a, b) => Math.hypot(geo.pts[a.anchor].x - state.me_pos.x, geo.pts[a.anchor].y - state.me_pos.y) - Math.hypot(geo.pts[b.anchor].x - state.me_pos.x, geo.pts[b.anchor].y - state.me_pos.y))[0];
    if (best) selectSpot(best.anchor); return;
  }
  if (t.hasAttribute("data-closespot")) { state.sel = null; state.drawer = "peek"; render(); return; }
  if (t.hasAttribute("data-join")) return joinSheet();
  if (t.hasAttribute("data-ftoggle")) return setFiltersOpen(!state.filtersOpen);
  if (t.hasAttribute("data-freset")) { Object.assign(state.filters, { group: "all", only: "all", fest: true, yr: true }); render(); return; }
  if (t.dataset.group) { state.filters.group = t.dataset.group; render(); return; }
  if (t.dataset.only) { state.filters.only = state.filters.only === t.dataset.only && t.dataset.only !== "all" ? "all" : t.dataset.only; render(); return; }
  if (t.dataset.layer) { state.filters[t.dataset.layer] = !state.filters[t.dataset.layer]; render(); return; }

  const card = t.closest(".drink[data-id]");
  if (card) {
    const id = card.dataset.id;
    const d = drinkById(id);
    const mine = myItem(id);
    if (t.dataset.rate) { const n = Number(t.dataset.rate); return checkin(id, { rating: mine.rating === n ? 0 : n }); }
    if (t.dataset.act === "tried") return checkin(id, { tried: !mine.tried, ...(mine.tried ? { rating: 0 } : {}) });
    if (t.dataset.act === "want") return checkin(id, { want: !mine.want });
    if (t.dataset.act === "more") return state.me ? moreSheet(d) : joinSheet();
  }
});
document.addEventListener("input", (ev) => {
  if (ev.target.id === "q") {
    state.filters.q = ev.target.value;
    const pos = ev.target.selectionStart;
    render();
    const q = $("#q"); q.focus(); q.setSelectionRange(pos, pos);
  }
});
document.addEventListener("change", (ev) => { if (ev.target.id === "sort") { state.filters.sort = ev.target.value; render(); } });
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !$("#sheet").hidden) closeSheet(); });

$("#drawerGrip").onclick = () => { state.drawer = state.drawer === "full" ? (state.sel ? "half" : "peek") : state.drawer === "half" ? "full" : "half"; render(); };
$("#meBtn").onclick = joinSheet;
$("#festBtn").onclick = () => D() && infoSheet();
$("#settingsBtn").onclick = () => D() && infoSheet();
$("#addBtn").onclick = addSheet;
$("#locBtn").onclick = toggleLocate;
$("#fitBtn").onclick = () => { if (fitVB && view) flyTo(fitVB, 420); };
$("#zoomIn").onclick = () => zoomBy(1.6);
$("#zoomOut").onclick = () => zoomBy(1 / 1.6);
document.querySelectorAll("[data-icon]").forEach((b) => b.insertAdjacentHTML("afterbegin", icon(b.dataset.icon)));
state.filtersOpen = ls.get(LS.fopen, false);

setInterval(() => {
  if (document.visibilityState !== "visible" || !$("#sheet").hidden || document.activeElement?.id === "q") return;
  load({ quiet: true });
}, 30000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") load({ quiet: true }); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

const cached = ls.get(LS.cache);
if (cached) { state.data = cached; render(); }
load().then(() => { if (!state.me && D()) joinSheet(); });
