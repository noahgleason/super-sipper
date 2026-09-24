// Epcot Sips — front end (vanilla JS, no build step)

const TYPE_LABEL = {
  beer: "🍺 Beer", cider: "🍏 Cider", wine: "🍷 Wine", sparkling: "🥂 Bubbly", cocktail: "🍸 Cocktail",
  frozen: "🧊 Frozen", flight: "✈️ Flight", na: "🧃 Non-alcoholic", coffee: "☕ Coffee",
};
const TYPE_GROUPS = [
  ["all", "All drinks", null],
  ["cocktail", "🍸 Cocktails", ["cocktail"]],
  ["frozen", "🧊 Frozen", ["frozen"]],
  ["beer", "🍺 Beer & cider", ["beer", "cider"]],
  ["wine", "🍷 Wine & bubbly", ["wine", "sparkling"]],
  ["na", "🧃 Kid-friendly", ["na"]],
  ["coffee", "☕ Coffee", ["coffee"]],
  ["flight", "✈️ Flights", ["flight"]],
];
const ONLY = [["all", "Anything"], ["open", "Open now"], ["new", "New this week"], ["untried", "Haven't tried"], ["want", "♥ Wishlist"]];
const EMOJIS = ["🥤","🍹","🍺","🍷","🥂","🧋","🦆","🐭","🌎","🎡","🚀","🌺","🦖","👑","🐢","🧚","🐉","🦩"];
const LS = { me: "sips.me", code: "sips.code", cache: "sips.cache2", tab: "sips.tab" };

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
};

// ── API ────────────────────────────────────────────────────────────────────
async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: { "content-type": "application/json", "x-family-code": state.code || "" },
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
      $("#view").innerHTML = `<div class="empty"><div class="e">📡</div><p>Couldn't reach the server.</p><button class="btn primary" onclick="location.reload()">Try again</button></div>`;
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
const countryOf = (id) => D().countries.find((c) => c.id === id) || { id, name: id, flag: "✨" };
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
  let a = "#6d8cff", b = "#f2b33d";
  if (n.includes("food")) { a = "#e8553e"; b = "#f2b33d"; }
  else if (n.includes("holiday")) { a = "#d63a4a"; b = "#3fbf87"; }
  else if (n.includes("art")) { a = "#c83fa2"; b = "#29c4d8"; }
  else if (n.includes("flower")) { a = "#e2508f"; b = "#7ccf4b"; }
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
  $("#meEmoji").textContent = state.me?.emoji || "👋";
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
    if (mapBuiltFor !== sig) { buildMap(); mapBuiltFor = sig; }
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
const GLYPHS = {
  pyramid: "M-11 8h22M-9 8V4h18v4M-7 4V0h14v4M-5 0v-4h10v4M-3 -4v-4h6v4M-1.5 8V5h3v3",
  stave: "M-9 9V2l4-3 5-8 5 8 4 3v7zM-5 -1h10M-2 9v-4h4v4M0 -9v-3",
  temple: "M-10 9h20M-8 9V5h16v4M-11 5l11-4 11 4M-7 1v-3h14v3M-9 -2l9-4 9 4M-5 -6l5-4 5 4M0 -10v-2",
  clock: "M-10 9V0l10-9 10 9v9zM-10 0h20M-3 9v-5h6v5M-6 0v9M6 0v9M0 -4.5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  campanile: "M-3 10V-5h6v15zM-3 -5l3-6 3 6M-3 -1h6M-11 10V3h8M3 3h8v7",
  colonial: "M-11 9V1h22v8zM-5 1v-3a5 5 0 0 1 10 0v3M0 -7v-4M-11 1l11-3.5L11 1M-7 9V4M-3 9V4M3 9V4M7 9V4",
  pagoda: "M-9 9h18M-5 9V6h10v3M-10 6l10-2.5L10 6M-4 3.5V1h8v2.5M-8.5 1L0-1.5 8.5 1M-3 -1.5v-2h6v2M-7 -3.5L0-6l7 2.5M0 -6v-5",
  minaret: "M-2.5 10V-6h5v16zM-3.5 -6h7M-1.5 -6v-3h3v3M0 -9v-2.5M-11 10V2h8.5M2.5 2H11v8M-8 10V6a1.5 1.5 0 0 1 3 0v4",
  eiffel: "M-8 10L-2.5 -2 -1 -12h2L2.5 -2 8 10M-5.5 3.5h11M-2.5 -2h5M-3.5 10a3.5 3.5 0 0 1 7 0",
  tudor: "M-10 9V0l5-6 5 6 5-6 5 6v9zM-10 0h20M-5 -6V9M5 -6V9M-10 4.5h20",
  lodge: "M-10 9V-1h20v10zM-11 -1l3.5-7h15L11 -1M-5 -8v-3.5M5 -8v-3.5M-2.5 9V4.5h5V9M-7 3h2M5 3h2",
  sphere: "M0 0m-11 0a11 11 0 1 0 22 0a11 11 0 1 0-22 0M-11 0h22M-9.5 -5.5h19M-9.5 5.5h19M0 -11L-6 0 0 11 6 0z",
};
const PAV_GLYPH = { mexico: "pyramid", norway: "stave", china: "temple", germany: "clock", italy: "campanile", america: "colonial", japan: "pagoda", morocco: "minaret", france: "eiffel", uk: "tudor", canada: "lodge" };

