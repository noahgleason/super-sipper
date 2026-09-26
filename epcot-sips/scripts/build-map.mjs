// Builds public/maps/<park>.js: each park's real footprints (water, walkways, gardens, buildings)
// from OpenStreetMap, projected to meters and simplified, so every map is 1:1 with the park.
//
//   node scripts/build-map.mjs                 # all parks, downloaded from Overpass
//   node scripts/build-map.mjs mk              # one park
//   node scripts/build-map.mjs mk osm-mk.json  # one park from a saved Overpass response
//
// Map data © OpenStreetMap contributors (ODbL).
import fs from "node:fs";

// rot: degrees the north-up map is turned so each park's entrance sits at the bottom of the
// screen, like Disney's own park maps (EPCOT: World Showcase on top, gates at the bottom).
const PARKS = {
  epcot: {
    bbox: [28.3655, -81.5555, 28.3775, -81.5440], origin: { lat: 28.3695, lng: -81.5495 }, rot: 180,
    park: "EPCOT", hero: { kind: "se", name: "Spaceship Earth" },
    entrance: { names: ["Epcot Ticket Booths"], dy: 18 },
    spots: { gateway: "Disney Skyliner Station: Epcot-International Gateway" },
    waterLabels: { "World Showcase Lagoon": ["World Showcase", "Lagoon"] },
  },
  mk: {
    bbox: [28.4130, -81.5880, 28.4250, -81.5740], origin: { lat: 28.4190, lng: -81.5812 }, rot: 0,
    park: "Magic Kingdom", hero: { kind: "castle", name: "Cinderella Castle" },
    entrance: { names: ["Main Street Station"], dy: 34 },
    waterLabels: { "Seven Seas Lagoon": ["Seven Seas Lagoon"], "Rivers of America": ["Rivers of America"] },
  },
  hs: {
    bbox: [28.3510, -81.5660, 28.3640, -81.5520], origin: { lat: 28.3573, lng: -81.5600 }, rot: 90,
    park: "Disney's Hollywood Studios", hero: { kind: "tower", name: "The Twilight Zone Tower of Terror" },
    entrance: { names: ["Security Check"], dy: -6 },
    waterLabels: {},
  },
  ak: {
    bbox: [28.3480, -81.6020, 28.3740, -81.5780], origin: { lat: 28.3590, lng: -81.5905 }, rot: 0,
    park: "Disney's Animal Kingdom", hero: { kind: "tree", name: "Tree of Life" },
    entrance: { names: ["Tickets"], dy: 24 },
    waterLabels: { "Discovery River": ["Discovery River"] },
  },
  tl: {
    bbox: [28.3615, -81.5340, 28.3705, -81.5240], origin: { lat: 28.3658, lng: -81.5295 }, rot: 90,
    park: "Disney's Typhoon Lagoon", hero: { kind: "boat", name: "Mount Mayday" },
    entrance: { at: { lat: 28.36545, lng: -81.52790 }, dy: 0 },
    waterLabels: {},
  },
  bb: {
    bbox: [28.3475, -81.5795, 28.3555, -81.5690], origin: { lat: 28.3518, lng: -81.5745 }, rot: 45,
    park: "Disney's Blizzard Beach", hero: { kind: "ski", name: "Mount Gushmore" },
    entrance: { at: { lat: 28.35115, lng: -81.57285 }, dy: 0 },
    waterLabels: {},
  },
};

const QUERY = (b) => `[out:json][timeout:170];(way(${b});relation(${b})[natural=water];node(${b})[natural=peak];);out geom;`;
const MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

async function download(bbox) {
  for (let round = 0; round < 3; round++) for (const url of MIRRORS) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json", "user-agent": "epcot-sips-map/1.0" }, body: "data=" + encodeURIComponent(QUERY(bbox)) });
      if (res.ok) return await res.json();
      console.warn(`${url}: ${res.status}`);
    } catch (e) { console.warn(`${url}: ${e.message}`); }
  }
  throw new Error("Every Overpass mirror failed (they're often busy; try again in a few minutes)");
}

function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    let best = -1, bd = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L;
      if (d > bd) { bd = d; best = i; }
    }
    if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const area = (r) => { let s = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s / 2); };
const f1 = (n) => (Math.round(n * 10) / 10).toString();
const r1 = (n) => Math.round(n * 10) / 10;
function pathD(rings, closed) {
  return rings.map((r) => {
    let d = "", px = 0, py = 0;
    r.forEach(([x, y], i) => {
      // absolute first point, then relative moves: much smaller output
      if (!i) d += `M${f1(x)} ${f1(y)}`;
      else d += `l${f1(x - px)} ${f1(y - py)}`;
      px = r1(x); py = r1(y);
    });
    return closed ? d + "z" : d;
  }).join("");
}

