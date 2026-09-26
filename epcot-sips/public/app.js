// Epcot Sips — front end (vanilla JS, no build step)

import { icon, flag, flagBody, TYPE_ICON, LANDMARKS, LAND_ART, heroArt, parkGlyph, spaceshipEarth, AVATARS, avatar } from "/icons.js";

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
const LS = { me: "sips.me", code: "sips.code", rcode: "sips.refreshCode", cache: "sips.cache2", tab: "sips.tab", fopen: "sips.filtersOpen", park: "sips.park" };

// EPCOT's walking order, used by the List ("walk the loop") and to order spots. The other parks
// bring their own (D().parks[id].walk).
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
  park: ls.get(LS.park, "epcot"),  // which park the map and menu show (EPCOT by default)
  offline: false,
  sel: null,                 // selected map anchor
  drawer: "peek",
  me_pos: null,              // {x, y, lat, lng}
  watching: false,
  filters: { group: "all", only: "all", fest: true, yr: true, q: "", sort: "walk" },
  filtersOpen: false,
  spotQ: "",                 // drawer search inside a spot
  spotBooth: null,           // drawer: show just this bar/stand
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
    state.fresh = true;
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
// Prices like "$6.00 / $9.75" list one amount per size.
const priceList = (p) => [...String(p || "").matchAll(/\$\s?(\d+(?:\.\d{1,2})?)/g)].map((m) => parseFloat(m[1]));
const money = (n) => `$${n.toFixed(2)}`;
const lineCost = (price, counts) => { const ps = priceList(price); return ps.length ? counts.reduce((sum, n, i) => sum + n * ps[Math.min(i, ps.length - 1)], 0) : null; };
// What the family bought this visit. "Tried it" isn't a purchase (people share), so every drink
// anyone tried gets one line; its count is 1 (assumed) until someone sets the real number.
function tabLines() {
  const byId = {};
  for (const m of members()) for (const x of memberItems(m)) if (x.it.tried) {
    (byId[x.id] ||= { id: x.id, name: x.name, booth: x.booth, country: x.country, price: x.price, who: [] }).who.push(m);
  }
  return Object.values(byId).map((l) => {
    const e = D().tab?.[l.id], n = Math.max(1, priceList(l.price).length);
    const counts = e ? Array.from({ length: n }, (_, i) => e.counts[i] || 0) : [1, ...Array(n - 1).fill(0)];
    return { ...l, counts, assumed: !e, qty: counts.reduce((a, b) => a + b, 0), cost: lineCost(l.price, counts) };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
const tabTotals = (lines) => lines.reduce((t, l) => ({ drinks: t.drinks + l.qty, dollars: t.dollars + (l.cost || 0), unpriced: t.unpriced + (l.cost == null ? l.qty : 0), assumed: t.assumed + (l.assumed ? 1 : 0) }), { drinks: 0, dollars: 0, unpriced: 0, assumed: 0 });
const priceNum = (p) => { const m = String(p || "").match(/\$?(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : Infinity; };
const members = () => D()?.members || [];
const myRec = () => members().find((m) => state.me && m.name.toLowerCase() === state.me.name.toLowerCase());
const myItem = (id) => myRec()?.items?.[id] || {};
const countryOf = (id) => D().countries.find((c) => c.id === id) || { id, name: id };
// Parks: every drink and map spot belongs to one ("epcot" when older data doesn't say).
const parkOf = (d) => d?.park || "epcot";
const PARK_FALLBACK = { id: "epcot", name: "EPCOT", short: "EPCOT", walk: null, home: "showcase-plaza", accent: ["#1f5fa8", "#c9982e"] };
const PK = (id = state.park) => D()?.parks?.[id] || PARK_FALLBACK;
const parkList = () => Object.values(D()?.parks || { epcot: PARK_FALLBACK });
const walkOrder = () => (state.park === "epcot" ? WALK : PK().walk || []);
// Lands (EPCOT: its four neighborhoods) each have a ground tint and an accent ink.
let regionIndex = null, regionIndexFor = null;
function regionOf(anchorId) {
  if (regionIndexFor !== D()) {
    regionIndex = {};
    for (const p of parkList()) for (const r of p.regions || []) { regionIndex[r.id] = r; for (const id of r.seeds) regionIndex[id] ||= r; }
    regionIndexFor = D();
  }
  return regionIndex[anchorId] || null;
}
const landStyle = (anchorId) => { const r = regionOf(anchorId); return r ? `style="--land:${r.ink}"` : ""; };
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
      festival: d ? (parkOf(d) !== "epcot" ? PK(parkOf(d)).short : d.yearRound ? "Year-round" : festLabel()) : snap.festival || "Earlier visit",
      park: d ? parkOf(d) : snap.park || "epcot",
      d,
    };
  });
}
const festLabel = () => { const f = D().festival; return f?.name ? `${shortFest(f.name)} ${f.year || ""}`.trim() : "Year-round"; };
const visits = () => D()?.visits || [];
const sameName = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();
// Everything a person tried on earlier (archived) visits.
const pastTriedFor = (name) => visits().flatMap((v) => (v.members.find((m) => sameName(m.name, name))?.tried || []).map((t) => ({ ...t, visit: v })));
const fmtDay = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");
const stampsFor = (rec) => new Set(memberItems(rec).filter((x) => x.it.tried && x.country !== "park").map((x) => x.country));

function passesFilters(d) {
  const f = state.filters;
  if (parkOf(d) !== state.park) return false;
  // The festival / year-round switches only exist in EPCOT.
  if (state.park === "epcot" && !f.fest && (d.source === "festival" || (d.source === "family" && !d.yearRound))) return false;
  if (state.park === "epcot" && !f.yr && (d.source === "yearround" || (d.source === "family" && d.yearRound))) return false;
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
const visibleDrinks = () => D().drinks.filter((d) => !d.hidden && passesFilters(d));

// ── Festival theming & header ─────────────────────────────────────────────
function applyTheme() {
  const n = (D().festival?.active ? D().festival.name : D().nextFestival?.name || "").toLowerCase();
  let [a, b] = PK().accent || PARK_FALLBACK.accent;
  if (state.park !== "epcot") {
    document.documentElement.style.setProperty("--accent", a);
    document.documentElement.style.setProperty("--accent-2", b);
    return;
  }
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
  const { festival: f, nextFestival: nf, today, refresh } = D();
  const menu = state.park === "epcot" ? D().menu : D().menu.parks?.[state.park] || {};
  let name, meta;
  $("#parkBtn").innerHTML = `<svg viewBox="-25 -29 50 41" aria-hidden="true">${parkGlyph(state.park)}</svg>${icon("chevron", "chev")}`;
  if (state.park !== "epcot") {
    const ds = D().drinks.filter((d) => parkOf(d) === state.park && !d.hidden);
    name = PK().short;
    meta = `${ds.length} drinks · ${new Set(ds.map((d) => d.anchor)).size} spots`;
  } else if (f?.active) {
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
  const busy = (refresh?.state === "running" || refresh?.state === "queued") && (refresh.jobs || []).some((j) => (state.park === "epcot" ? !j.startsWith("park:") : j === `park:${state.park}`));
  const stale = !menu?.checkedAt || (Date.now() - Date.parse(menu.checkedAt)) / 864e5 > (state.park === "epcot" ? (refresh?.everyDays || 3) + 1 : 22);
  $("#festName").textContent = name;
  $("#festMeta").innerHTML = `<span>${esc(meta)}</span><span class="fresh ${busy ? "busy" : stale ? "stale" : ""}">${busy ? "updating menu…" : `menu ${ago(menu?.checkedAt)}`}</span>`;
  $("#meAvatar").innerHTML = state.me ? avatar(state.me.emoji) : `<span class="avatar">${icon("user")}</span>`;
  $("#meName").textContent = state.me?.name || "Join";
}

// ── Render root ───────────────────────────────────────────────────────────
function render() {
  if (!D()) return;
  if (!D().parks?.[state.park]) {
    // The saved copy may predate a park; wait for fresh data before giving up on the choice.
    if (!state.fresh) return;
    state.park = "epcot";
  }
  applyTheme();
  document.body.dataset.tab = state.tab;
  document.body.dataset.drawer = state.drawer;
  renderHeader();
  // The map for the current park is always kept built (the list and "closest to me" use it too).
  const sig = [state.park, D().menu.checkedAt, D().menu.yearRoundCheckedAt, D().menu.parks?.[state.park]?.checkedAt].join("|");
  const was = { ...stageSize };
  if (mapBuiltFor !== sig) {
    if (!MAPS[state.park]) {
      loadMap(state.park).then(() => render()).catch(() => toast("Couldn't load the map. Check your connection."));
      if (state.tab === "map") return;
    } else { MAP = MAPS[state.park]; measureStage(); buildMap(); mapBuiltFor = sig; }
  }
  if (state.tab === "map") {
    if (!geo || geo.park !== state.park) return;
    measureStage();
    if (was.W !== stageSize.W || was.H !== stageSize.H) fitMap();
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
  else if (state.tab === "buzz") html = renderBuzz();
  else html = renderPassport();
  view.innerHTML = banner + html;
  if (state.tab === "buzz") wireBuzzChart();
}

// ══════════════════════════════════════════════════════════════════════════
//  MAP
// ══════════════════════════════════════════════════════════════════════════
const NS = "http://www.w3.org/2000/svg";
let geo = null;          // projection + shapes for the park on screen
let vb = null;           // current viewBox {x, y, w, h}
let fitVB = null;
let view = null;          // what is on screen right now (may differ from vb mid-gesture)
let MAP = null;           // footprints of the park on screen (public/maps/<park>.js)
const MAPS = {};

// Each park's footprints load on demand (they're ~150–200 KB apiece).
async function loadMap(park) {
  if (!MAPS[park]) MAPS[park] = (await import(`/maps/${park}.js`)).MAP;
  return MAPS[park];
}

// Meters from the park's origin, north-up turned by the park's rot (the same math as scripts/build-map.mjs).
function project(lat, lng) {
  const O = MAP.origin, r = MAP.rot * Math.PI / 180;
  const E = (lng - O.lng) * Math.cos(O.lat * Math.PI / 180) * 111320, N = (lat - O.lat) * 110540;
  return { x: E * Math.cos(r) + N * Math.sin(r), y: E * Math.sin(r) - N * Math.cos(r) };
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
// ── Day / night ────────────────────────────────────────────────────────────
// Sun altitude (degrees) over the park, from the standard low-precision solar formulas.
// Works from UTC, so the sky follows Orlando's sunset no matter what time zone the phone is in.
function sunAltitude(date = new Date(), lat = MAP?.origin.lat ?? 28.37, lng = MAP?.origin.lng ?? -81.55) {
  const rad = Math.PI / 180, d = (date.getTime() - 946728000000) / 86400000; // days since J2000
  const g = (357.529 + 0.98560028 * d) * rad;
  const L = (280.459 + 0.98564736 * d + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const e = (23.439 - 0.00000036 * d) * rad;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = 18.697374558 + 24.06570982441908 * d;
  const ha = (gmst * 15 + lng) * rad - ra;
  return Math.asin(Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(ha)) / rad;
}
// "?sky=21:30" previews the map at that time today (Orlando time).
function skyTime() {
  const m = /^(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(location.search).get("sky") || "");
  if (!m) return new Date();
  const now = new Date(), ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  const guess = new Date(`${ymd}T${m[1].padStart(2, "0")}:${m[2]}:00Z`);
  const off = new Date(guess.toLocaleString("en-US", { timeZone: "America/New_York" })) - new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() - off);
}
function applySky() {
  const alt = sunAltitude(skyTime());
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => x * x * (3 - 2 * x);
  const night = ease(clamp((4 - alt) / 12));                       // 0 above 4°, 1 below -8°
  const warm = clamp(1 - Math.abs(alt - 1) / 9) * (1 - night * .6);  // golden hour around sunrise/sunset
  const lights = ease(clamp((1 - alt) / 7));                       // lamps on from sunset
  const root = document.documentElement.style;
  root.setProperty("--sky-dark", (night * .66).toFixed(3));
  root.setProperty("--sky-warm", (warm * .38).toFixed(3));
  root.setProperty("--sky-lights", lights.toFixed(3));
  document.body.dataset.sky = night > .6 ? "night" : warm > .3 ? "golden" : "day";
}
setInterval(applySky, 60000);

// Land colors on the ground: each land's spots claim the ground around them (up to R meters),
// split from neighboring lands along the halfway line between spots (a clipped Voronoi diagram).
const TINT_R = { epcot: 160, mk: 110, hs: 100, ak: 140, tl: 90, bb: 80 };
function clipHalf(poly, a, b) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, nx = b.x - a.x, ny = b.y - a.y;
  const side = (p) => (p.x - mx) * nx + (p.y - my) * ny;   // <= 0: closer to a
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], sp = side(p), sq = side(q);
    if (sp <= 0) out.push(p);
    if ((sp < 0) !== (sq < 0) && sp !== sq) { const t = sp / (sp - sq); out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }); }
  }
  return out;
}
function landTintPaths(regions, P, R) {
  const seeds = regions.flatMap((r, ri) => r.seeds.filter((id) => P[id]).map((id) => ({ p: P[id], ri })));
  const d = regions.map(() => "");
  for (const s of seeds) {
    let cell = Array.from({ length: 28 }, (_, k) => ({ x: s.p.x + Math.cos(k / 28 * 2 * Math.PI) * R, y: s.p.y + Math.sin(k / 28 * 2 * Math.PI) * R }));
    for (const o of seeds) if (o.ri !== s.ri && Math.hypot(o.p.x - s.p.x, o.p.y - s.p.y) < 2 * R) cell = clipHalf(cell, s.p, o.p);
    if (cell.length > 2) d[s.ri] += "M" + cell.map((q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join("L") + "Z";
  }
  return d;
}

// Hero landmarks are drawn into the map itself, at world scale on their real footprint.
const HERO_GLOW = { se: ["#e9f0ff", "#9d8cff", "#5a4dff", 70], castle: ["#fff3f8", "#f29ac4", "#7a6cff", 80], tower: ["#e8ffe0", "#9fd28a", "#3f7a55", 60], tree: ["#fff4d6", "#ffc46a", "#ff8a3c", 75], boat: ["#fff4d6", "#ffb36a", "#ff6a3c", 55], ski: ["#f2fbff", "#9ad8f2", "#3f8fc4", 60] };

function buildMap() {
  const A = D().anchors, M = MAP.layers;
  const epcot = state.park === "epcot";
  geo = { park: state.park, pts: {} };
  for (const [id, a] of Object.entries(A)) if ((a.park || "epcot") === state.park) geo.pts[id] = project(a.lat, a.lng);
  const P = geo.pts;
  const xy = ([x, y]) => ({ x, y });
  const water = MAP.labels.find((l) => l.cls === "water");
  geo.center = xy(MAP.center);
  geo.entrance = xy(MAP.entrance);
  geo.gate = MAP.spots?.gateway ? xy(MAP.spots.gateway) : null;
  const G = water ? water.at : MAP.center;

  const svg = $("#map");
  svg.innerHTML = "";
  const defs = el("defs", {}, svg);
  defs.innerHTML = `
    <radialGradient id="lagoonG" cx="${G[0]}" cy="${G[1]}" r="380" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--water-deep)"/><stop offset=".7" stop-color="var(--water)"/><stop offset="1" stop-color="var(--water-shallow)"/></radialGradient>
    <pattern id="forestP" width="46" height="40" patternUnits="userSpaceOnUse">
      <rect width="46" height="40" fill="var(--forest)"/>
      <g fill="var(--forest-2)"><circle cx="8" cy="9" r="9"/><circle cx="30" cy="6" r="8"/><circle cx="20" cy="26" r="10"/><circle cx="42" cy="28" r="8"/><circle cx="2" cy="34" r="7"/></g>
      <g fill="#5d8a50"><circle cx="6" cy="7" r="5"/><circle cx="28" cy="4" r="4.5"/><circle cx="18" cy="23" r="6"/><circle cx="40" cy="25" r="4.5"/></g>
    </pattern>
    <pattern id="treesP" width="22" height="20" patternUnits="userSpaceOnUse">
      <rect width="22" height="20" fill="var(--tree-lo)"/>
      <g fill="var(--tree)"><circle cx="5" cy="5" r="5"/><circle cx="16" cy="4" r="4.4"/><circle cx="10" cy="14" r="5.4"/><circle cx="21" cy="15" r="4"/><circle cx="0" cy="17" r="3.6"/></g>
      <g fill="var(--tree-hi)" opacity=".8"><circle cx="3.6" cy="3.6" r="2.2"/><circle cx="14.8" cy="2.8" r="1.9"/><circle cx="8.4" cy="12.4" r="2.4"/><circle cx="19.8" cy="13.8" r="1.7"/></g>
    </pattern>
    <pattern id="meadowP" width="14" height="12" patternUnits="userSpaceOnUse"><rect width="14" height="12" fill="var(--meadow)"/><path d="M2 4l1-2M9 9l1-2M11 3l1-2M5 10l1-2" stroke="var(--meadow-2)" stroke-width="1"/><circle cx="7" cy="5" r="1.6" fill="var(--tree)" opacity=".55"/></pattern>
    <pattern id="flowerP" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="var(--grass-2)"/><circle cx="1.3" cy="1.3" r=".9" fill="#e36a92"/><circle cx="3.8" cy="3.6" r=".8" fill="#f4cf55"/></pattern>
    <radialGradient id="seG" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fbfdff"/><stop offset=".45" stop-color="#c6ccd3"/><stop offset="1" stop-color="#6f7780"/></radialGradient>
    <radialGradient id="seShine" cx="30%" cy="25%" r="35%"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <clipPath id="seClip"><circle r="16"/></clipPath>`;

  // Everything below is drawn from the park's real footprints (scripts/build-map.mjs), in meters.
  const world = el("g", { id: "world", "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
  const C = geo.center;
  const fill = (d, attrs) => d && el("path", { d, ...attrs }, world);
  const line = (d, w, color, extra = {}) => d && el("path", { d, fill: "none", stroke: color, "stroke-width": w, ...extra }, world);
  const cover = { x: C.x - 2000, y: C.y - 2000, width: 4000, height: 4000 };
  el("rect", { ...cover, fill: "url(#forestP)" }, world);
  // Inside the park, anything that isn't garden, water or a building is walkable pavement.
  fill(M.park, { fill: "#2f5528", opacity: .45, transform: "translate(3 4)" });
  fill(M.park, { fill: "var(--pave)", stroke: "#3d6634", "stroke-width": 3 });
  fill(M.parking, { fill: "#d9d4c8" });
  line(M.road, 10, "#cfc8b6");
  line(M.service, 5, "#ddd4bf");
  fill(M.meadow, { fill: "url(#meadowP)" });
  fill(M.garden, { fill: "var(--grass)", stroke: "var(--grass-edge)", "stroke-width": .5 });
  fill(M.flowers, { fill: "url(#flowerP)" });
  fill(M.forest, { fill: "url(#treesP)", stroke: "var(--tree-lo)", "stroke-width": .6 });
  fill(M.sand, { fill: "var(--shore)" });
  fill(M.rock, { fill: "var(--rock)", stroke: "var(--rock-edge)", "stroke-width": .8 });
  line(M.track, 4, "var(--dirt)");
  // Water, with a sandy shore and the main lake deepening toward the middle.
  fill(M.water, { fill: "none", stroke: "var(--shore)", "stroke-width": 3 });
  fill(M.water, { fill: "url(#lagoonG)", "fill-rule": "evenodd" });
  line(M.canal, 3, "var(--water)");
  // Water slides: a dark rim and a bright tube
  line(M.slide, 3.2, "#1f5f86"); line(M.slide, 1.8, "#6fd0ee");
  // Walkways over the gardens: a thin edge, then the pavement.
  line(M.walkW, 10, "var(--pave-edge)"); line(M.walk, 4.6, "var(--pave-edge)"); line(M.path, 3, "var(--pave-edge)");
  line(M.walkW, 8.6, "var(--pave)"); line(M.walk, 3.4, "var(--pave)"); line(M.path, 2, "var(--pave)");
  fill(M.plaza, { fill: "var(--pave)" });
  line(M.pier, 2.5, "#b48a5a");
  fill(M.bridge, { fill: "var(--pave)", stroke: "var(--pave-edge)", "stroke-width": .8 });
  // Each land's ground color: soft-edged washes over paths and gardens (not water), under the buildings.
  const regions = PK().regions || [];
  if (regions.length) {
    const mask = el("mask", { id: "landMask", maskUnits: "userSpaceOnUse", ...cover }, defs);
    el("path", { d: M.park, fill: "#fff" }, mask);
    if (M.water) el("path", { d: M.water, fill: "#000", "fill-rule": "evenodd" }, mask);
    defs.insertAdjacentHTML("beforeend", `<filter id="tintBlur" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="5"/></filter>`);
    const tint = el("g", { class: "land-tint", mask: "url(#landMask)" }, world);
    const soft = el("g", { filter: "url(#tintBlur)" }, tint);
    landTintPaths(regions, P, TINT_R[state.park] || 110).forEach((d, i) => d && el("path", { d, fill: regions[i].tint, stroke: regions[i].tint, "stroke-width": 2 }, soft));
  }
  // Buildings with a soft drop shadow; rides/shows get a warmer roof.
  const bshadow = [M.bld, M.attr, M.glass].filter(Boolean).join("");
  fill(bshadow, { fill: "#1d2a17", opacity: .22, transform: "translate(1.6 2.2)" });
  fill(M.bld, { fill: "var(--bld)", stroke: "var(--bld-edge)", "stroke-width": .6 });
  fill(M.attr, { fill: "var(--bld-attr)", stroke: "var(--bld-attr-edge)", "stroke-width": .7 });
  fill(M.glass, { fill: "#cfe6ea", stroke: "#7fa9b3", "stroke-width": .6 });
  fill(M.roof, { fill: "var(--bld)", opacity: .75, stroke: "var(--bld-edge)", "stroke-width": .5, "stroke-dasharray": "1.5 1.2" });
  // Railroad (sleepers, then rails) and the monorail beam
  line(M.rail, 3.2, "#7a5a3c", { "stroke-dasharray": ".8 1.6", "stroke-linecap": "butt" }); line(M.rail, 1.1, "#5b5f63");
  line(M.monorail, 4, "#7f8890"); line(M.monorail, 2, "#c9ced3");
  // The park's big landmark (Spaceship Earth, Cinderella Castle, Tower of Terror, Tree of Life)
  const H = MAP.hero;
  const hg = el("g", { transform: `translate(${H.at[0].toFixed(1)} ${H.at[1].toFixed(1)}) scale(${H.kind === "se" ? 1.6 : 1.9})` }, world);
  hg.innerHTML = H.kind === "se" ? spaceshipEarth() : heroArt(H.kind);

  // Day/night: the whole map is tinted by the real sun (see applySky), and after dark the
  // pavilions and lands, the park's landmark and the walkway lamps light up.
  el("rect", { ...cover, class: "sky-warm" }, world);
  el("rect", { ...cover, class: "sky-dark" }, world);
  const lights = el("g", { class: "sky-lights" }, world);
  const hc = HERO_GLOW[H.kind] || HERO_GLOW.se;
  lights.innerHTML = `<defs>
      <radialGradient id="glowWarm"><stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset=".45" stop-color="#ffb347" stop-opacity=".28"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>
      <radialGradient id="glowHero"><stop offset="0" stop-color="${hc[0]}" stop-opacity=".9"/><stop offset=".35" stop-color="${hc[1]}" stop-opacity=".45"/><stop offset="1" stop-color="${hc[2]}" stop-opacity="0"/></radialGradient>
    </defs>`;
  const glowD = (d, w, color, op) => d && el("path", { d, fill: "none", stroke: color, "stroke-width": w, "stroke-dasharray": "0 22", opacity: op }, lights);
  el("path", { d: M.attr, fill: "#ffcf7a", opacity: .3 }, lights);
  el("path", { d: M.bld, fill: "#ffcf7a", opacity: .08 }, lights);
  glowD(M.walkW, 9, "#ffc86a", .22); glowD(M.walk, 8, "#ffc86a", .22);
  glowD(M.walkW, 2, "#fff1c4", 1); glowD(M.walk, 1.8, "#fff1c4", 1);
  const glowR = { pavilion: 48, land: 44, landmark: 34, venue: 22 };
  for (const [id, p] of Object.entries(P)) {
    const r = glowR[A[id].kind];
    if (!r || id === "spaceship-earth") continue;
    el("circle", { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r, fill: "url(#glowWarm)" }, lights);
  }
  el("circle", { cx: H.at[0].toFixed(1), cy: H.at[1].toFixed(1), r: hc[3], fill: "url(#glowHero)" }, lights);
  applySky();

  // Compass: the needle points to real north for this park's rotation.
  $("#compassRose")?.setAttribute("transform", `rotate(${MAP.rot - 180})`);
  $(".compass")?.setAttribute("aria-label", `North is ${{ 0: "at the top", 90: "to the right", 180: "at the bottom", 270: "to the left" }[MAP.rot] || "shown by the needle"}`);

  // Bounds → initial fit: the drink spots, the landmark and the gates.
  const ids = epcot ? [...D().ring, "spaceship-earth", "the-land", "mission-space"] : Object.keys(P);
  const xs = [...ids.map((i) => P[i].x), ...(epcot ? [] : [H.at[0], geo.entrance.x])];
  const ys = [...ids.map((i) => P[i].y), ...(epcot ? [] : [H.at[1], geo.entrance.y])];
  geo.bounds = { x0: Math.min(...xs) - 40, x1: Math.max(...xs) + 40, y0: Math.min(...ys) - 60, y1: Math.max(...ys) + 50 };
  fitMap();
  initPanZoom();
}

// Map name labels, as an HTML overlay (they stay crisp and never scale).
function areaLabelsHTML(S) {
  const P = geo.pts;
  let html = "";
  const add = (p, text, cls) => { html += `<div class="mlabel ${cls}" data-wx="${p.x.toFixed(1)}" data-wy="${p.y.toFixed(1)}"><span>${esc(text)}</span></div>`; };
  for (const l of MAP.labels) l.text.forEach((t, i) => add({ x: l.at[0], y: l.at[1] + (l.text.length > 1 ? (i ? 10 : -8) : 0) }, t, `${l.cls}${i ? " sm" : ""}`));
  add(geo.entrance, "Main Entrance", "gate");
  if (state.park !== "epcot") return html;
  add({ x: P.communicore.x, y: P.communicore.y + 62 }, "World Celebration", "land");
  const mid = (a, b) => ({ x: (P[a].x + P[b].x) / 2, y: (P[a].y + P[b].y) / 2 });
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  add(lerp(P.communicore, mid("test-track", "mission-space"), 0.55), "World Discovery", "land");
  add(lerp(P.communicore, mid("the-land", "imagination"), 0.55), "World Nature", "land");
  if (geo.gate) add({ x: geo.gate.x, y: geo.gate.y + 12 }, "Int'l Gateway", "gate");
  const small = [["test-track", "Test Track"], ["the-land", "The Land"], ["imagination", "Imagination!"], ["seas", "The Seas"], ["guardians", "Cosmic Rewind"], ["mission-space", "Mission: SPACE"], ["spaceship-earth", "Spaceship Earth"]];
  for (const [id, name] of small) {
    if (S[id] && id !== "spaceship-earth") continue;
    add({ x: P[id].x, y: P[id].y + (id === "spaceship-earth" ? 40 : 0) }, name, "fw");
  }
  return html;
}

// Group this park's drinks by map spot → markers. Outside EPCOT a land also collects every drink poured in it.
function spots() {
  const by = {};
  const keys = (d) => {
    const a = d.anchor && anchorOf(d.anchor) ? d.anchor : PK().home;
    const land = anchorOf(a)?.land;
    return land ? [a, land] : [a];
  };
  for (const d of D().drinks) {
    if (d.hidden || parkOf(d) !== state.park) continue;
    for (const k of keys(d)) (by[k] ||= { id: k, all: [], vis: [] }).all.push(d);
  }
  for (const d of visibleDrinks()) for (const k of keys(d)) by[k].vis.push(d);
  return by;
}

// Markers grow a little as you zoom in, so the map feels like a map and not a sticker sheet.
const zoomK = () => (fitVB && view ? fitVB.w / view.w : 1);
const growPav = () => Math.max(0.9, Math.min(2.1, Math.pow(zoomK(), 0.55)));
const growPin = () => Math.max(0.9, Math.min(1.5, Math.pow(zoomK(), 0.35)));
// Outside EPCOT, individual bars and stands appear once you zoom in (or open their land).
const VENUE_ZOOM = 1.7;
const isBig = (a) => a?.kind === "pavilion" || a?.kind === "land";
function venueShown(id, S) {
  const a = anchorOf(id);
  if (a.kind !== "venue") return !!S[id];
  // small parks (the water parks) show every stand right away
  const few = Object.values(D().anchors).filter((x) => x.park === state.park && x.kind === "venue").length <= 10;
  return !!S[id] && (few || zoomK() >= VENUE_ZOOM || state.sel === id || state.sel === a.land);
}

function renderMarkers() {
  const ov = $("#overlay");
  if (!ov || !geo || !view) return;
  updateScale();
  const pxPerM = stageSize.W / view.w;
  const S = spots();
  const rec = myRec();
  const ordered = Object.keys(geo.pts).sort((a, b) => isBig(anchorOf(a)) - isBig(anchorOf(b)));
  const shown = ordered.filter((id) => isBig(anchorOf(id)) || venueShown(id, S));
  const gp = growPav(), gn = growPin();
  // Spread overlapping markers apart in screen space; the offsets ride along with zoom.
  const base = shown.map((id) => { const p = geo.pts[id], pav = isBig(D().anchors[id]); return { id, x: (p.x - view.x) * pxPerM, y: (p.y - view.y) * pxPerM, r: pav ? 25 * gp : 14 * gn, g: pav ? gp : gn }; });
  const disp = spread(base);
  const off = Object.fromEntries(base.map((b) => [b.id, { dx: (disp[b.id].x - b.x) / b.g, dy: (disp[b.id].y - b.y) / b.g }]));
  let html = areaLabelsHTML(S);
  for (const id of shown) {
    const a = D().anchors[id];
    const s = S[id];
    const isPav = isBig(a);
    if (!s && !isPav) continue;
    const p = geo.pts[id], o = off[id];
    const vis = s?.vis || [];
    const tried = rec && s?.all.some((d) => rec.items[d.id]?.tried);
    const allSoon = vis.length && vis.every((d) => !isOpen(d) && !d.status?.soldOut);
    const cls = `marker ${!vis.length ? "dim" : ""} ${state.sel === id ? "sel" : ""} ${tried ? "tried" : ""}`;
    const pos = `data-wx="${p.x.toFixed(1)}" data-wy="${p.y.toFixed(1)}" data-dx="${o.dx.toFixed(1)}" data-dy="${o.dy.toFixed(1)}"`;
    if (isPav) {
      const name = a.short || a.name.replace("The American Adventure", "America").replace("United Kingdom", "U.K.");
      const w = name.length * 5.6 + 14;
      const ink = a.kind === "land" ? regionOf(id)?.ink : null;
      html += `<div class="${cls}" data-anchor="${id}" data-kind="pav" ${pos} data-ox="40" data-oy="36" style="transform-origin:40px 36px${ink ? `;--land:${ink}` : ""}">
        <svg width="80" height="66" viewBox="-40 -36 80 66">
        <circle r="30" cy="-4" class="hit"/>
        <circle r="25" cy="-6" class="sel-ring"/>
        <g class="art">${LANDMARKS[id] || LAND_ART[id] || ""}</g>
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
      const ink = a.kind === "venue" ? regionOf(a.land)?.ink : null;
      html += `<div class="${cls}" data-anchor="${id}" data-kind="pin" ${pos} data-ox="40" data-oy="44" style="transform-origin:40px 44px${ink ? `;--land:${ink}` : ""}">
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
  // Booth names under pins: the spot with the most drinks keeps its name when two would collide.
  const placed = [...document.querySelectorAll("#overlay .plate-bg")].map((p) => p.getBoundingClientRect());
  const names = [...document.querySelectorAll("#overlay .booth-t")]
    .map((t) => ({ t, n: +(t.closest(".marker").querySelector(".tag-t")?.textContent || 0), sel: t.closest(".marker").classList.contains("sel") }))
    .sort((a, b) => b.sel - a.sel || b.n - a.n);
  for (const { t } of names) {
    const r = t.getBoundingClientRect();
    const clash = placed.some((b) => hit(r, b));
    t.style.visibility = clash ? "hidden" : "";
    if (!clash) placed.push(r);
  }
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
  if (state.sel !== id) { state.spotQ = ""; state.spotBooth = null; }
  state.sel = id;
  state.drawer = "half";
  render();
  // glide the spot into view above the drawer, zooming in a little if we're zoomed out
  // (a bar or stand zooms in far enough for its neighbors' pins to show too)
  const p = geo.pts[id], { W, H } = stageSize;
  const w = Math.min(view.w, fitVB.w / (anchorOf(id)?.kind === "venue" ? VENUE_ZOOM * 1.15 : 1.5)), h = w * H / W;
  flyTo({ x: p.x - w / 2, y: p.y - 0.26 * h, w }, 420);
}

// ── Filters (collapsible; shared by the map and the menu list) ────────────
const activeFilterCount = () => { const f = state.filters; return (f.group !== "all") + (f.only !== "all") + (state.park === "epcot" ? !f.fest + !f.yr : 0); };
function filterSummary() {
  const f = state.filters, fest = D().festival;
  const menus = state.park !== "epcot" ? PK().short
    : [f.fest && fest?.name ? shortFest(fest.name).replace(/ Festival$/, "") : null, f.yr ? "Year-round" : null].filter(Boolean).join(" + ") || "No menus";
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
      ${state.park === "epcot" ? `<div class="fp-sec"><h5>Menus ${n ? `<button data-freset>Reset all</button>` : ""}</h5><div class="switches">
        ${fest?.name ? `<button class="switch ${f.fest ? "on" : ""}" data-layer="fest"><span>${esc(shortFest(fest.name))}<small>${fest.active ? `Festival booths · through ${fmtDate(fest.ends)}` : `Festival booths · starts ${fmtDate(fest.starts)}`}</small></span><span class="track"></span></button>` : ""}
        <button class="switch ${f.yr ? "on" : ""}" data-layer="yr"><span>Year-round drinks<small>Pavilion bars, carts &amp; restaurants</small></span><span class="track"></span></button>
      </div></div>` : n ? `<div class="fp-sec"><h5>Filters <button data-freset>Reset all</button></h5></div>` : ""}
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
  const art = a?.kind === "pavilion" ? LANDMARKS[id] : a?.kind === "land" ? LAND_ART[id] : null;
  if (art) return `<span class="spot-art"><svg viewBox="-25 -29 50 41" aria-hidden="true">${art}</svg></span>`;
  const first = ds?.[0];
  if (first && first.country !== "park") return `<span class="spot-art">${flag(first.country)}</span>`;
  return `<span class="spot-art">${icon(ds?.length ? typeIcon(ds) : "pin")}</span>`;
}
const walkMins = (id) => (state.me_pos && geo?.pts[id] ? Math.max(1, Math.round(Math.hypot(geo.pts[id].x - state.me_pos.x, geo.pts[id].y - state.me_pos.y) / 80)) : null);

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
        <button class="peek-card" data-tabjump="list">${icon("walk")}<span><b>${state.park === "epcot" ? "Walk the loop" : "Walk the park"}</b>drinks in walking order</span></button>
        <button class="peek-card" data-parks>${icon("map")}<span><b>Other parks</b>${esc(parkList().filter((p) => p.id !== state.park).map((p) => p.short).join(" · "))}</span></button>
      </div>`;
    return;
  }
  const a = anchorOf(state.sel);
  const S = spots()[state.sel] || { all: [], vis: [] };
  const list = S.vis.length ? S.vis : [];
  const hidden = S.all.length - S.vis.length;
  const booths = spotBooths(list);
  const mins = walkMins(state.sel);
  // Busy spots (a whole land, a big restaurant) get a search box and a chip per bar/stand.
  const tools = list.length > 8;
  body.innerHTML = `
    <div class="spot-head" ${landStyle(state.sel)}>${spotArt(state.sel, list.length ? list : S.all)}<div><h2>${esc(a.name)}</h2>
      <p>${list.length} drink${list.length === 1 ? "" : "s"}${booths.length > 1 ? ` at ${booths.length} spots` : ""}${hidden > 0 ? ` · ${hidden} hidden by filters` : ""}${mins ? ` · ${icon("walk")} ~${mins} min` : ""}</p></div>
      <button class="x" data-closespot aria-label="Close">${icon("close")}</button></div>
    ${tools ? `<div class="spot-tools" ${landStyle(state.sel)}>
      <div class="search-wrap sm">${icon("search")}<input class="search" id="spotQ" type="search" placeholder="Find a drink here…" value="${esc(state.spotQ)}" autocomplete="off" /></div>
      ${booths.length > 1 ? `<div class="booth-chips">${booths.map((b) => `<button class="bchip ${state.spotBooth === b.name ? "on" : ""}" data-sbooth="${esc(b.name)}">${esc(b.name)}<small>${b.drinks.length}</small></button>`).join("")}</div>` : ""}
    </div>` : ""}
    <div id="spotList">${spotListHTML(booths, hidden)}</div>
    <button class="btn block log-here" data-log-here>${icon("plus")}Had something not listed here?</button>`;
}
function spotBooths(list) {
  const booths = [];
  for (const d of list) {
    let b = booths.find((x) => x.name === d.booth);
    if (!b) booths.push((b = { name: d.booth, where: d.where, note: d.note, yr: d.yearRound && parkOf(d) === "epcot", anchor: d.anchor, closes: d.closes, drinks: [] }));
    b.drinks.push(d);
  }
  return booths;
}
// The drink list inside the drawer, narrowed by the drawer's search box and bar/stand chip.
function spotListHTML(booths, hidden) {
  const q = state.spotQ.trim().toLowerCase();
  const match = (d) => !q || `${d.name} ${d.desc} ${d.booth} ${TYPE_LABEL[d.type] || d.type}`.toLowerCase().includes(q);
  const shown = booths.filter((b) => !state.spotBooth || b.name === state.spotBooth)
    .map((b) => ({ ...b, drinks: b.drinks.filter(match) })).filter((b) => b.drinks.length);
  if (!shown.length) {
    const msg = q || state.spotBooth ? `Nothing here matches${q ? ` "${esc(state.spotQ.trim())}"` : ""}.` : hidden ? "Nothing here matches your filters." : "No drinks listed here right now.";
    return `<div class="empty"><div class="e">${icon(q ? "search" : "glass")}</div><p>${msg}</p></div>`;
  }
  return shown.map((b) => `
      <p class="booth-name">${esc(b.name)}${b.yr ? ' <span class="chip">Year-round</span>' : ""}${b.anchor !== state.sel && anchorOf(b.anchor)?.kind === "venue" ? `<button class="linkbtn" data-jump="${esc(b.anchor)}">${icon("map")}Map</button>` : ""}</p>
      ${b.where && b.where !== anchorOf(state.sel)?.name ? `<p class="booth-where">${icon("pin")}${esc(b.where)}</p>` : ""}
      ${b.note ? `<div class="note">${esc(b.note)}</div>` : ""}
      <div class="drinks">${b.drinks.map((d) => drinkCard(d)).join("")}</div>`).join("");
}
function refreshSpotList() {
  const S = spots()[state.sel] || { all: [], vis: [] };
  const el = $("#spotList");
  if (el) el.innerHTML = spotListHTML(spotBooths(S.vis), S.all.length - S.vis.length);
}

// ── Geolocation ───────────────────────────────────────────────────────────
const latLngDist = (a, b) => Math.hypot((a.lat - b.lat) * 110540, (a.lng - b.lng) * 111320 * Math.cos(a.lat * Math.PI / 180));
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
    if (!geo || !MAP) return;
    const p = project(lat, lng);
    const far = Math.hypot(p.x - geo.center.x, p.y - geo.center.y);
    // Standing in a different park? Switch the map to it.
    const other = far > 900 && parkList().find((k) => k.id !== state.park && k.center && latLngDist(k.center, { lat, lng }) < 1100);
    if (other) {
      setPark(other.id);
      toast(`You're at ${other.short} — showing its map`);
      return;
    }
    if (far > 1500) {
      if (first) toast(`You're about ${(far / 1609).toFixed(far > 16000 ? 0 : 1)} mi from ${PK().short} — the dot will appear once you're in the park`);
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
  if (mine.tried && Number.isFinite(mine.buzz)) chips.push(`<button class="chip buzz-chip" data-act="rate" aria-label="Change stars and buzz">${icon("bolt")}Buzz ${mine.buzz}/10</button>`);
  else if (mine.tried) chips.push(`<button class="chip buzz-chip todo" data-act="rate">${icon("bolt")}Rate buzz</button>`);
  const stars = [1, 2, 3, 4, 5].map((n) => `<button data-rate="${n}" aria-label="Rate ${n}" class="${(mine.rating || 0) >= n ? "lit" : ""}">${icon("star")}</button>`).join("");
  return `<article class="drink ${mine.tried ? "tried" : ""} ${d.status?.soldOut ? "soldout" : ""}" data-id="${esc(d.id)}">
    <div class="drink-top">
      <span class="drink-type" title="${esc(TYPE_LABEL[d.type] || d.type)}">${icon(TYPE_ICON[d.type] || "glass")}</span>
      <div class="drink-title"><h4>${esc(d.name)}</h4>${d.desc ? `<p class="desc">${esc(d.desc)}</p>` : ""}</div>
      <span class="price">${d.price ? esc(d.price) : '<span class="muted">—</span>'}</span>
    </div>
    ${showWhere ? `<p class="where">${flag(d.country)}${parkOf(d) !== state.park ? `<b>${esc(PK(parkOf(d)).short)}</b> · ` : ""}${esc(d.booth)}${d.where ? ` · ${esc(d.where)}` : ""}<button class="linkbtn" data-jump="${esc(d.anchor)}">${icon("map")}Map</button></p>` : ""}
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
  const walk = walkOrder();
  const order = (a) => { const i = walk.indexOf(a); return i < 0 ? 999 : i; };
  let body = "";
  if (f.sort === "walk" || f.sort === "near") {
    const groups = {};
    for (const d of list) (groups[d.anchor] ||= []).push(d);
    let keys = Object.keys(groups).sort((a, b) => order(a) - order(b));
    if (f.sort === "near" && state.me_pos && geo?.park === state.park) {
      const dist = (id) => (geo.pts[id] ? Math.hypot(geo.pts[id].x - state.me_pos.x, geo.pts[id].y - state.me_pos.y) : 1e9);
      keys = keys.sort((a, b) => dist(a) - dist(b));
    }
    body = `<div class="stop">${keys.map((k) => {
      const a = anchorOf(k) || { name: k };
      const ds = groups[k];
      const mins = walkMins(k);
      return `<div class="stop-head" ${state.park !== "epcot" ? landStyle(anchorOf(k)?.land || k) : ""}>${spotArt(k, ds)}<div><h3>${esc(a.name)}</h3><small>${ds.length} drink${ds.length > 1 ? "s" : ""}${mins ? ` · ${icon("walk")} ~${mins} min` : ""}</small></div>
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
    <p class="section-sub">${state.park === "epcot" ? `${esc(festLabel())} plus year-round pavilion drinks` : `${esc(PK().name)}: bars, restaurants, stands &amp; carts`} · <button class="linkbtn" data-parks>${icon("map")}Switch park</button></p>
    <div class="search-wrap">${icon("search")}<input class="search" id="q" type="search" placeholder="Search drinks, booths, ingredients…" value="${esc(f.q)}" autocomplete="off" /></div>
    <div class="list-filters">${filterPanel()}</div>
    <div class="count-row">
      <p class="count-line">${list.length} drink${list.length === 1 ? "" : "s"}</p>
      <select class="sort" id="sort" aria-label="Sort">
        <option value="walk" ${f.sort === "walk" ? "selected" : ""}>${state.park === "epcot" ? "Walk the loop" : "Walk the park"}</option>
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
    const now = items.filter((x) => x.it.tried).length;
    return { m, now, ever: now + pastTriedFor(m.name).length, stamps: stampsFor(m).size };
  }).sort((a, b) => b.now - a.now || b.ever - a.ever);
  const fam = tabTotals(tabLines());
  if (!ms.length && !visits().length) return `<div class="empty"><div class="e">${icon("family")}</div><p>No one has checked in yet.<br/>Text this site's link to the family — everyone picks their name on their own phone.</p></div>`;

  const rated = D().drinks.map((d) => {
    const rs = familyOn(d.id).map((x) => x.it.rating).filter(Boolean);
    return { d, n: rs.length, avg: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0 };
  }).filter((x) => x.n).sort((a, b) => b.avg - a.avg || b.n - a.n).slice(0, 3);
  const wanted = D().drinks.map((d) => ({ d, n: familyOn(d.id).filter((x) => x.it.want && !x.it.tried).length })).filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 6);
  const feed = [];
  for (const m of members()) for (const x of memberItems(m)) if (x.it.at) feed.push({ m, x });
  feed.sort((a, b) => b.x.it.at.localeCompare(a.x.it.at));
  const starRow = (n) => `<span class="feed-stars">${Array.from({ length: n }, () => icon("star")).join("")}</span>`;

  return `
    <h2 class="section-title">Family</h2>
    <p class="section-sub">${esc(festLabel())} · updates live from everyone's phones</p>
    <div class="stat-tiles">
      <div class="stat"><b>${fam.drinks}</b><span>drinks bought</span></div>
      <div class="stat"><b>${money(fam.dollars)}</b><span>family total${fam.assumed ? ` · ${fam.assumed} to confirm` : ""}</span></div>
    </div>
    ${familyTab()}
    <div class="card"><h3>${icon("trophy")}Leaderboard</h3><div class="rows">${ms.map((x, i) => `
      <div class="leader"><span class="rank">${i + 1}</span>${avatar(x.m.emoji)}
        <div class="who"><b>${esc(x.m.name)}</b><small>${x.stamps} countr${x.stamps === 1 ? "y" : "ies"} stamped · ${x.ever} all-time</small></div>
        <div class="score">${x.now}<small>tried</small></div></div>`).join("")}</div></div>
    ${rated.length ? `<div class="card"><h3>${icon("star")}Top 3 family favorites</h3><div class="rows">${rated.map((x, i) => `
      <div class="leader"><span class="rank medal m${i + 1}">${i + 1}</span>${flag(x.d.country)}
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
        <time>${ago(x.it.at)}${x.current ? "" : ` · ${esc(x.festival)}`}</time></div></div>`).join("") || `<p class="muted" style="padding:12px 0">Nothing yet.</p>`}</div></div>
    ${visits().length ? `<p class="group-label">${icon("clock")}Past visits</p>${visits().map(visitCard).join("")}` : ""}`;
}

// Shared family tab: what we actually bought. Anyone can set the counts.
function familyTab() {
  const lines = tabLines();
  if (!lines.length) return "";
  const t = tabTotals(lines);
  return `<details class="card tab-card" ${ls.get("sips.tabOpen", true) ? "open" : ""}>
    <summary><h3>${icon("ticket")}Family tab<span class="tab-total">${money(t.dollars)}</span>${icon("chevron", "chev")}</h3></summary>
    <p class="tab-note">Tapping "Tried it" doesn't mean everyone bought one. Set how many the family actually bought — anyone can change it, and totals update for everyone.${t.assumed ? ` <b>${t.assumed} drink${t.assumed > 1 ? "s are" : " is"} still assumed at 1.</b>` : ""}</p>
    <div class="tab-list">${lines.map((l) => {
      const ps = priceList(l.price);
      return `<div class="tab-line ${l.assumed ? "assumed" : ""}" data-drink="${esc(l.id)}">
        <div class="tl-top">
          <div class="tl-name"><b>${esc(l.name)}</b><small>${flag(l.country)}${esc(l.booth)}</small></div>
          <span class="tl-cost">${l.cost != null ? money(l.cost) : `<span class="muted">no price</span>`}</span>
        </div>
        <div class="tl-who">${l.who.map((m) => avatar(m.emoji)).join("")}<span>${esc(l.who.map((m) => m.name).join(", "))} tried it</span></div>
        <div class="tl-ctl">
          <span class="qty-label">Bought</span>
          ${l.counts.map((n, i) => `<span class="buy">${ps.length > 1 ? `<small>${money(ps[i])}</small>` : ""}<span class="stepper"><button data-buy="${i}" data-d="-1" aria-label="One fewer" ${n <= 0 ? "disabled" : ""}>${icon("minus")}</button><b>${n}</b><button data-buy="${i}" data-d="1" aria-label="One more">${icon("plus")}</button></span></span>`).join("")}
          ${l.assumed ? `<button class="linkbtn tl-ok" data-buy-ok>${icon("check")}1 is right</button>` : ""}
        </div></div>`;
    }).join("")}</div>
    <div class="tab-grand"><span>${t.drinks} bought${t.unpriced ? ` · ${t.unpriced} unpriced` : ""}</span><b>${money(t.dollars)}</b></div>
  </details>`;
}

async function setBought(drinkId, counts) {
  (D().tab ||= {})[drinkId] = { drinkId, counts, by: state.me?.name, at: new Date().toISOString() };
  render();
  try { await api("tab", { method: "POST", body: { drinkId, counts, member: state.me?.name } }); }
  catch (e) { toast(e.message); load({ quiet: true }); }
}

function visitCard(v) {
  const people = [...v.members].filter((m) => m.tried.length).sort((a, b) => b.tried.length - a.tried.length);
  return `<div class="card visit-card"><h3>${icon("ticket")}${esc(v.name)}</h3><div class="rows">
    <p class="visit-meta">${fmtDay(v.startedAt)} – ${fmtDay(v.endedAt)}${v.spend ? ` · ${v.spend.drinks} bought · <b>${money(v.spend.dollars)}</b> total` : ""}</p>
    ${v.favorites?.length ? `<p class="visit-sub">Top 3 favorites</p>${v.favorites.map((f, i) => `
      <div class="leader"><span class="rank medal m${i + 1}">${i + 1}</span>${flag(f.country)}
        <div class="who"><b>${esc(f.name)}</b><small>${esc(f.booth)} · ${f.n} rating${f.n > 1 ? "s" : ""}</small></div>
        <div class="score">${Number(f.avg).toFixed(1)}<small>avg stars</small></div></div>`).join("")}` : ""}
    <p class="visit-sub">Who tried what</p>
    ${people.map((m) => `<div class="leader">${avatar(m.emoji)}<div class="who"><b>${esc(m.name)}</b><small>${esc(m.tried.slice(0, 3).map((t) => t.name).join(", "))}${m.tried.length > 3 ? ` +${m.tried.length - 3} more` : ""}</small></div>
      <div class="score">${m.tried.length}<small>tried</small></div></div>`).join("")}
  </div></div>`;
}

const STAMP_INK = ["#f2c46a", "#f59a86", "#a9d4f2", "#b9e3a0", "#e3b5f0"];
// Country stamps carry a flag; park stamps (park: true) carry the park's landmark.
function stampSVG(c, got, i, { park = false } = {}) {
  const ink = got ? STAMP_INK[i % STAMP_INK.length] : "#efe6cf";
  const rot = got ? ((i * 37) % 26) - 13 : 0;
  const name = (park ? c.short : c.name).replace("United Kingdom", "U.K.").replace("United States", "U.S.A.").replace("Hollywood Studios", "Hollywood").toUpperCase();
  const sid = `${park ? "p-" : ""}${c.id}`;
  return `<div class="stamp ${got ? "" : "empty-s"}" title="${esc(c.name)}">
    <svg class="st" viewBox="-40 -40 80 80" style="transform:rotate(${rot}deg)" aria-hidden="true">
      <defs><path id="stT-${sid}" d="M-26 0a26 26 0 1 1 52 0"/><path id="stB-${sid}" d="M-29 0a29 29 0 1 0 58 0"/></defs>
      <circle r="37" fill="none" stroke="${ink}" stroke-width="2.4" ${got ? "" : 'stroke-dasharray="3 3"'}/>
      <circle r="21" fill="none" stroke="${ink}" stroke-width=".8"/>
      <text fill="${ink}" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="${name.length > 11 ? 7.5 : 9}" letter-spacing="1.2"><textPath href="#stT-${sid}" startOffset="50%" text-anchor="middle">${esc(name)}</textPath></text>
      <text fill="${ink}" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="6.5" letter-spacing="2.4" dominant-baseline="hanging"><textPath href="#stB-${sid}" startOffset="50%" text-anchor="middle">${park ? "★ WALT DISNEY WORLD ★" : "★ EPCOT ★"}</textPath></text>
      ${park ? `<svg x="-16" y="-15" width="32" height="26" viewBox="-25 -29 50 41" style="${got ? "" : "filter:grayscale(1);opacity:.55"}">${parkGlyph(c.id)}</svg>`
        : `<svg x="-13.5" y="-9" width="27" height="18" viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" style="${got ? "" : "filter:grayscale(1)"}">${flagBody(c.id)}</svg>`}
    </svg></div>`;
}

function renderPassport() {
  if (!state.me) return `<div class="empty"><div class="e">${icon("passport")}</div><p>Pick your name to start your passport.</p><button class="btn accent" data-join>Join the family</button></div>`;
  const rec = myRec();
  const items = memberItems(rec);
  const tried = items.filter((x) => x.it.tried);
  const want = items.filter((x) => x.it.want && !x.it.tried && x.current);
  const got = stampsFor(rec);
  const gotParks = new Set(tried.map((x) => x.park));
  const ps = parkList();
  const cs = D().countries.filter((c) => c.pavilion || got.has(c.id) || D().drinks.some((d) => d.country === c.id)).filter((c) => c.id !== "park");
  const byFest = {};
  for (const x of tried) (byFest[x.festival] ||= []).push(x);
  const past = pastTriedFor(state.me.name);
  const byVisit = {};
  for (const t of past) (byVisit[t.visit.id] ||= { v: t.visit, xs: [] }).xs.push(t);


  return `
    <div class="passport">
      <span class="seal">${icon("globe")}</span>
      <div class="passport-head">${avatar(state.me.emoji)}<div><div class="eyebrow">Park Passport</div><h2>${esc(state.me.name)}</h2></div></div>
      <div class="meta"><span><b>${tried.length}</b>tried this visit</span>${past.length ? `<span><b>${tried.length + past.length}</b>all-time</span>` : ""}<span><b>${got.size + gotParks.size}/${cs.length + ps.length}</b>stamps</span></div>
      <p class="stamp-label">Parks</p>
      <div class="stamps">${ps.map((p, i) => stampSVG(p, gotParks.has(p.id), i + 2, { park: true })).join("")}</div>
      <p class="stamp-label">World Showcase</p>
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
    || (past.length ? "" : `<div class="empty"><div class="e">${icon("glass")}</div><p>Nothing yet — pick a spot on the map and start sipping.</p></div>`)}
    ${Object.values(byVisit).map(({ v, xs }) => `
      <p class="group-label">${icon("ticket")}${esc(v.name)} (${xs.length})</p>
      <div class="drinks">${xs.sort((a, b) => (b.rating || 0) - (a.rating || 0)).map((t) => `
        <article class="drink tried past"><div class="drink-top"><span class="drink-type">${icon(TYPE_ICON[t.type] || "glass")}</span><div class="drink-title"><h4>${esc(t.name)}</h4></div><span class="price">${esc(t.price)}</span></div>
          <p class="where">${flag(t.country)}${esc(t.booth)} · ${fmtDay(t.at || v.endedAt)}</p>
          ${t.rating ? `<div class="chips"><span class="chip star">${icon("star")}${t.rating}</span></div>` : ""}
          ${t.note ? `<p class="my-note">“${esc(t.note)}”</p>` : ""}</article>`).join("")}</div>`).join("")}`;
}

// ══════════════════════════════════════════════════════════════════════════
//  BUZZ METER (just for fun)
// ══════════════════════════════════════════════════════════════════════════
const BUZZ = [
  "Stone-cold sober", "Just a sip", "Warming up", "Chatty", "Giggly", "Humming the Figment song",
  "Dancing in Germany", "Hugging a Cast Member", "Proposing to Spaceship Earth", "Seeing Figment for real", "Tap out — water & a bench",
];
const SERIES = 8; // categorical slots --s1…--s8 (validated palette), assigned by name so colors never shuffle
// Each tried drink carries its own buzz rating; a person's line is those, in the order they were rated.
const buzzLog = (m) => Object.entries(m?.items || {})
  .filter(([, it]) => it.tried && Number.isFinite(it.buzz))
  .map(([drinkId, it]) => ({ at: it.buzzAt || it.at, level: it.buzz, drinkId }))
  .sort((a, b) => String(a.at).localeCompare(String(b.at)));
const nowBuzz = (m) => { const l = buzzLog(m); return l.length ? l[l.length - 1].level : null; };
const fmtTime = (ms, withDay) => new Date(ms).toLocaleString("en-US", withDay ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" } : { hour: "numeric", minute: "2-digit" });
let buzzSeries = null;

function buzzPeople(range = "visit") {
  const today = new Date().toDateString();
  return [...members()].sort((a, b) => a.name.localeCompare(b.name)).map((m, i) => ({
    m, slot: (i % SERIES) + 1,
    pts: buzzLog(m).map((b) => ({ t: Date.parse(b.at), v: b.level, drinkId: b.drinkId })).filter((p) => range !== "today" || new Date(p.t).toDateString() === today),
  }));
}

function renderBuzz() {
  const range = state.buzzRange || "today";
  const people = buzzPeople(range);
  const logged = people.filter((p) => p.pts.length);
  const anyVisit = buzzPeople("visit").some((p) => p.pts.length);
  const peak = logged.flatMap((p) => p.pts.map((pt) => ({ p, ...pt }))).sort((a, b) => b.v - a.v || a.t - b.t)[0];
  return `
    <h2 class="section-title">Family buzz</h2>
    <p class="section-sub">Built from the buzz you rate after each "Tried it". 0 = stone-cold sober, 10 = time for water and a bench.</p>

    <div class="card"><h3>${icon("family")}Buzz over time</h3><div class="rows">
      <div class="seg buzz-range"><button data-brange="today" class="${range === "today" ? "on" : ""}">Today</button><button data-brange="visit" class="${range === "visit" ? "on" : ""}">Whole visit</button></div>
      ${logged.length ? `
        <div class="legend">${logged.map((p) => `<span class="lg"><i style="background:var(--s${p.slot})"></i>${esc(p.m.name)} <b>${nowBuzz(p.m)}</b></span>`).join("")}</div>
        <div class="buzz-chart" id="buzzChart">${buzzChartSVG(logged)}<div class="buzz-tip" hidden></div></div>
        ${peak ? `<p class="muted buzz-foot">Peak so far: <b>${esc(peak.p.m.name)}</b> hit ${peak.v}/10 at ${fmtTime(peak.t)}.</p>` : ""}`
      : `<div class="empty"><div class="e">${icon("bolt")}</div><p>${range === "today" && anyVisit ? "Nothing logged today yet. Switch to Whole visit to see earlier days." : "No buzz yet. Every \"Tried it\" asks for stars and buzz."}</p></div>`}
    </div></div>

    ${logged.length ? `<div class="card"><h3>${icon("list")}Right now</h3><div class="rows">${people.filter((p) => p.pts.length || buzzLog(p.m).length).map((p) => {
      const n = nowBuzz(p.m), pk = p.pts.reduce((a, b) => Math.max(a, b.v), -1);
      return `<div class="leader">${avatar(p.m.emoji)}<div class="who"><b>${esc(p.m.name)}</b><small>${n != null ? `${esc(BUZZ[n])} · peak ${pk}` : "not logged"}</small></div>
        <div class="score">${n ?? "–"}<small>of 10</small></div></div>`;
    }).join("")}</div></div>` : ""}
    <p class="muted" style="font-size:.78rem;text-align:center;margin-top:18px">Buzz is a joke meter, not a measurement. Drink water, pace yourself, and never drive after drinking.</p>`;
}

function buzzPicker(cur) {
  return `<div class="buzz-pick">${BUZZ.map((label, n) => `<button data-buzz="${n}" class="${cur === n ? "on" : ""}" style="--lvl:${n / 10}" title="${esc(label)}" aria-label="${n} — ${esc(label)}">${n}</button>`).join("")}</div>`;
}

// Line chart: one line per person, 0–10 on a single axis, time across.
function buzzChartSVG(series) {
  const W = 340, H = 220, L = 26, R = 66, T = 12, B = 28;
  const all = series.flatMap((s) => s.pts.map((p) => p.t));
  let t1 = Math.max(...all), t0 = Math.min(...all);
  if (t1 - t0 < 3600e3) t0 = t1 - 3600e3;                 // show at least an hour
  const pad = (t1 - t0) * 0.04; t0 -= pad; t1 += pad;
  const x = (t) => L + (t - t0) / (t1 - t0) * (W - L - R), y = (v) => T + (10 - v) / 10 * (H - T - B);
  const multiDay = new Date(t0).toDateString() !== new Date(t1).toDateString();
  let g = "";
  for (let v = 0; v <= 10; v += 2) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v)}" class="ax" text-anchor="end" dominant-baseline="central">${v}</text>`;
  for (let i = 0; i < 3; i++) { const t = t0 + (t1 - t0) * (0.12 + i * 0.38); g += `<text x="${x(t)}" y="${H - 8}" class="ax" text-anchor="middle">${fmtTime(t, multiDay)}</text>`; }
  let lines = "", dots = "", labels = [];
  for (const s of series) {
    const d = s.pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join("");
    lines += `<path d="${d}" class="ln" style="stroke:var(--s${s.slot})"/>`;
    dots += s.pts.map((p) => `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="4" class="dot" style="fill:var(--s${s.slot})"/>`).join("");
    const last = s.pts[s.pts.length - 1];
    labels.push({ y: y(last.v), x: x(last.t), name: s.m.name, slot: s.slot });
  }
  // Direct labels at each line's end, nudged apart so they never overlap.
  labels.sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 13) labels[i].y = labels[i - 1].y + 13;
  const dl = labels.map((l) => `<line x1="${l.x + 5}" x2="${W - R + 6}" y1="${l.y}" y2="${l.y}" class="lead"/><circle cx="${W - R + 10}" cy="${l.y}" r="3.5" style="fill:var(--s${l.slot})"/><text x="${W - R + 17}" y="${l.y}" class="dl" dominant-baseline="central">${esc(l.name.length > 8 ? l.name.slice(0, 7) + "…" : l.name)}</text>`).join("");
  buzzSeries = { series, t0, t1, W, L, R, x };
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Family buzz levels over time">${g}${lines}${dots}${dl}<line class="xhair" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/></svg>`;
}

// Crosshair + tooltip: snap to the nearest logged moment and list everyone's level then.
function wireBuzzChart() {
  const box = $("#buzzChart");
  if (!box || !buzzSeries) return;
  const svg = box.querySelector("svg"), tip = box.querySelector(".buzz-tip"), hair = svg.querySelector(".xhair");
  const times = [...new Set(buzzSeries.series.flatMap((s) => s.pts.map((p) => p.t)))].sort((a, b) => a - b);
  const show = (e) => {
    const r = svg.getBoundingClientRect(), { W, L, R, t0, t1, x } = buzzSeries;
    const vx = (e.clientX - r.left) / r.width * W;
    const t = t0 + (vx - L) / (W - L - R) * (t1 - t0);
    const snap = times.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a), times[0]);
    hair.setAttribute("x1", x(snap)); hair.setAttribute("x2", x(snap)); hair.setAttribute("visibility", "visible");
    tip.replaceChildren();
    const head = document.createElement("div"); head.className = "tt-h"; head.textContent = fmtTime(snap, true); tip.append(head);
    for (const s of buzzSeries.series) {
      const at = [...s.pts].reverse().find((p) => p.t <= snap);
      const row = document.createElement("div"); row.className = "tt-r";
      const sw = document.createElement("i"); sw.style.background = `var(--s${s.slot})`;
      const v = document.createElement("b"); v.textContent = at ? at.v : "–";
      const n = document.createElement("span"); n.textContent = s.m.name;
      row.append(sw, v, n);
      if (at && at.t === snap && at.drinkId) { const dn = drinkById(at.drinkId)?.name; if (dn) { const k = document.createElement("small"); k.textContent = `after ${dn}`; row.append(k); } }
      tip.append(row);
    }
    tip.hidden = false;
    const px = x(snap) / W * r.width;
    tip.style.left = `${Math.min(Math.max(px + 10, 0), r.width - tip.offsetWidth)}px`;
  };
  const hide = () => { tip.hidden = true; hair.setAttribute("visibility", "hidden"); };
  svg.addEventListener("pointermove", show);
  svg.addEventListener("pointerdown", show);
  svg.addEventListener("pointerleave", hide);
}

// "How was it?" — stars + buzz for one drink, right after "Tried it" (or the first star tap).
function rateSheet(d, { stars } = {}) {
  const mine = myItem(d.id);
  let rating = stars ?? mine.rating ?? 0, buzz = Number.isFinite(mine.buzz) ? mine.buzz : null;
  const prev = buzzLog(myRec()).filter((b) => b.drinkId !== d.id).slice(-1)[0];
  const starBtns = () => [1, 2, 3, 4, 5].map((n) => `<button data-rs="${n}" aria-label="${n} star${n > 1 ? "s" : ""}" class="${rating >= n ? "lit" : ""}">${icon("star")}</button>`).join("");
  openSheet(`<h2>How was it?</h2>
    <p class="muted">${esc(d.name)}</p>
    <div class="field"><span>Your rating</span><div class="stars big" id="rsStars">${starBtns()}</div></div>
    <div class="field"><span>Buzz after this drink</span>${buzzPicker(buzz)}
      <p class="buzz-hint muted" id="rsHint">${buzz != null ? `${buzz} — ${esc(BUZZ[buzz])}` : "0 = stone-cold sober · 10 = tap out"}</p>
      ${prev ? `<button class="btn block" data-rs-same>${icon("refresh")}Same as last drink · ${prev.level}</button>` : ""}</div>
    <button class="btn accent block" id="rsSave" ${buzz == null ? "disabled" : ""}>${icon("check")}Save</button>`, (el) => {
    const setBuzz = (n) => {
      buzz = n;
      el.querySelectorAll("[data-buzz]").forEach((b) => b.classList.toggle("on", +b.dataset.buzz === n));
      $("#rsHint", el).textContent = `${n} — ${BUZZ[n]}`;
      $("#rsSave", el).disabled = false;
    };
    el.querySelectorAll("[data-buzz]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); setBuzz(+b.dataset.buzz); }));
    $("[data-rs-same]", el)?.addEventListener("click", (e) => { e.stopPropagation(); setBuzz(prev.level); });
    $("#rsStars", el).addEventListener("click", (e) => {
      const b = e.target.closest("[data-rs]"); if (!b) return;
      e.stopPropagation();
      rating = rating === +b.dataset.rs ? 0 : +b.dataset.rs;
      $("#rsStars", el).innerHTML = starBtns();
    });
    $("#rsSave", el).addEventListener("click", (e) => {
      e.stopPropagation();
      if (buzz == null) return toast("Pick a buzz level");
      closeSheet();
      checkin(d.id, { tried: true, rating, buzz });
      toast(`Saved${rating ? ` · ${rating}★` : ""} · buzz ${buzz}/10${buzz >= 7 ? " — grab a free ice water at any quick-service counter" : ""}`);
    });
  }, { sticky: true });
}

// ══════════════════════════════════════════════════════════════════════════
//  SHEETS
// ══════════════════════════════════════════════════════════════════════════
function openSheet(html, onMount, { sticky = false } = {}) { $("#sheetBody").innerHTML = html; $("#sheet").hidden = false; $("#sheet").dataset.sticky = sticky ? "1" : ""; onMount?.($("#sheetBody")); }
function closeSheet() { $("#sheet").hidden = true; $("#sheet").dataset.sticky = ""; $("#sheetBody").innerHTML = ""; }
const sheetIsSticky = () => $("#sheet").dataset.sticky === "1";
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

// Add a drink the menu is missing. In "log" mode (from a pavilion) it's something you had —
// e.g. at a restaurant — so it's marked tried and kept off the map unless you choose otherwise.
function addSheet({ log = false } = {}) {
  if (!state.me) return joinSheet();
  const A = D().anchors;
  const here = state.sel && A[state.sel] ? A[state.sel] : null;
  const epcot = state.park === "epcot";
  const opts = walkOrder().filter((id) => A[id]).map((id) => `<option value="${id}" ${id === state.sel ? "selected" : ""}>${esc(A[id].kind === "land" ? `${A[id].name} (anywhere)` : A[id].name)}</option>`).join("");
  const guessCountry = state.sel && A[state.sel]?.kind === "pavilion" ? (state.sel === "america" ? "usa" : state.sel) : "park";
  openSheet(`
    <h2>${log ? "Log a drink" : "Add a drink"}</h2>
    <p class="muted">${log ? `Had something that isn't on our list${here ? ` at ${esc(here.name)}` : ""} — a restaurant drink, a special? Log it and it counts toward your passport, the family tab and the buzz chart.` : "Spotted something that isn't listed? Add it and everyone sees it on the map."}</p>
    <label class="field"><span>Drink name *</span><input id="aName" maxlength="90" placeholder="${log ? "e.g. House margarita" : "e.g. Frozen Grey Goose Orange Slush"}" /></label>
    <label class="field"><span>Where? (map spot)</span><select id="aAnchor">${opts}</select></label>
    <label class="field"><span>Restaurant / bar${log ? " (optional)" : ""}</span><input id="aBooth" maxlength="60" placeholder="e.g. ${log ? "San Angel Inn" : "Les Vins des Chefs de France"}" /></label>
    ${epcot ? `<label class="field"><span>Country</span><select id="aCountry">${D().countries.map((c) => `<option value="${c.id}" ${c.id === guessCountry ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>` : ""}
    <label class="field"><span>Type</span><select id="aType">${D().types.map((t) => `<option value="${t}">${TYPE_LABEL[t]}</option>`).join("")}</select></label>
    <label class="field"><span>Price</span><input id="aPrice" maxlength="30" placeholder="$14.00" /></label>
    ${log ? "" : `<label class="field"><span>What's in it?</span><textarea id="aDesc" rows="2" maxlength="240"></textarea></label>`}
    ${epcot ? `<label class="check-field"><input type="checkbox" id="aYr" /> <span>It's on the year-round menu (not just this festival)</span></label>` : ""}
    <label class="check-field"><input type="checkbox" id="aShow" ${log ? "" : "checked"} /> <span>Show it on the map and menu for everyone</span></label>
    <button class="btn accent block" id="aGo">${log ? `${icon("check")}Log it — I had this` : "Add for everyone"}</button>`, (el) => {
    $("#aGo", el).onclick = async () => {
      const body = { member: state.me.name, park: state.park, name: $("#aName").value, anchor: $("#aAnchor").value, country: $("#aCountry")?.value || "park", booth: $("#aBooth").value || (log && here ? here.name : ""), type: $("#aType").value, price: $("#aPrice").value, desc: $("#aDesc")?.value || "", yearRound: epcot ? $("#aYr").checked : true, hidden: !$("#aShow").checked };
      if (!body.name.trim()) return toast("Give it a name");
      try {
        const out = await api("drinks", { method: "POST", body });
        closeSheet(); await load();
        if (log) { await checkin(out.drink.id, { tried: true }); rateSheet(out.drink); }
        else toast("Added for everyone");
      } catch (e) { toast(e.message); }
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
// admin.park: which park the prompt / upload / research is for (defaults to the one on screen).
const admin = { code: null, prompt: null, prompts: null, text: null, park: null };

function infoSheet() {
  const { festival: f, nextFestival: nf, refresh } = D();
  admin.park = admin.park && PK(admin.park).id === admin.park ? admin.park : state.park;
  const ap = admin.park, epcot = ap === "epcot";
  const menu = epcot ? D().menu : D().menu.parks?.[ap] || {};
  const st = refresh || {};
  const busy = st.state === "running" || st.state === "queued";
  const src = (menu.sources || []).slice(0, 8).map((u) => `<div class="src">• <a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, ""))}</a></div>`).join("");
  const origin = { seed: " (starter menu)", manual: " (uploaded)", claude: "" }[menu.origin] || "";
  const unlocked = !!admin.prompt;
  const prompt = admin.prompts?.[ap] || admin.prompt;
  openSheet(`
    <h2>Settings</h2>
    <div class="seg park-seg">${parkList().map((p) => `<button class="${p.id === ap ? "on" : ""}" data-apark="${p.id}">${esc(p.short.replace("Hollywood Studios", "Hollywood").replace("Animal Kingdom", "Animal K.").replace("Magic Kingdom", "Magic K.").replace(" Lagoon", "").replace(" Beach", ""))}</button>`).join("")}</div>
    <p class="group-label">${icon("info")}${esc(PK(ap).short)} menu</p>
    <dl class="kv">
      ${epcot ? `<dt>Festival</dt><dd>${f?.name ? `${esc(f.name)}<br><span class="muted">${fmtDate(f.starts)} – ${fmtDate(f.ends)}${f.active ? "" : " (not running today)"}</span>` : "None running today"}</dd>
      ${nf?.name ? `<dt>Next up</dt><dd>${esc(nf.name)}${nf.starts ? ` · ${fmtDate(nf.starts)}` : ""}</dd>` : ""}
      <dt>Festival menu</dt><dd>updated ${ago(menu.checkedAt)}${origin}</dd>
      <dt>Year-round</dt><dd>${menu.yearRoundCheckedAt ? `updated ${ago(menu.yearRoundCheckedAt)}` : "starter list"}</dd>`
      : `<dt>Drinks</dt><dd>${D().drinks.filter((d) => parkOf(d) === ap).length} at ${new Set(D().drinks.filter((d) => parkOf(d) === ap).map((d) => d.anchor)).size} spots</dd>
      <dt>Menu</dt><dd>updated ${ago(menu.checkedAt)}${origin}</dd>`}
      <dt>Last update</dt><dd>${st.state === "never" ? "—" : `${esc(st.state)} ${ago(st.finishedAt || st.startedAt)}${st.message ? `<br><span class="muted">${esc(st.message)}</span>` : ""}`}</dd>
    </dl>
    ${src ? `<details class="srcs"><summary>Sources (${(menu.sources || []).length})</summary>${src}</details>` : ""}

    <p class="group-label">${icon("refresh")}Update the menu</p>
    ${unlocked ? `
      <ol class="steps">
        <li><b>Copy the ${esc(PK(ap).short)} prompt</b><p>It already knows today's date and every ${epcot ? "map spot" : "bar, restaurant and stand"} and field the app needs. Each park has its own prompt: pick the park above.</p>
          <div class="btn-row"><button class="btn accent" id="copyPrompt">${icon("copy")}Copy prompt</button></div>
          <details class="prompt-peek"><summary>Show the prompt</summary><textarea class="mono" id="promptText" readonly>${esc(prompt)}</textarea></details></li>
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

    ${unlocked ? `
      <p class="group-label">${icon("ticket")}Start a new visit</p>
      <p class="muted" style="font-size:.86rem">Saves this visit — everyone's tried drinks, ratings, notes and the top 3 family favorites — to the Family and Passport history, then clears check-ins so the whole family starts fresh. Wishlists carry over.</p>
      <label class="field"><span>Name this visit</span><input id="visitName" maxlength="60" value="${esc(suggestVisitName())}" /></label>
      <button class="btn block danger-outline" id="newVisit">${icon("refresh")}Save &amp; start a new visit</button>` : ""}

    ${st.enabled ? `
      <p class="group-label">${icon("bolt")}Automatic research</p>
      <p class="muted" style="font-size:.84rem">${st.auto ? `On — re-checks EPCOT every ${st.everyDays} days (plus the day a festival starts or ends) and the other parks every 3 weeks.` : "Uses the API key set in Netlify. Only runs when you tap the button."}</p>
      ${unlocked ? `<button class="btn block" id="refreshNow" ${busy ? "disabled" : ""}>${busy ? "Updating… (takes a few minutes)" : `${icon("refresh")}Research ${esc(PK(ap).short)} with the API now`}</button>` : `<p class="muted" style="font-size:.8rem">Unlock above to use it.</p>`}` : ""}
    <p class="muted" style="font-size:.78rem;margin-top:14px">Prices can change at the booth — if something's off, fix it from the drink's ••• menu or add it with ＋.</p>
  `, (el) => {
    const unlock = async (code, quiet) => {
      try {
        const out = await api("unlock", { method: "POST", body: {}, headers: { "x-refresh-code": code } });
        admin.code = code; admin.prompt = out.prompt; admin.prompts = out.prompts || null; ls.set(LS.rcode, code);
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

    el.querySelectorAll("[data-apark]").forEach((b) => b.addEventListener("click", () => { admin.park = b.dataset.apark; admin.text = null; infoSheet(); }));
    $("#copyPrompt", el)?.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(prompt); }
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

    const send = (dryRun) => api("import", { method: "POST", body: { text: admin.text, dryRun, park: ap, member: state.me?.name }, headers: { "x-refresh-code": admin.code } });
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

    $("#newVisit", el)?.addEventListener("click", async (ev) => {
      const b = ev.currentTarget;
      if (!b.dataset.armed) { b.dataset.armed = "1"; b.innerHTML = `${icon("alert")}Tap again to save &amp; clear everyone's check-ins`; b.classList.add("armed"); setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.classList.remove("armed"); b.innerHTML = `${icon("refresh")}Save &amp; start a new visit`; } }, 5000); return; }
      b.disabled = true;
      try {
        const out = await api("visit/new", { method: "POST", body: { name: $("#visitName", el).value, member: state.me?.name }, headers: { "x-refresh-code": admin.code } });
        closeSheet(); await load();
        toast(`Saved "${out.visit.name}" (${out.visit.tried} drinks). Fresh start!`);
      } catch (e) { b.disabled = false; toast(e.message); }
    });

    $("#refreshNow", el)?.addEventListener("click", async () => {
      try { await api("refresh", { method: "POST", body: { member: state.me?.name, jobs: epcot ? ["festival", "yearround"] : [`park:${ap}`] }, headers: { "x-refresh-code": admin.code } }); toast("Researching the latest menus… check back in a few minutes"); closeSheet(); setTimeout(() => load({ quiet: true }), 3000); }
      catch (e) { toast(e.message); }
    });
  });
}

function suggestVisitName() {
  const ats = members().flatMap((m) => Object.values(m.items || {}).filter((it) => it.tried).map((it) => it.at)).filter(Boolean).sort();
  const from = D().visit?.startedAt && (!ats[0] || D().visit.startedAt < ats[0]) ? D().visit.startedAt : ats[0];
  const md = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const range = from ? (md(from) === md(new Date().toISOString()) ? md(from) : `${md(from)} – ${md(new Date().toISOString())}`) : "";
  return `${festLabel()}${range ? ` · ${range}` : ""}`;
}

function importPreview(p, ok) {
  const f = p.festival, y = p.yearRound, pm = p.parkMenu;
  const rows = [];
  if (pm) rows.push(`<div class="imp-row">${icon("map")}<div><b>${esc(PK(p.park).name)}</b><small>${pm.booths} spots · ${pm.drinks} drinks</small></div></div>`);
  if (f) rows.push(`<div class="imp-row">${icon("ticket")}<div><b>${f.name ? esc(f.name) : "No festival running"}</b><small>${f.name ? `${fmtDate(f.starts) || "?"} – ${fmtDate(f.ends) || "?"} · ${f.active ? "running now" : "not running today"} · ` : ""}${f.booths} booths · ${f.drinks} drinks${f.nextFestival?.name ? `<br>Next: ${esc(f.nextFestival.name)}${f.nextFestival.starts ? ` · ${fmtDate(f.nextFestival.starts)}` : ""}` : ""}</small></div></div>`);
  if (y) rows.push(`<div class="imp-row">${icon("globe")}<div><b>Year-round pavilion drinks</b><small>${y.booths} spots · ${y.drinks} drinks</small></div></div>`);
  if (p.sources) rows.push(`<div class="imp-row">${icon("info")}<div><b>${p.sources} source link${p.sources > 1 ? "s" : ""}</b><small>shown under Settings → Sources</small></div></div>`);
  return `<div class="card import-card">
    <h3 class="${ok ? "" : "bad"}">${icon(ok ? "check" : "alert")}${ok ? "Ready to update" : "Can't use this upload"}</h3>
    <div class="rows">
      ${rows.join("")}
      ${p.errors.length ? `<ul class="errs">${p.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}
      ${p.warnings.length ? `<ul>${p.warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
      ${ok ? `<p class="muted" style="font-size:.8rem;margin:10px 0">This replaces ${pm ? `the ${esc(PK(p.park).short)} menu` : f && y ? "the festival and year-round menus" : f ? "the festival menu" : "the year-round list"} for everyone. Family ratings stay in each person's passport.</p>
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
  const snapshot = d ? { name: d.name, booth: d.booth, price: d.price, type: d.type, country: d.country, park: parkOf(d), festival: parkOf(d) !== "epcot" ? PK(parkOf(d)).short : d.yearRound ? "Year-round" : festLabel() } : undefined;
  try {
    const out = await api("checkin", { method: "POST", body: { member: state.me.name, emoji: state.me.emoji, drinkId, snapshot, ...patch } });
    Object.assign(rec, out.member);
    render();
  } catch (e) { toast(e.message); load({ quiet: true }); }
}

async function jumpTo(anchor) {
  const park = anchorOf(anchor)?.park || "epcot";
  state.tab = "map"; ls.set(LS.tab, "map");
  if (park !== state.park) setPark(park);
  await loadMap(park).catch(() => {});
  render();
  requestAnimationFrame(() => { if (geo?.pts[anchor]) selectSpot(anchor); });
}

// ── Parks ─────────────────────────────────────────────────────────────────
function setPark(id) {
  if (!D()?.parks?.[id] || id === state.park) return;
  stopAnim();
  state.park = id; ls.set(LS.park, id);
  state.sel = null; state.drawer = "peek"; state.me_pos = null;
  geo = null; view = null; vb = null; fitVB = null; mapBuiltFor = null;
  $("#overlay").innerHTML = "";
  render();
}
function parksSheet() {
  const count = (id) => D().drinks.filter((d) => parkOf(d) === id && !d.hidden).length;
  const tried = new Set(members().flatMap((m) => memberItems(m).filter((x) => x.it.tried).map((x) => x.park)));
  openSheet(`
    <h2>Pick a park</h2>
    <p class="muted">Every park has its own map and menu. Family check-ins, the tab and passports cover all of them.</p>
    ${[["Theme parks", parkList().filter((p) => !p.water)], ["Water parks", parkList().filter((p) => p.water)]].filter(([, ps]) => ps.length).map(([title, ps]) => `
    <p class="group-label">${esc(title)}</p>
    <div class="park-list">${ps.map((p) => `
      <button class="park-card ${p.id === state.park ? "on" : ""}" data-park="${p.id}">
        <span class="park-art"><svg viewBox="-25 -29 50 41" aria-hidden="true">${parkGlyph(p.id)}</svg></span>
        <span class="park-txt"><b>${esc(p.short)}</b><small>${count(p.id)} drinks${p.festivals && D().festival?.active ? ` · ${esc(shortFest(D().festival.name))}` : ""}${tried.has(p.id) ? " · family has sipped here" : ""}</small></span>
        ${p.id === state.park ? `<span class="chip">Showing</span>` : icon("chevron", "go")}
      </button>`).join("")}</div>`).join("")}`, (el) => {
    el.querySelectorAll("[data-park]").forEach((b) => b.addEventListener("click", () => { closeSheet(); setPark(b.dataset.park); }));
  });
}

// ── Events ────────────────────────────────────────────────────────────────
document.addEventListener("click", (ev) => {
  const t = ev.target.closest("button, [data-close]");
  if (!t) return;
  if (t.matches("[data-close]")) { if (t.classList.contains("sheet-backdrop") && sheetIsSticky()) return; return closeSheet(); }
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
  if (t.hasAttribute("data-parks")) return parksSheet();
  if (t.dataset.sbooth !== undefined) {
    state.spotBooth = state.spotBooth === t.dataset.sbooth ? null : t.dataset.sbooth;
    document.querySelectorAll("[data-sbooth]").forEach((b) => b.classList.toggle("on", b.dataset.sbooth === state.spotBooth));
    refreshSpotList();
    return;
  }
  if (t.hasAttribute("data-log-here")) return addSheet({ log: true });
  if (t.dataset.brange) { state.buzzRange = t.dataset.brange; render(); return; }
  if (t.hasAttribute("data-ftoggle")) return setFiltersOpen(!state.filtersOpen);
  if (t.hasAttribute("data-freset")) { Object.assign(state.filters, { group: "all", only: "all", fest: true, yr: true }); render(); return; }
  if (t.dataset.group) { state.filters.group = t.dataset.group; render(); return; }
  if (t.dataset.only) { state.filters.only = state.filters.only === t.dataset.only && t.dataset.only !== "all" ? "all" : t.dataset.only; render(); return; }
  if (t.dataset.layer) { state.filters[t.dataset.layer] = !state.filters[t.dataset.layer]; render(); return; }

  const line = t.closest(".tab-line");
  if (line) {
    const l = tabLines().find((x) => x.id === line.dataset.drink);
    if (!l) return;
    if (t.hasAttribute("data-buy-ok")) return setBought(l.id, l.counts);
    if (t.dataset.buy) { const c = [...l.counts]; c[+t.dataset.buy] = Math.max(0, Math.min(50, c[+t.dataset.buy] + Number(t.dataset.d))); return setBought(l.id, c); }
  }
  const card = t.closest(".drink[data-id]");
  if (card) {
    const id = card.dataset.id;
    const d = drinkById(id);
    const mine = myItem(id);
    if (t.dataset.rate) {
      const n = Number(t.dataset.rate);
      // First rating (or no buzz yet) → ask for buzz too; otherwise just update the stars.
      if (!mine.tried || !Number.isFinite(mine.buzz)) return d && state.me ? rateSheet(d, { stars: n }) : joinSheet();
      return checkin(id, { rating: mine.rating === n ? 0 : n });
    }
    if (t.dataset.act === "rate") return d && rateSheet(d);
    if (t.dataset.act === "tried") {
      if (!state.me) return joinSheet();
      if (mine.tried) return checkin(id, { tried: false, rating: 0, buzz: null });
      checkin(id, { tried: true });
      return d && rateSheet(d);
    }
    if (t.dataset.act === "want") return checkin(id, { want: !mine.want });
    if (t.dataset.act === "more") return state.me ? moreSheet(d) : joinSheet();
  }
});
document.addEventListener("input", (ev) => {
  if (ev.target.id === "spotQ") { state.spotQ = ev.target.value; refreshSpotList(); return; }
  if (ev.target.id === "q") {
    state.filters.q = ev.target.value;
    const pos = ev.target.selectionStart;
    render();
    const q = $("#q"); q.focus(); q.setSelectionRange(pos, pos);
  }
});
document.addEventListener("toggle", (ev) => { if (ev.target.classList?.contains("tab-card")) ls.set("sips.tabOpen", ev.target.open); }, true);
document.addEventListener("change", (ev) => { if (ev.target.id === "sort") { state.filters.sort = ev.target.value; render(); } });
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !$("#sheet").hidden && !sheetIsSticky()) closeSheet(); });