let geo = null;          // projection + shapes
let vb = null;           // current viewBox {x, y, w, h}
let fitVB = null;

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
  const prom = loop(0.8);
  const lag = loop(0.6);

  const svg = $("#map");
  svg.innerHTML = "";
  const defs = el("defs", {}, svg);
  defs.innerHTML = `
    <radialGradient id="lagoonG" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="var(--lagoon-a)"/><stop offset="1" stop-color="var(--lagoon-b)"/></radialGradient>
    <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="var(--ground-dots)"/></pattern>
    <pattern id="ripples" width="60" height="26" patternUnits="userSpaceOnUse"><path d="M0 13q7.5-6 15 0t15 0 15 0 15 0" fill="none" stroke="var(--ripple)" stroke-width="1.4"/></pattern>
    <clipPath id="lagoonClip"><path d="${smooth(lag, true)}"/></clipPath>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>`;

  const world = el("g", { id: "world" }, svg);
  el("rect", { x: -3000, y: -3000, width: 6000, height: 6000, fill: "url(#dots)" }, world);

  // Walkways
  const walks = [
    ["plaza-mexico-side", "east-walkway", "odyssey", "test-track", "mission-space", "guardians", "creations", "spaceship-earth"],
    ["plaza-canada-side", "culinary-corridor", "imagination", "the-land", "seas", "spaceship-earth"],
    ["showcase-plaza", "communicore", "connections", "spaceship-earth"],
  ];
  const walkG = el("g", {}, world);
  for (const w of walks) {
    const d = smooth(w.map((id) => P[id]), false);
    el("path", { d, fill: "none", stroke: "var(--walk-edge)", "stroke-width": 26, "stroke-linecap": "round", "stroke-linejoin": "round" }, walkG);
    el("path", { d, fill: "none", stroke: "var(--walk)", "stroke-width": 20, "stroke-linecap": "round", "stroke-linejoin": "round" }, walkG);
  }
  // World Celebration plaza
  el("circle", { cx: P.communicore.x, cy: P.communicore.y, r: 38, fill: "var(--walk)", stroke: "var(--walk-edge)", "stroke-width": 3 }, walkG);
  el("ellipse", { cx: (P["plaza-mexico-side"].x + P["plaza-canada-side"].x) / 2, cy: P["showcase-plaza"].y, rx: 120, ry: 26, fill: "var(--walk)", stroke: "var(--walk-edge)", "stroke-width": 3 }, walkG);

  // Promenade + lagoon
  const promD = smooth(prom, true);
  el("path", { d: promD, fill: "none", stroke: "var(--walk-edge)", "stroke-width": 40, "stroke-linejoin": "round" }, world);
  el("path", { d: promD, fill: "none", stroke: "var(--walk)", "stroke-width": 34, "stroke-linejoin": "round" }, world);
  el("path", { d: smooth(lag, true), fill: "url(#lagoonG)" }, world);
  const rip = el("g", { "clip-path": "url(#lagoonClip)" }, world);
  el("rect", { x: C.x - 500, y: C.y - 400, width: 1000, height: 800, fill: "url(#ripples)", class: "lagoon-ripple" }, rip);
  el("path", { d: smooth(lag, true), fill: "none", stroke: "var(--promenade)", "stroke-width": 6, class: "promenade-glow", filter: "url(#glow)" }, world);
  el("path", { d: smooth(lag, true), fill: "none", stroke: "var(--promenade)", "stroke-width": 3.2, class: "lights" }, world);

  // Spaceship Earth
  const se = P["spaceship-earth"];
  el("circle", { cx: se.x, cy: se.y, r: 34, fill: "var(--promenade)", opacity: .18, filter: "url(#glow)" }, world);
  const sg = el("g", { transform: `translate(${se.x} ${se.y}) scale(2.3)` }, world);
  el("circle", { r: 11, fill: "var(--glyph-fill)", stroke: "var(--glyph)", "stroke-width": 1.2 }, sg);
  el("path", { d: GLYPHS.sphere, fill: "none", stroke: "var(--glyph)", "stroke-width": .8 }, sg);

  // Layers that don't scale with zoom
  el("g", { id: "labels" }, world);
  el("g", { id: "markers" }, world);
  el("g", { id: "meLayer" }, world);

  // Bounds → initial fit
  const ids = [...ring, "spaceship-earth", "the-land", "mission-space"];
  const xs = ids.map((i) => P[i].x), ys = ids.map((i) => P[i].y);
  geo.bounds = { x0: Math.min(...xs) - 40, x1: Math.max(...xs) + 40, y0: Math.min(...ys) - 50, y1: Math.max(...ys) + 50 };
  fitMap();
  initPanZoom();
}