// Stitch multipolygon member ways into closed rings.
function stitch(ways) {
  const segs = ways.map((w) => w.slice()), rings = [];
  const same = (a, b) => a.lat === b.lat && a.lon === b.lon;
  while (segs.length) {
    let ring = segs.shift();
    let grew = true;
    while (!same(ring[0], ring[ring.length - 1]) && grew) {
      grew = false;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i], end = ring[ring.length - 1];
        if (same(s[0], end)) ring = ring.concat(s.slice(1));
        else if (same(s[s.length - 1], end)) ring = ring.concat(s.slice(0, -1).reverse());
        else continue;
        segs.splice(i, 1); grew = true; break;
      }
    }
    rings.push(ring);
  }
  return rings;
}

function build(id, osm) {
  const cfg = PARKS[id];
  const { origin: O, rot } = cfg;
  const KX = Math.cos(O.lat * Math.PI / 180) * 111320, KY = 110540;
  const c = Math.cos(rot * Math.PI / 180), s = Math.sin(rot * Math.PI / 180);
  // Same projection as the app: meters from the origin, north-up turned by rot.
  const proj = (p) => { const E = (p.lon - O.lng) * KX, N = (p.lat - O.lat) * KY; return [E * c + N * s, E * s - N * c]; };

  const layers = {};
  const add = (layer, rings, closed = true) => { rings = rings.filter((r) => r && r.length > 1); if (rings.length) (layers[layer] ||= []).push(pathD(rings, closed)); };
  const closedWay = (g) => g.length > 3 && g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon;
  // Closed rings start and end on the same point, so simplify them as two open halves.
  const ringOf = (g, tol) => {
    const p = g.map(proj), h = p.length >> 1;
    const r = [...simplify(p.slice(0, h + 1), tol).slice(0, -1), ...simplify(p.slice(h), tol).slice(0, -1)];
    return r.length > 2 ? r : null;
  };
  const centroid = (r) => { let x = 0, y = 0; r.forEach((p) => { x += p[0]; y += p[1]; }); return [r1(x / r.length), r1(y / r.length)]; };
  const found = { entrance: [], spots: {}, water: [] };
  let parkRing = null, hero = null;

  for (const e of osm.elements) {
    const t = e.tags || {};
    if (e.type === "node") {
      // a named mountain peak can be the park's landmark (Mount Mayday, Mount Gushmore)
      if (t.name === cfg.hero.name && !hero) hero = { kind: cfg.hero.kind, at: proj(e).map(r1), r: 30 };
      continue;
    }
    if (e.type === "relation") {
      const outer = stitch(e.members.filter((m) => m.role === "outer" && m.geometry).map((m) => m.geometry));
      const inner = stitch(e.members.filter((m) => m.role === "inner" && m.geometry).map((m) => m.geometry));
      const rings = [...outer, ...inner].map((g) => ringOf(g, 0.6)).filter(Boolean);
      if (rings.length) add("water", rings);
      if (t.name && cfg.waterLabels?.[t.name] && outer[0]) found.water.push({ name: t.name, r: ringOf(outer[0], 1) });
      continue;
    }
    const g = e.geometry;
    if (!g || g.length < 2) continue;
    const closed = closedWay(g);
    const poly = () => { const r = ringOf(g, 0.35); return r && area(r) > 4 ? r : null; };
    const line = (tol = 0.5) => simplify(g.map(proj), tol);

    if (t.tourism === "theme_park" && t.name === cfg.park) { parkRing = ringOf(g, 0.8); add("park", [parkRing]); continue; }
    if (t.natural === "water" || t.leisure === "swimming_pool" || t.amenity === "fountain" && closed || t.waterway === "dock" && closed) {
      const r = poly(); if (r) { add("water", [r]); if (t.name && cfg.waterLabels?.[t.name]) found.water.push({ name: t.name, r }); }
      continue;
    }
    if (t.attraction === "water_slide" || t.leisure === "water_slide") { if (closed) { const r = poly(); if (r) add("water", [r]); } else add("slide", [line(0.4)], false); continue; }
    if (t.attraction === "lazy_river") { if (closed) { const r = poly(); if (r) add("water", [r]); } else add("canal", [line()], false); continue; }
    if (["canal", "stream", "river", "drain"].includes(t.waterway)) { add(closed ? "water" : "canal", [closed ? ringOf(g, 0.5) : line()], closed); continue; }
    if (t.building && t.building !== "no" || t.man_made === "bridge") {
      const r = poly(); if (!r) continue;
      const k = t.man_made === "bridge" ? "bridge" : t.building === "roof" || t.building === "tent" ? "roof" : t.building === "greenhouse" ? "glass"
        : t.tourism === "attraction" || t.tourism === "gallery" || t.tourism === "aquarium" || t.building === "train_station" || t.building === "transportation" ? "attr" : "bld";
      add(k, [r]);
      if (t.name === cfg.hero.name && !hero) { const c0 = centroid(r); hero = { kind: cfg.hero.kind, at: c0, r: r1(Math.sqrt(area(r) / Math.PI)) }; }
      if (cfg.entrance.names?.includes(t.name)) found.entrance.push(centroid(r));
      for (const [k2, n] of Object.entries(cfg.spots || {})) if (t.name === n) found.spots[k2] = centroid(r);
      continue;
    }
    if (t.man_made === "pier" && closed) { const r = poly(); if (r) add("plaza", [r]); continue; }
    if (t.man_made === "pier") { add("pier", [line()], false); continue; }
    if (t.railway === "monorail") { add("monorail", [line(0.8)], false); continue; }
    if (["narrow_gauge", "light_rail", "tram", "miniature"].includes(t.railway)) { add("rail", [line(0.6)], false); continue; }
    if (t.railway === "platform" && closed) { const r = poly(); if (r) add("plaza", [r]); continue; }
    if (closed && (t.area === "yes" && t.highway || t["area:highway"] && t["area:highway"] !== "traffic_island")) { const r = poly(); if (r) add("plaza", [r]); continue; }
    if (t.highway === "pedestrian" || t.highway === "living_street") { add("walkW", [line()], false); continue; }
    if (t.highway === "footway" || t.highway === "steps" || t.highway === "corridor") { add("walk", [line()], false); continue; }
    if (t.highway === "path") { add("path", [line()], false); continue; }
    if (t.highway === "track" || t.highway === "raceway") { add("track", [line(0.8)], false); continue; }
    if (["service", "unclassified", "busway"].includes(t.highway)) { add("service", [line(0.8)], false); continue; }
    if (["secondary", "tertiary", "tertiary_link", "secondary_link", "motorway", "motorway_link"].includes(t.highway)) { add("road", [line(0.8)], false); continue; }
    if (t.amenity === "parking" && closed) { const r = poly(); if (r) add("parking", [r]); continue; }
    if (!closed) continue;
    if (t.landuse === "forest" || t.natural === "wood" || t.natural === "wetland") { const r = poly(); if (r) add("forest", [r]); continue; }
    if (t.landuse === "flowerbed") { const r = poly(); if (r) add("flowers", [r]); continue; }
    if (t.natural === "scrub" || t.landuse === "meadow" || t.landuse === "farmyard" || t.natural === "grassland") { const r = poly(); if (r) add("meadow", [r]); continue; }
    if (t.leisure === "garden" || t.leisure === "playground" || t.leisure === "pitch" || t.landuse === "grass" || t.leisure === "park") { const r = poly(); if (r) add("garden", [r]); continue; }
    if (t.natural === "bare_rock" || t.landuse === "quarry") { const r = poly(); if (r) add("rock", [r]); continue; }
    if (t.natural === "beach" || t.natural === "sand" || t.natural === "shingle") { const r = poly(); if (r) add("sand", [r]); continue; }
  }
  if (!parkRing) throw new Error(`${id}: no theme_park outline named "${cfg.park}"`);
  if (!hero) throw new Error(`${id}: couldn't find ${cfg.hero.name}`);
  if (cfg.entrance.at) found.entrance.push(proj({ lat: cfg.entrance.at.lat, lon: cfg.entrance.at.lng }).map(r1));
  if (!found.entrance.length) throw new Error(`${id}: couldn't find the entrance`);

  const xs = parkRing.map((p) => p[0]), ys = parkRing.map((p) => p[1]);
  const ent = found.entrance.reduce((a, p) => [a[0] + p[0] / found.entrance.length, a[1] + p[1] / found.entrance.length], [0, 0]);
  const labels = [];
  const seen = new Set();
  for (const w of found.water) {
    if (seen.has(w.name) || !w.r) continue; seen.add(w.name);
    labels.push({ text: cfg.waterLabels[w.name], at: centroid(w.r), cls: "water" });
  }
  return {
    park: id, origin: O, rot,
    center: centroid(parkRing),
    bounds: { x0: r1(Math.min(...xs)), x1: r1(Math.max(...xs)), y0: r1(Math.min(...ys)), y1: r1(Math.max(...ys)) },
    entrance: [r1(ent[0]), r1(ent[1] + cfg.entrance.dy)],
    hero, spots: found.spots, labels,
    layers: Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.join("")])),
  };
}

const [only, file] = process.argv.slice(2);
const ids = only ? [only] : Object.keys(PARKS);
if (only && !PARKS[only]) throw new Error(`Unknown park "${only}". Parks: ${Object.keys(PARKS).join(", ")}`);
fs.mkdirSync(new URL("../public/maps/", import.meta.url), { recursive: true });
for (const id of ids) {
  const osm = file ? JSON.parse(fs.readFileSync(file, "utf8")) : await download(PARKS[id].bbox);
  const out = build(id, osm);
  const js = `// Generated by scripts/build-map.mjs. Do not edit by hand.\n// Map data © OpenStreetMap contributors (ODbL).\nexport const MAP = ${JSON.stringify(out)};\n`;
  fs.writeFileSync(new URL(`../public/maps/${id}.js`, import.meta.url), js);
  console.log(`maps/${id}.js: ${(js.length / 1024).toFixed(0)} KB · hero r=${out.hero.r}m · ${out.labels.length} labels · layers: ${Object.keys(out.layers).join(" ")}`);
}