$("#drawerGrip").onclick = () => { state.drawer = state.drawer === "full" ? (state.sel ? "half" : "peek") : state.drawer === "half" ? "full" : "half"; render(); };
$("#meBtn").onclick = joinSheet;
$("#festBtn").onclick = () => D() && infoSheet();
$("#parkBtn").onclick = () => D() && parksSheet();
$("#settingsBtn").onclick = () => D() && infoSheet();
$("#addBtn").onclick = addSheet;
$("#locBtn").onclick = toggleLocate;
$("#fitBtn").onclick = () => { if (fitVB && view) flyTo(fitVB, 420); };
$("#zoomIn").onclick = () => zoomBy(1.6);
$("#zoomOut").onclick = () => zoomBy(1 / 1.6);
document.querySelectorAll("[data-icon]").forEach((b) => b.insertAdjacentHTML("afterbegin", icon(b.dataset.icon)));
state.filtersOpen = ls.get(LS.fopen, false);

setInterval(() => {
  if (document.visibilityState !== "visible" || !$("#sheet").hidden || ["q", "spotQ"].includes(document.activeElement?.id)) return;
  load({ quiet: true });
}, 30000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { applySky(); load({ quiet: true }); } });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

const cached = ls.get(LS.cache);
if (cached) { state.data = cached; render(); }
load().then(() => { if (!state.me && D()) joinSheet(); });