function renderAreaLabels() {
  const g = $("#labels");
  if (!g) return;
  g.innerHTML = "";
  const P = geo.pts, C = geo.center;
  const u = vb.w / $("#map").clientWidth;
  const add = (x, y, text, cls = "area-label") => {
    const t = el("text", { x, y, class: cls, transform: `translate(${x} ${y}) scale(${u}) translate(${-x} ${-y})` }, g);
    t.textContent = text;
  };
  add(C.x, C.y - 6, "WORLD");
  add(C.x, C.y + 12, "SHOWCASE");
  add(P.communicore.x, P.communicore.y + 58, "World Celebration", "area-label");
  const small = [["test-track", "Test Track"], ["the-land", "The Land"], ["imagination", "Imagination"], ["seas", "The Seas"], ["guardians", "Cosmic Rewind"], ["mission-space", "Mission: SPACE"], ["spaceship-earth", "Spaceship Earth"]];
  const S = spots();
  for (const [id, name] of small) {
    if (S[id] && id !== "spaceship-earth") continue;
    const p = P[id];
    const t = el("text", { class: "map-label small", transform: `translate(${p.x} ${p.y + (id === "spaceship-earth" ? 34 : 0)}) scale(${u})`, y: id === "spaceship-earth" ? 0 : -14 }, g);
    t.textContent = name;
  }
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

function renderMarkers() {
  const g = $("#markers");
  if (!g || !geo) return;
  g.innerHTML = "";
  renderAreaLabels();
  const u = vb.w / $("#map").clientWidth;
  const S = spots();
  const rec = myRec();
  const ordered = Object.keys(D().anchors).sort((a, b) => (D().anchors[a].kind === "pavilion") - (D().anchors[b].kind === "pavilion"));
  const shown = ordered.filter((id) => S[id] || D().anchors[id].kind === "pavilion");
  geo.disp = spread(shown.map((id) => ({ id, ...geo.pts[id], r: (D().anchors[id].kind === "pavilion" ? 27 : 17) * u })));
  for (const id of shown) {
    const a = D().anchors[id];
    const s = S[id];
    const isPav = a.kind === "pavilion";
    if (!s && !isPav) continue;
    const p = geo.disp[id];
    const vis = s?.vis || [];
    const tried = rec && s?.all.some((d) => rec.items[d.id]?.tried);
    const allSoon = vis.length && vis.every((d) => !isOpen(d) && !d.status?.soldOut);
    const m = el("g", { class: `marker ${!vis.length ? "dim" : ""} ${state.sel === id ? "sel" : ""} ${tried ? "tried" : ""}`, "data-anchor": id, transform: `translate(${p.x} ${p.y}) scale(${u})` }, g);
    if (isPav) {
      el("circle", { r: 26, class: "hit" }, m);
      const gl = el("g", { class: "glyph" }, m);
      el("rect", { x: -17, y: -17, width: 34, height: 34, rx: 10, class: "plate" }, gl);
      el("path", { d: GLYPHS[PAV_GLYPH[id]] || GLYPHS.sphere, transform: "scale(1.05)" }, gl);
      const lab = el("text", { y: 30, class: "map-label" }, m);
      lab.textContent = a.name.replace("The American Adventure", "America");
      if (vis.length) {
        el("circle", { cx: 16, cy: -16, r: 9, class: allSoon ? "soon" : "badge" }, m);
        el("text", { x: 16, y: -16, class: "badge-t" }, m).textContent = vis.length;
      }
    } else {
      const first = (vis[0] || s.all[0]);
      const flag = first.country !== "park" ? countryOf(first.country).flag : typeIcon(s.all);
      el("circle", { r: 20, class: "hit" }, m);
      el("circle", { r: 14, class: "pin-bg" }, m);
      el("text", { class: "flag", y: 1 }, m).textContent = flag;
      if (vis.length) {
        el("circle", { cx: 11, cy: -11, r: 8, class: allSoon ? "soon" : "badge" }, m);
        el("text", { x: 11, y: -11, class: "badge-t" }, m).textContent = vis.length;
      }
      if (u < 0.9 || state.sel === id) {
        const names = [...new Set(s.all.map((d) => d.booth))];
        const lab = el("text", { y: 26, class: "map-label small" }, m);
        lab.textContent = names[0] + (names.length > 1 ? ` +${names.length - 1}` : "");
      }
    }
  }
  renderMe();
}

const TYPE_ICON = { beer: "🍺", cider: "🍏", wine: "🍷", sparkling: "🥂", cocktail: "🍸", frozen: "🧊", flight: "🍺", na: "🧃", coffee: "☕" };
function typeIcon(ds) {
  const n = {};
  for (const d of ds) n[d.type] = (n[d.type] || 0) + 1;
  const top = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  return TYPE_ICON[top?.[0]] || "🍹";
}
// Push overlapping markers apart (in world units) so neighbours like Norway & China stay tappable.
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

function renderMe() {
  const g = $("#meLayer");
  if (!g) return;
  g.innerHTML = "";
  if (!state.me_pos) return;
  const u = vb.w / $("#map").clientWidth;
  const m = el("g", { transform: `translate(${state.me_pos.x} ${state.me_pos.y}) scale(${u})` }, g);
  el("circle", { r: 12, class: "me-pulse" }, m);
  el("circle", { r: 7, class: "me-dot" }, m);
}

function setVB(next) {
  const svg = $("#map");
  const W = svg.clientWidth || 390, H = svg.clientHeight || 700;
  const b = geo.bounds;
  const maxW = (b.x1 - b.x0) * 2.2, minW = 110;
  next.w = Math.max(minW, Math.min(maxW, next.w));
  next.h = next.w * H / W;
  // keep the park on screen
  const cx = Math.max(b.x0, Math.min(b.x1, next.x + next.w / 2));
  const cy = Math.max(b.y0 - 60, Math.min(b.y1 + 60, next.y + next.h / 2));
  next.x = cx - next.w / 2; next.y = cy - next.h / 2;
  vb = next;
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
}
function fitMap() {
  const svg = $("#map");
  const W = svg.clientWidth || 390, H = svg.clientHeight || 700;
  const b = geo.bounds;
  const top = 110, bottom = 130; // header+chips, drawer peek
  const usableH = Math.max(200, H - top - bottom);
  const k = Math.min(W / (b.x1 - b.x0), usableH / (b.y1 - b.y0)); // px per meter
  const w = W / k, h = H / k;
  const cx = (b.x0 + b.x1) / 2;
  const cyPx = top + usableH / 2; // where the park centre should land on screen
  const cy = (b.y0 + b.y1) / 2;
  vb = { x: cx - w / 2, y: cy - cyPx / k, w, h };
  fitVB = { ...vb };
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
}

let rafPending = false;
function scheduleMarkerUpdate() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const u = vb.w / $("#map").clientWidth;
    document.querySelectorAll("#markers .marker").forEach((m) => {
      const p = geo.disp?.[m.dataset.anchor] || geo.pts[m.dataset.anchor];
      m.setAttribute("transform", `translate(${p.x} ${p.y}) scale(${u})`);
    });
    document.querySelectorAll("#labels text").forEach((t) => {
      const tr = t.getAttribute("transform").replace(/scale\([^)]*\)/, `scale(${u})`);
      t.setAttribute("transform", tr);
    });
    renderMe();
  });
}

let pzReady = false;
function initPanZoom() {
  if (pzReady) return;
  pzReady = true;
  const svg = $("#map");
  const pts = new Map();
  let start = null, moved = 0, pinch = null;

  const toWorld = (cx, cy) => {
    const r = svg.getBoundingClientRect();
    return { x: vb.x + (cx - r.left) / r.width * vb.w, y: vb.y + (cy - r.top) / r.height * vb.h };
  };
  const zoomAt = (cx, cy, f) => {
    const w = toWorld(cx, cy);
    const nw = vb.w / f;
    const r = svg.getBoundingClientRect();
    const fx = (cx - r.left) / r.width, fy = (cy - r.top) / r.height;
    const nh = nw * r.height / r.width;
    setVB({ x: w.x - fx * nw, y: w.y - fy * nh, w: nw, h: nh });
    scheduleMarkerUpdate();
  };

  svg.addEventListener("pointerdown", (e) => {
    svg.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { start = { x: e.clientX, y: e.clientY, vb: { ...vb } }; moved = 0; }
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), w: vb.w };
    }
  });
  svg.addEventListener("pointermove", (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1 && start) {
      moved = Math.max(moved, Math.hypot(e.clientX - start.x, e.clientY - start.y));
      const r = svg.getBoundingClientRect();
      const dx = (e.clientX - prev.x) / r.width * vb.w, dy = (e.clientY - prev.y) / r.height * vb.h;
      setVB({ ...vb, x: vb.x - dx, y: vb.y - dy });
      scheduleMarkerUpdate();
    } else if (pts.size === 2 && pinch) {
      moved = 99;
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const targetW = pinch.w * pinch.d / d;
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, vb.w / targetW);
    }
  });
  const end = (e) => {
    const wasTap = pts.size === 1 && moved < 8;
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (!pts.size) {
      if (wasTap) {
        const hit = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.closest?.(".marker"));
        const m = hit?.closest(".marker");
        if (m) selectSpot(m.dataset.anchor);
        else if (state.drawer !== "peek") { state.sel = null; state.drawer = "peek"; render(); }
      }
      renderMarkers();
      start = null;
    }
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  svg.addEventListener("wheel", (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15); clearTimeout(initPanZoom.t); initPanZoom.t = setTimeout(renderMarkers, 150); }, { passive: false });
  let lastTap = 0;
  svg.addEventListener("pointerup", (e) => {
    const now = Date.now();
    if (now - lastTap < 280 && moved < 8) { zoomAt(e.clientX, e.clientY, 1.8); setTimeout(renderMarkers, 50); }
    lastTap = now;
  });
  window.addEventListener("resize", () => { if (state.tab === "map" && geo) { fitMap(); renderMarkers(); } });
}

function selectSpot(id) {
  state.sel = id;
  state.drawer = "half";
  render();
  // nudge map so the spot sits above the drawer
  const p = geo.pts[id];
  const svg = $("#map");
  const H = svg.clientHeight;
  const targetY = H * 0.24;
  const k = svg.clientWidth / vb.w;
  setVB({ ...vb, x: p.x - vb.w / 2, y: p.y - targetY / k });
  scheduleMarkerUpdate();
}

function renderLayers() {
  const f = state.filters;
  const fest = D().festival;
  const festOn = fest?.name ? `<button class="chip-btn toggle ${f.fest ? "on" : ""}" data-layer="fest">${f.fest ? "✓ " : ""}${esc(shortFest(fest.name).replace(/ Festival$/, ""))}</button>` : "";
  $("#layerRow").innerHTML = `
    ${festOn}
    <button class="chip-btn toggle ${f.yr ? "on" : ""}" data-layer="yr">${f.yr ? "✓ " : ""}Year-round</button>
    ${TYPE_GROUPS.map(([k, l]) => `<button class="chip-btn ${f.group === k ? "on" : ""}" data-group="${k}">${l}</button>`).join("")}
    ${ONLY.slice(1).map(([k, l]) => `<button class="chip-btn ${f.only === k ? "on" : ""}" data-only="${k}">${l}</button>`).join("")}`;
}

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
      <div class="spot-head"><span class="big">🧭</span><div><h2>Tap a pavilion</h2><p>${vis.length} drinks shown · ${open} open now${soon ? ` · festival starts ${fmtDate(D().festival.starts)}` : ""}</p></div></div>
      <div class="peek-row">
        ${fresh ? `<button class="peek-card" data-only-jump="new"><b>✨ ${fresh} new</b>this week</button>` : ""}
        ${top ? `<button class="peek-card" data-jump="${esc(top.d.anchor)}"><b>⭐ ${top.r.toFixed(1)} family pick</b>${esc(top.d.name)}</button>` : ""}
        <button class="peek-card" data-tabjump="list"><b>📜 Walk the loop</b>drinks in walking order</button>
        ${state.me_pos ? `<button class="peek-card" data-nearest><b>📍 Closest drink</b>to where you are</button>` : ""}
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
  const icon = a.kind === "pavilion" ? countryOf(Object.entries({ america: "usa" }).find(([k]) => k === state.sel)?.[1] || state.sel).flag : (list[0] && list[0].country !== "park" ? countryOf(list[0].country).flag : typeIcon(S.all));
  const dist = state.me_pos ? Math.hypot(geo.pts[state.sel].x - state.me_pos.x, geo.pts[state.sel].y - state.me_pos.y) : null;
  body.innerHTML = `
    <div class="spot-head"><span class="big">${icon}</span><div><h2>${esc(a.name)}</h2>
      <p>${list.length} drink${list.length === 1 ? "" : "s"}${hidden > 0 ? ` · ${hidden} hidden by filters` : ""}${dist != null ? ` · ~${Math.round(dist / 80)} min walk` : ""}</p></div>
      <button class="x" data-closespot aria-label="Close">✕</button></div>
    ${booths.map((b) => `
      <p class="booth-name">${esc(b.name)}${b.yr ? ' <span class="chip yr">year-round</span>' : ""}</p>
      ${b.where ? `<p class="booth-where">📍 ${esc(b.where)}</p>` : ""}
      ${b.note ? `<div class="note">${esc(b.note)}</div>` : ""}
      <div class="drinks">${b.drinks.map((d) => drinkCard(d)).join("")}</div>`).join("")
    || `<div class="empty"><div class="e">🫗</div><p>${hidden ? "Nothing here matches your filters." : "No drinks listed here right now."}</p></div>`}`;
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
      if (first) { setVB({ ...vb, x: p.x - vb.w / 2, y: p.y - vb.h * 0.35 }); }
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
  if (d.isNew) chips.push(`<span class="chip new">✨ New</span>`);
  if (o && o > t) chips.push(`<span class="chip soon">Opens ${fmtDate(o)}</span>`);
  if (d.closes && d.closes < t) chips.push(`<span class="chip warn">Ended ${fmtDate(d.closes)}</span>`);
  else if (d.closes) chips.push(`<span class="chip">Until ${fmtDate(d.closes)}</span>`);
  if (d.status?.soldOut) chips.push(`<span class="chip warn">Sold out today · ${esc(d.status.by || "family")}</span>`);
  if (d.source === "family") chips.push(`<span class="chip fam">Found by ${esc(d.addedBy || "family")}</span>`);
  if (avg) chips.push(`<span class="chip">⭐ ${avg.toFixed(1)} family</span>`);
  const stars = [1, 2, 3, 4, 5].map((n) => `<button data-rate="${n}" aria-label="Rate ${n}" class="${(mine.rating || 0) >= n ? "lit" : ""}">★</button>`).join("");
  return `<article class="drink ${mine.tried ? "tried" : ""} ${d.status?.soldOut ? "soldout" : ""}" data-id="${esc(d.id)}">
    <div class="drink-top"><h4>${esc(d.name)}</h4><span class="price">${d.price ? esc(d.price) : '<span class="muted">—</span>'}</span></div>
    ${d.desc ? `<p class="desc">${esc(d.desc)}</p>` : ""}
    ${showWhere ? `<p class="where">${countryOf(d.country).flag} ${esc(d.booth)}${d.where ? ` · ${esc(d.where)}` : ""} <button class="btn ghost" style="min-height:0;padding:0 4px;font-size:.76rem" data-jump="${esc(d.anchor)}">🗺️ map</button></p>` : ""}
    <div class="chips">${chips.join("")}</div>
    ${fam.length ? `<div class="fam-row"><span>${fam.map((x) => `<span class="avatar">${esc(x.m.emoji || "🥤")}</span>`).join("")}</span>
      <span>${fam.map((x) => esc(x.m.name) + (x.it.rating ? ` ${x.it.rating}★` : "")).join(", ")}</span></div>` : ""}
    ${mine.note ? `<p class="my-note">“${esc(mine.note)}”</p>` : ""}
    <div class="actions">
      <button class="btn ${mine.tried ? "on-tried" : ""}" data-act="tried">${mine.tried ? "✓ Tried" : "Tried it"}</button>
      <span class="stars">${stars}</span>
      <button class="btn icon push ${mine.want ? "on-want" : ""}" data-act="want" aria-label="Want to try">${mine.want ? "♥" : "♡"}</button>
      <button class="btn icon ghost" data-act="more" aria-label="More">•••</button>
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
      const flag = a.kind === "pavilion" ? countryOf(k === "america" ? "usa" : k).flag : (ds[0].country !== "park" ? countryOf(ds[0].country).flag : "🍹");
      const dist = state.me_pos && geo ? ` · ~${Math.round(Math.hypot(geo.pts[k].x - state.me_pos.x, geo.pts[k].y - state.me_pos.y) / 80)} min walk` : "";
      return `<div class="stop-head"><span class="big">${flag}</span><div><h3>${esc(a.name)}</h3><small>${ds.length} drink${ds.length > 1 ? "s" : ""}${dist}</small></div>
        <button class="btn ghost push" data-jump="${esc(k)}">🗺️</button></div>
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
    <input class="search" id="q" type="search" placeholder="Search drinks, booths, ingredients…" value="${esc(f.q)}" autocomplete="off" />
    <div class="filter-row">${TYPE_GROUPS.map(([k, l]) => `<button class="chip-btn ${f.group === k ? "on" : ""}" data-group="${k}">${l}</button>`).join("")}</div>
    <div class="filter-row">${ONLY.map(([k, l]) => `<button class="chip-btn ${f.only === k ? "on" : ""}" data-only="${k}">${l}</button>`).join("")}
      <button class="chip-btn toggle ${f.fest ? "on" : ""}" data-layer="fest">${f.fest ? "✓ " : ""}Festival</button>
      <button class="chip-btn toggle ${f.yr ? "on" : ""}" data-layer="yr">${f.yr ? "✓ " : ""}Year-round</button></div>
    <div style="display:flex;justify-content:space-between;align-items:center">
      <p class="count-line">${list.length} drink${list.length === 1 ? "" : "s"}</p>
      <select class="sort" id="sort" aria-label="Sort">
        <option value="walk" ${f.sort === "walk" ? "selected" : ""}>Walk the loop</option>
        ${state.me_pos ? `<option value="near" ${f.sort === "near" ? "selected" : ""}>Closest to me</option>` : ""}
        <option value="price" ${f.sort === "price" ? "selected" : ""}>Cheapest first</option>
        <option value="rating" ${f.sort === "rating" ? "selected" : ""}>Family favorites</option>
        <option value="name" ${f.sort === "name" ? "selected" : ""}>A–Z</option>
      </select>
    </div>
    ${list.length ? body : `<div class="empty"><div class="e">🤷</div><p>No drinks match.</p></div>`}`;
}

function renderFamily() {
  const ms = members().map((m) => {
    const items = memberItems(m);
    return { m, tried: items.filter((x) => x.it.tried).length, stamps: stampsFor(m).size, now: items.filter((x) => x.it.tried && x.current).length };
  }).sort((a, b) => b.now - a.now || b.tried - a.tried);
  if (!ms.length) return `<div class="empty"><div class="e">👨‍👩‍👧‍👦</div><p>No one has checked in yet.<br/>Text this site's link to the family — everyone picks their name on their own phone.</p></div>`;

  const rated = D().drinks.map((d) => {
    const rs = familyOn(d.id).map((x) => x.it.rating).filter(Boolean);
    return { d, n: rs.length, avg: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0 };
  }).filter((x) => x.n).sort((a, b) => b.avg - a.avg || b.n - a.n).slice(0, 8);
  const wanted = D().drinks.map((d) => ({ d, n: familyOn(d.id).filter((x) => x.it.want && !x.it.tried).length })).filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 6);
  const feed = [];
  for (const m of members()) for (const x of memberItems(m)) if (x.it.at) feed.push({ m, x });
  feed.sort((a, b) => b.x.it.at.localeCompare(a.x.it.at));

  return `
    <h2 class="section-title">Family leaderboard</h2>
    <p class="section-sub">${esc(festLabel())} · updates live from everyone's phones</p>
    <div class="card">${ms.map((x, i) => `
      <div class="leader"><span class="rank">${i + 1}</span><span class="big">${esc(x.m.emoji || "🥤")}</span>
        <div class="who"><b>${esc(x.m.name)}</b><small>${x.stamps} countr${x.stamps === 1 ? "y" : "ies"} stamped · ${x.tried} all-time</small></div>
        <div class="score">${x.now}<small>this menu</small></div></div>`).join("")}</div>
    ${rated.length ? `<div class="card"><h3>⭐ Family favorites</h3>${rated.map((x) => `
      <div class="leader"><span class="big">${countryOf(x.d.country).flag}</span>
        <div class="who"><b>${esc(x.d.name)}</b><small>${esc(x.d.booth)} · ${x.n} rating${x.n > 1 ? "s" : ""}</small></div>
        <div class="score">${x.avg.toFixed(1)}★</div></div>`).join("")}</div>` : ""}
    ${wanted.length ? `<div class="card"><h3>♥ Most wanted</h3>${wanted.map((x) => `
      <div class="leader"><span class="big">${countryOf(x.d.country).flag}</span>
        <div class="who"><b>${esc(x.d.name)}</b><small>${esc(x.d.booth)}${x.d.price ? ` · ${esc(x.d.price)}` : ""}</small></div>
        <div class="score">${x.n}<small>want it</small></div></div>`).join("")}</div>` : ""}
    <div class="card"><h3>🕒 Recent check-ins</h3>${feed.slice(0, 25).map(({ m, x }) => `
      <div class="feed-item"><span class="big">${esc(m.emoji || "🥤")}</span><div>
        <b>${esc(m.name)}</b> ${x.it.tried ? "tried" : "wants"} <b>${esc(x.name)}</b> ${countryOf(x.country).flag}
        ${x.it.rating ? ` — ${"★".repeat(x.it.rating)}` : ""}
        ${x.it.note ? `<div class="my-note">“${esc(x.it.note)}”</div>` : ""}
        <time>${ago(x.it.at)}${x.current ? "" : ` · ${esc(x.festival)}`}</time></div></div>`).join("") || `<p class="muted">Nothing yet.</p>`}</div>`;
}

function renderPassport() {
  if (!state.me) return `<div class="empty"><div class="e">🎟️</div><p>Pick your name to start your passport.</p><button class="btn primary" data-join>Join the family</button></div>`;
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
      <h2>${esc(state.me.emoji)} ${esc(state.me.name)}</h2>
      <div class="meta">EPCOT World Showcase Passport · ${tried.length} drink${tried.length === 1 ? "" : "s"} · ${got.size} stamp${got.size === 1 ? "" : "s"}${spent ? ` · ~$${spent.toFixed(0)} this menu` : ""}</div>
      <div class="stamps">${cs.map((c) => `<div class="stamp-cell ${got.has(c.id) ? "got" : ""}" title="${esc(c.name)}">${c.flag}<small>${esc(c.name.replace("United ", "U. "))}</small></div>`).join("")}</div>
      <div style="height:10px"></div>
    </div>
    ${want.length ? `<p class="group-label">♥ Want to try (${want.length})</p><div class="drinks">${want.map((x) => drinkCard(x.d, { showWhere: true })).join("")}</div>` : ""}
    ${Object.entries(byFest).map(([fest, xs]) => `
      <p class="group-label">✓ ${esc(fest)} (${xs.length})</p>
      <div class="drinks">${xs.sort((a, b) => (b.it.rating || 0) - (a.it.rating || 0)).map((x) => x.d ? drinkCard(x.d, { showWhere: true }) : `
        <article class="drink tried"><div class="drink-top"><h4>${esc(x.name)}</h4><span class="price">${esc(x.price)}</span></div>
          <p class="where">${countryOf(x.country).flag} ${esc(x.booth)} · no longer on the menu</p>
          <div class="chips">${x.it.rating ? `<span class="chip">${"★".repeat(x.it.rating)}</span>` : ""}</div>
          ${x.it.note ? `<p class="my-note">“${esc(x.it.note)}”</p>` : ""}</article>`).join("")}</div>`).join("")
    || `<div class="empty"><div class="e">🍹</div><p>Nothing yet — pick a pavilion on the map and start sipping!</p></div>`}`;
}

// ══════════════════════════════════════════════════════════════════════════
//  SHEETS
// ══════════════════════════════════════════════════════════════════════════
function openSheet(html, onMount) { $("#sheetBody").innerHTML = html; $("#sheet").hidden = false; onMount?.($("#sheetBody")); }
function closeSheet() { $("#sheet").hidden = true; $("#sheetBody").innerHTML = ""; }
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2600); }

function joinSheet() {
  let emoji = state.me?.emoji || EMOJIS[0];
  const existing = members();
  openSheet(`
    <h2>Who's sipping?</h2>
    <p class="muted">Pick your name so your check-ins show up for the whole family.</p>
    ${existing.length ? `<div class="member-list">${existing.map((m) => `<button class="btn" data-pick="${esc(m.name)}" data-emoji="${esc(m.emoji || "🥤")}">${esc(m.emoji || "🥤")} ${esc(m.name)}</button>`).join("")}</div><p class="muted" style="margin-top:14px">…or add yourself:</p>` : ""}
    <label class="field"><span>Your name</span><input id="joinName" maxlength="24" placeholder="e.g. Mom, Jake, Grandpa" value="${esc(state.me?.name || "")}" /></label>
    <div class="field"><span>Pick an icon</span><div class="emoji-pick">${EMOJIS.map((e) => `<button type="button" data-emo="${e}" class="${e === emoji ? "on" : ""}">${e}</button>`).join("")}</div></div>
    ${D()?.requiresCode ? `<label class="field"><span>Family code</span><input id="joinCode" autocomplete="off" value="${esc(state.code)}" placeholder="Ask whoever set up the site" /></label>` : ""}
    <button class="btn primary block" id="joinGo">Save</button>
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
    <button class="btn primary block" id="codeGo">Unlock</button>`, (el) => {
    $("#codeGo", el).onclick = async () => {
      state.code = $("#codeIn").value.trim(); ls.set(LS.code, state.code);
      try { await api("verify", { method: "POST", body: {} }); closeSheet(); toast("Unlocked 🎉"); } catch {}
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
    <label class="field"><span>Country</span><select id="aCountry">${D().countries.map((c) => `<option value="${c.id}" ${c.id === guessCountry ? "selected" : ""}>${c.flag} ${esc(c.name)}</option>`).join("")}</select></label>
    <label class="field"><span>Type</span><select id="aType">${D().types.map((t) => `<option value="${t}">${TYPE_LABEL[t]}</option>`).join("")}</select></label>
    <label class="field"><span>Price</span><input id="aPrice" maxlength="30" placeholder="$14.00" /></label>
    <label class="field"><span>What's in it?</span><textarea id="aDesc" rows="2" maxlength="240"></textarea></label>
    <label class="field" style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="aYr" style="width:auto" /> <span style="margin:0">It's on the year-round menu (not just this festival)</span></label>
    <button class="btn primary block" id="aGo">Add for everyone</button>`, (el) => {
    $("#aGo", el).onclick = async () => {
      const body = { member: state.me.name, name: $("#aName").value, anchor: $("#aAnchor").value, country: $("#aCountry").value, booth: $("#aBooth").value, type: $("#aType").value, price: $("#aPrice").value, desc: $("#aDesc").value, yearRound: $("#aYr").checked };
      if (!body.name.trim()) return toast("Give it a name");
      try { await api("drinks", { method: "POST", body }); closeSheet(); await load(); toast("Added! 🍹"); } catch (e) { toast(e.message); }
    };
  });
}

function moreSheet(d) {
  const mine = myItem(d.id);
  openSheet(`
    <h2>${esc(d.name)}</h2>
    <p class="muted">${countryOf(d.country).flag} ${esc(d.booth)}${d.price ? ` · ${esc(d.price)}` : ""}</p>
    <label class="field"><span>Your tasting note</span><textarea id="noteIn" rows="3" maxlength="280" placeholder="Too sweet? Worth it? Get the big one?">${esc(mine.note || "")}</textarea></label>
    <button class="btn primary block" id="saveNote">Save note</button>
    <div style="height:10px"></div>
    <button class="btn block" id="soldOut">${d.status?.soldOut ? "✅ It's back — clear sold out" : "🚫 Sold out today"}</button>
    <button class="btn ghost block" id="toMap" style="margin-top:6px">🗺️ Show on map</button>
    ${d.source === "family" ? `<button class="btn ghost block" id="del" style="margin-top:6px;color:#d8433a">Delete this family-added drink</button>` : ""}
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

function infoSheet() {
  const { festival: f, nextFestival: nf, menu, refresh } = D();
  const st = refresh || {};
  const busy = st.state === "running" || st.state === "queued";
  const src = (menu.sources || []).slice(0, 8).map((u) => `<div class="src">• <a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, ""))}</a></div>`).join("");
  openSheet(`
    <h2>About this menu</h2>
    <dl class="kv">
      <dt>Festival</dt><dd>${f?.name ? `${esc(f.name)}<br><span class="muted">${fmtDate(f.starts)} – ${fmtDate(f.ends)}${f.active ? "" : " (not running today)"}</span>` : "None running today"}</dd>
      ${nf?.name ? `<dt>Next up</dt><dd>${esc(nf.name)}${nf.starts ? ` · ${fmtDate(nf.starts)}` : ""}</dd>` : ""}
      <dt>Festival menu</dt><dd>checked ${ago(menu.checkedAt)}${menu.origin === "seed" ? " (starter menu)" : ""}</dd>
      <dt>Year-round</dt><dd>${menu.yearRoundCheckedAt ? `checked ${ago(menu.yearRoundCheckedAt)}` : "not researched yet"}</dd>
      <dt>Auto-refresh</dt><dd>${st.auto ? `On — re-checks every ${st.everyDays} days, plus the day a festival starts or ends` : "Off (add ANTHROPIC_API_KEY in Netlify to turn on)"}</dd>
      <dt>Last run</dt><dd>${st.state === "never" ? "—" : `${esc(st.state)} ${ago(st.finishedAt || st.startedAt)}${st.message ? `<br><span class="muted">${esc(st.message)}</span>` : ""}`}</dd>
    </dl>
    ${src ? `<p class="group-label">Sources</p>${src}` : ""}
    <div style="height:14px"></div>
    ${st.auto ? `<button class="btn primary block" id="refreshNow" ${busy ? "disabled" : ""}>${busy ? "Updating… (takes a few minutes)" : "🔄 Refresh the menu now"}</button>` : ""}
    <p class="muted" style="font-size:.78rem;margin-top:12px">Menus are researched from Disney's announcements and trusted Disney news sites. Prices can change at the booth — if something's off, fix it from the drink's ••• menu or add it with ＋.</p>
  `, (el) => {
    $("#refreshNow", el)?.addEventListener("click", async () => {
      try { await api("refresh", { method: "POST", body: { member: state.me?.name } }); toast("Researching the latest menus… check back in a few minutes"); closeSheet(); setTimeout(() => load({ quiet: true }), 3000); }
      catch (e) { toast(e.message); }
    });
  });
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
$("#addBtn").onclick = addSheet;
$("#locBtn").onclick = toggleLocate;
$("#fitBtn").onclick = () => { if (fitVB) { vb = { ...fitVB }; fitMap(); renderMarkers(); } };

setInterval(() => {
  if (document.visibilityState !== "visible" || !$("#sheet").hidden || document.activeElement?.id === "q") return;
  load({ quiet: true });
}, 30000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") load({ quiet: true }); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

const cached = ls.get(LS.cache);
if (cached) { state.data = cached; render(); }
load().then(() => { if (!state.me && D()) joinSheet(); });
